"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import MediaFrame from "@/app/components/MediaFrame";
import Lightbox from "@/app/components/Lightbox";

/*
 * /demo/live — "Créer mon deepfake (live)" (migration Ideogram).
 *
 * Machine à états client (useState). La génération est RÉELLE : la photo est
 * envoyée à notre route serveur /api/faceswap, qui appelle fal.ai (la clé
 * FAL_KEY reste côté serveur, jamais dans le navigateur). Les 4 scènes sont
 * générées d'office côté serveur (prompts serveur-only, succès partiels
 * possibles) : plus d'étape de choix de scène — le visiteur choisit sa
 * préférée à l'écran résultat.
 *
 * HYGIÈNE DONNÉES (cohérent avec le consentement) :
 *  - La photo est capturée en mémoire (dataURL), puis envoyée à fal.ai (service
 *    TIERS) via notre serveur UNIQUEMENT pour générer la démo. Rien n'est
 *    stocké de notre côté ; "Terminer et supprimer" efface photo + résultat.
 *  - Le flux caméra est coupé (MediaStreamTrack.stop()) dès qu'on quitte
 *    l'étape caméra, à la fin, et au démontage → pas de voyant qui reste allumé.
 *
 * ⚠️ Déploiement : getUserMedia exige un contexte sécurisé (HTTPS) en prod.
 *    En dev, http://localhost est sécurisé → OK.
 */

type Step = "consent" | "capture" | "review" | "generating" | "result";
type CameraError = "denied" | "notfound" | "unsupported" | "unknown" | null;

/** Une scène générée renvoyée par la route (succès partiels : 1 à 4). */
type SceneResult = { scene: string; label: string; url: string };

const STEPS: { key: Step; label: string }[] = [
  { key: "consent", label: "Consentement" },
  { key: "capture", label: "Caméra" },
  { key: "review", label: "Validation" },
  { key: "generating", label: "Génération" },
  { key: "result", label: "Résultat" },
];

const FRAME = "aspect-video w-full max-w-2xl";

const PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-teal px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_-8px_#00a39a] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_-6px_#2fd4c8] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0";
const GHOST =
  "inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-mono text-sm text-muted transition-colors hover:border-brand-teal/50 hover:text-mist";

export default function DemoLivePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("consent");
  const [consented, setConsented] = useState(false);
  // Opt-in BANQUE (P1) : séparé, optionnel, jamais pré-coché. Conditionne
  // uniquement l'affichage du bloc d'envoi à l'écran résultat.
  const [bankConsent, setBankConsent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [results, setResults] = useState<SceneResult[] | null>(null);
  const [cameraError, setCameraError] = useState<CameraError>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genAttempt, setGenAttempt] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Coupe proprement le flux caméra (éteint le voyant).
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError")
        setCameraError("denied");
      else if (name === "NotFoundError" || name === "DevicesNotFoundError")
        setCameraError("notfound");
      else setCameraError("unknown");
    }
  }, []);

  // Caméra active uniquement pendant l'étape "capture".
  useEffect(() => {
    if (step !== "capture") return;
    startCamera();
    return () => stopCamera();
  }, [step, startCamera, stopCamera]);

  // Filet de sécurité : coupe la caméra au démontage du composant.
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Génération RÉELLE : envoi de la photo à /api/faceswap (qui appelle fal.ai).
  useEffect(() => {
    if (step !== "generating" || !photo) return;
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    // Au-dessus du maxDuration serveur (130 s) : on laisse la route renvoyer
    // son JSON d'erreur propre avant d'abandonner côté client.
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 135_000);

    (async () => {
      setGenError(null);
      try {
        const res = await fetch("/api/faceswap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.message || "Échec de la génération. Réessayez.");
        // Succès partiels possibles : la route ne renvoie que les scènes réussies.
        if (!Array.isArray(data?.results) || data.results.length === 0)
          throw new Error("Aucun résultat reçu.");
        if (!cancelled) {
          setResults(data.results);
          setStep("result");
        }
      } catch (e) {
        if (cancelled) return;
        if (timedOut)
          setGenError("La génération a pris trop de temps. Réessayez.");
        else
          setGenError(
            e instanceof Error ? e.message : "Erreur inconnue. Réessayez.",
          );
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [step, photo, genAttempt]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Miroir (cohérent avec l'aperçu affiché en miroir).
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    setPhoto(canvas.toDataURL("image/jpeg", 0.92));
    setStep("review"); // le cleanup de l'effet coupe la caméra
  }, []);

  // Réinitialise TOUT (efface photo + résultats de la mémoire, coupe la caméra).
  const reset = useCallback(() => {
    stopCamera();
    setPhoto(null);
    setResults(null);
    setGenError(null);
    setGenAttempt(0);
    setConsented(false);
    setBankConsent(false);
    setStep("consent");
  }, [stopCamera]);

  const finish = useCallback(() => {
    stopCamera();
    setPhoto(null);
    setResults(null);
    setConsented(false);
    setBankConsent(false);
    router.push("/demo");
  }, [stopCamera, router]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 pb-20">
      <Stepper step={step} />

      {step === "consent" && (
        <Consent
          consented={consented}
          onToggle={setConsented}
          bankConsent={bankConsent}
          onToggleBank={setBankConsent}
          onContinue={() => setStep("capture")}
        />
      )}

      {step === "capture" && (
        <Capture
          videoRef={videoRef}
          cameraError={cameraError}
          onRetry={startCamera}
          onTake={takePhoto}
        />
      )}

      {step === "review" && photo && (
        <Review
          photo={photo}
          onGenerate={() => setStep("generating")}
          onRetake={() => {
            setPhoto(null);
            setStep("capture");
          }}
        />
      )}

      {step === "generating" && (
        <Generating
          error={genError}
          onRetry={() => {
            setGenError(null);
            setGenAttempt((n) => n + 1);
          }}
          onBack={() => {
            setGenError(null);
            setStep("review");
          }}
        />
      )}

      {step === "result" && results && results.length > 0 && photo && (
        <Result
          photo={photo}
          results={results}
          bankConsent={bankConsent}
          onRestart={reset}
          onFinish={finish}
        />
      )}
    </main>
  );
}

/* ── Indicateur d'étape ────────────────────────────────────────────── */
function Stepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <span className="font-mono text-sm uppercase tracking-[0.2em] text-muted">
        Étape {idx + 1} / {STEPS.length} — {STEPS[idx].label}
      </span>
      <div className="flex gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={`h-1.5 w-9 rounded-full transition-colors ${
              i <= idx ? "bg-brand-teal" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Étape 1 — Consentement (bloquant) ─────────────────────────────── */
function Consent({
  consented,
  onToggle,
  bankConsent,
  onToggleBank,
  onContinue,
}: {
  consented: boolean;
  onToggle: (v: boolean) => void;
  bankConsent: boolean;
  onToggleBank: (v: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
        Avec consentement
      </span>
      <h2
        className="chromatic text-4xl font-bold tracking-tight sm:text-5xl"
        data-text="Créer mon deepfake"
      >
        Créer mon deepfake
      </h2>
      <p className="text-lg text-mist/90">
        Nous allons utiliser votre image pour générer, en direct, plusieurs
        scènes de démonstration de deepfake autour de votre visage, à des fins
        pédagogiques.
      </p>

      <ul className="w-full space-y-3 rounded-2xl border border-line bg-surface/60 p-6 text-left">
        {[
          "Votre image est utilisée uniquement pour cette démonstration.",
          "Pour la générer, elle est envoyée à un service tiers, fal.ai.",
          "Elle n'est ni diffusée ni publiée, et n'est pas conservée par nous.",
          "Photo et résultat sont supprimés à la fin de la session — sauf l'image que vous choisissez d'ajouter à la banque (optionnel ci-dessous).",
        ].map((line) => (
          <li key={line} className="flex gap-3 text-sm text-mist/90">
            <span aria-hidden className="font-mono text-brand-teal">
              ›
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <label className="flex cursor-pointer items-center gap-3 text-base text-mist">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[#00a39a]"
        />
        J&apos;ai compris et je consens
      </label>

      {/* Opt-in BANQUE — OPTIONNEL et visuellement distinct du consentement
          obligatoire : ne conditionne PAS le bouton Continuer. */}
      <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-4 text-left text-sm text-mist/90">
        <input
          type="checkbox"
          checked={bankConsent}
          onChange={(e) => onToggleBank(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#0066cc]"
        />
        <span>
          <span className="font-mono text-xs uppercase tracking-widest text-brand-blue/80">
            Optionnel
          </span>
          <br />
          J&apos;accepte que l&apos;image que je choisirai rejoigne la banque
          du quiz de ce showroom, après validation par le facilitateur.
          Supprimable sur simple demande.
        </span>
      </label>

      <button
        type="button"
        onClick={onContinue}
        disabled={!consented}
        className={PRIMARY}
      >
        Continuer
      </button>
      <Link href="/demo" className={GHOST}>
        Annuler
      </Link>
    </div>
  );
}

/* ── Étape 2 — Capture webcam ──────────────────────────────────────── */
function Capture({
  videoRef,
  cameraError,
  onRetry,
  onTake,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraError: CameraError;
  onRetry: () => void;
  onTake: () => void;
}) {
  const messages: Record<NonNullable<CameraError>, string> = {
    denied:
      "Accès à la caméra refusé. Autorisez la caméra dans votre navigateur, puis réessayez.",
    notfound: "Aucune caméra détectée. Branchez une webcam puis réessayez.",
    unsupported:
      "Votre navigateur ne permet pas l'accès à la caméra (getUserMedia indisponible).",
    unknown: "Impossible d'accéder à la caméra. Réessayez.",
  };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {cameraError ? (
        <div
          className={`flex ${FRAME} flex-col items-center justify-center gap-5 rounded-2xl border border-brand-blue/30 bg-surface/60 p-8 text-center`}
        >
          <span aria-hidden className="text-4xl">
            📷
          </span>
          <p className="max-w-sm text-mist/90">{messages[cameraError]}</p>
          {cameraError !== "unsupported" && (
            <button type="button" onClick={onRetry} className={PRIMARY}>
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <div
          className={`relative ${FRAME} overflow-hidden rounded-2xl border border-line bg-black`}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full -scale-x-100 object-cover"
          />
          {/* Guide de cadrage : ovale clair, extérieur assombri par le
              box-shadow géant (rogné par l'overflow-hidden du cadre).
              Statique volontairement → rien à gérer pour reduced-motion.
              La ressemblance Ideogram dépend de la qualité de la référence
              frontale : le guide n'est pas décoratif. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          />
          <span className="absolute left-4 top-4 font-mono text-[0.7rem] uppercase tracking-widest text-mist/70">
            ● Caméra en direct
          </span>
          <span className="absolute left-4 top-9 max-w-[40%] font-mono text-[0.7rem] leading-snug text-mist/90">
            Regardez l&apos;objectif, visage dans l&apos;ovale
          </span>
        </div>
      )}

      {!cameraError && (
        <button type="button" onClick={onTake} className={PRIMARY}>
          Prendre la photo
        </button>
      )}
      <Link href="/demo" className={GHOST}>
        Annuler
      </Link>
    </div>
  );
}

/* ── Étape 3 — Validation ──────────────────────────────────────────── */
function Review({
  photo,
  onGenerate,
  onRetake,
}: {
  photo: string;
  onGenerate: () => void;
  onRetake: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <MediaFrame
        mediaType="image"
        mediaUrl={photo}
        label="Photo"
        alt="Votre photo capturée"
        className={FRAME}
      />
      <p className="max-w-md text-center text-sm text-muted">
        En générant, cette photo sera envoyée à fal.ai : plusieurs scènes
        seront générées autour de votre visage, puis tout est supprimé à la
        fin.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={onGenerate} className={PRIMARY}>
          Générer le deepfake
        </button>
        <button type="button" onClick={onRetake} className={GHOST}>
          Reprendre
        </button>
      </div>
    </div>
  );
}

/* ── Étape 4 — Génération (réelle) ─────────────────────────────────── */
function Generating({
  error,
  onRetry,
  onBack,
}: {
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  if (error) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <div
          className={`flex ${FRAME} flex-col items-center justify-center gap-5 rounded-2xl border border-brand-blue/30 bg-surface/60 p-8 text-center`}
        >
          <span aria-hidden className="text-4xl">
            ⚠️
          </span>
          <p className="max-w-sm text-mist/90">{error}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={onRetry} className={PRIMARY}>
            Réessayer
          </button>
          <button type="button" onClick={onBack} className={GHOST}>
            Reprendre la photo
          </button>
        </div>
      </div>
    );
  }

  return <GeneratingLoader />;
}

// Messages COSMÉTIQUES (on ne connaît pas le vrai statut fal) : juste pour
// faire patienter pendant les ~15-30 s d'attente. On avance puis on reste
// sur le dernier (le spinner continue de tourner → jamais "figé").
const GEN_MESSAGES = [
  "Analyse du visage…",
  "Cartographie des traits…",
  "Génération des scènes…",
  "Composition des décors…",
  "Finalisation…",
];

function GeneratingLoader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, GEN_MESSAGES.length - 1)),
      4500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`flex ${FRAME} flex-col items-center justify-center gap-8 rounded-2xl border border-line bg-surface/40`}
    >
      <div className="ca-spinner" aria-hidden>
        <span className="ring teal" />
        <span className="ring blue" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className="chromatic live text-2xl font-bold tracking-tight sm:text-3xl"
          data-text="GÉNÉRATION"
        >
          GÉNÉRATION
        </span>
        <p
          className="font-mono text-base text-muted sm:text-lg"
          aria-live="polite"
        >
          // {GEN_MESSAGES[i]}
        </p>
      </div>
    </div>
  );
}

/* ── Étape 5 — Résultat : grille des scènes générées (1 à 4) ────────── */
type BankStatus = "idle" | "sending" | "done" | "error";

function Result({
  photo,
  results,
  bankConsent,
  onRestart,
  onFinish,
}: {
  photo: string;
  results: SceneResult[];
  bankConsent: boolean;
  onRestart: () => void;
  onFinish: () => void;
}) {
  // Image agrandie en lightbox (null = fermée).
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(
    null,
  );
  // Scène "préférée". Clic sur l'image = lightbox ; toggle dédié = sélection.
  const [favorite, setFavorite] = useState<string | null>(null);
  // Envoi banque (si opt-in) : UN SEUL envoi par session — après "done", le
  // bloc reste figé même si le visiteur change de préférée.
  const [bankStatus, setBankStatus] = useState<BankStatus>("idle");
  const [bankError, setBankError] = useState<string | null>(null);

  const sendToBank = useCallback(async () => {
    const fav = results.find((r) => r.scene === favorite);
    if (!fav || bankStatus === "sending" || bankStatus === "done") return;
    setBankStatus("sending");
    setBankError(null);
    try {
      const res = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fav.url, scene: fav.scene }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 502 = souvent une URL fal expirée (rétention courte) : le seul
        // remède est de régénérer, pas de réessayer le même envoi.
        throw new Error(
          res.status === 502
            ? "L'image a peut-être expiré chez fal — refaites une génération, puis renvoyez."
            : data?.message || "Échec de l'envoi. Réessayez.",
        );
      }
      setBankStatus("done");
    } catch (e) {
      setBankStatus("error");
      setBankError(
        e instanceof Error ? e.message : "Échec de l'envoi. Réessayez.",
      );
    }
  }, [results, favorite, bankStatus]);

  const sending = bankStatus === "sending";

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {/* Photo d'origine en petit rappel : on voit d'un coup d'œil que les
          scènes ont été générées autour du même visage. */}
      <figure className="flex w-full max-w-[220px] flex-col gap-2">
        <figcaption className="text-center font-mono text-xs uppercase tracking-[0.28em] text-muted">
          Votre photo
        </figcaption>
        <button
          type="button"
          onClick={() => setZoom({ src: photo, caption: "Votre photo" })}
          className="block aspect-video w-full cursor-zoom-in"
          aria-label="Agrandir votre photo d'origine"
        >
          <MediaFrame
            mediaType="image"
            mediaUrl={photo}
            label="Vous"
            alt="Votre photo capturée"
            className="h-full w-full"
          />
        </button>
      </figure>

      {/* Grille adaptée au nombre de succès (1 à 4) : pas de case vide.
          Clic sur l'image → lightbox ; toggle « préférée » par carte. */}
      <ul
        className={`grid w-full gap-4 ${results.length > 1 ? "sm:grid-cols-2" : "sm:max-w-xl"}`}
      >
        {results.map((r) => {
          const isFavorite = favorite === r.scene;
          return (
            <li key={r.scene}>
              <figure
                className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors ${
                  isFavorite
                    ? "border-brand-teal shadow-[0_0_36px_-10px_#00a39a]"
                    : "border-line"
                }`}
              >
                <figcaption className="text-center font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
                  {r.label}
                </figcaption>
                <button
                  type="button"
                  onClick={() =>
                    setZoom({
                      src: r.url,
                      caption: `${r.label} — deepfake · démonstration`,
                    })
                  }
                  className="relative block aspect-video w-full cursor-zoom-in"
                  aria-label={`Agrandir « ${r.label} »`}
                >
                  <MediaFrame
                    mediaType="image"
                    mediaUrl={r.url}
                    label="Résultat"
                    alt={`Scène « ${r.label} » générée autour de votre visage`}
                    className="h-full w-full"
                  />
                  <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-brand-blue/60 bg-ink/70 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-mist">
                    Démonstration · deepfake
                  </span>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-3 text-center">
                    <span
                      className="chromatic text-sm font-bold tracking-tight sm:text-base"
                      data-text="DEEPFAKE — démonstration"
                    >
                      DEEPFAKE — démonstration
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFavorite(isFavorite ? null : r.scene)}
                  aria-pressed={isFavorite}
                  className={`self-center rounded-full border px-4 py-1.5 font-mono text-xs transition-colors ${
                    isFavorite
                      ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                      : "border-line text-muted hover:border-brand-teal/50 hover:text-mist"
                  }`}
                >
                  {isFavorite ? "★ Ma préférée" : "☆ Ma préférée"}
                </button>
              </figure>
            </li>
          );
        })}
      </ul>

      {/* Envoi banque : visible seulement si opt-in au consentement ET une
          préférée choisie (ou un envoi déjà engagé — le bloc reste après
          "done" même si la sélection change : un seul envoi par session). */}
      {bankConsent && (favorite || bankStatus !== "idle") && (
        <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-4 text-center">
          {bankStatus === "done" ? (
            <p className="text-sm text-mist/90">
              ✓ Envoyée à la banque du quiz — elle sera visible après
              validation par le facilitateur. Merci !
            </p>
          ) : (
            <>
              {bankStatus === "error" && bankError && (
                <p className="text-sm text-mist/90">⚠️ {bankError}</p>
              )}
              <button
                type="button"
                onClick={sendToBank}
                disabled={sending || !favorite}
                className={PRIMARY}
              >
                {sending
                  ? "Envoi en cours…"
                  : bankStatus === "error"
                    ? "Réessayer"
                    : "Ajouter ma préférée à la banque du quiz"}
              </button>
            </>
          )}
        </div>
      )}

      <p className="max-w-lg text-center text-sm text-muted">
        Démonstration pédagogique de deepfake, générée via fal.ai : ces scènes
        ont été générées autour de votre visage, à partir d&apos;une seule
        photo (cliquez pour agrandir). Vos images sont supprimées quand vous
        terminez.
      </p>

      {/* Pendant un envoi banque : navigation gelée (aucun envoi fantôme si
          le visiteur quitte le kiosque en plein POST). */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRestart}
          disabled={sending}
          className={PRIMARY}
        >
          {sending ? "Envoi en cours…" : "Recommencer"}
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={sending}
          className={`${GHOST} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {sending ? "Envoi en cours…" : "Terminer et supprimer"}
        </button>
      </div>

      {zoom && (
        <Lightbox
          src={zoom.src}
          alt={zoom.caption}
          caption={zoom.caption}
          onClose={() => setZoom(null)}
        />
      )}
    </div>
  );
}
