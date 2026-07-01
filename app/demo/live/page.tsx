"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import MediaFrame from "@/app/components/MediaFrame";
import Lightbox from "@/app/components/Lightbox";
import { scenes } from "@/lib/content";

/*
 * /demo/live — "Créer mon deepfake (live)" (Bloc 4 + câblage fal.ai Bloc 5).
 *
 * Machine à états client (useState). La génération est RÉELLE : la photo est
 * envoyée à notre route serveur /api/faceswap, qui appelle fal.ai (la clé
 * FAL_KEY reste côté serveur, jamais dans le navigateur).
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

type Step =
  | "consent"
  | "scene"
  | "capture"
  | "review"
  | "generating"
  | "result";
type CameraError = "denied" | "notfound" | "unsupported" | "unknown" | null;

const STEPS: { key: Step; label: string }[] = [
  { key: "consent", label: "Consentement" },
  { key: "scene", label: "Scène" },
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
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
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
          body: JSON.stringify({ photo, scene: sceneId }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.message || "Échec de la génération. Réessayez.");
        if (!data?.url) throw new Error("Aucun résultat reçu.");
        if (!cancelled) {
          setResultUrl(data.url);
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
  }, [step, photo, sceneId, genAttempt]);

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

  // Réinitialise TOUT (efface photo + résultat de la mémoire, coupe la caméra).
  const reset = useCallback(() => {
    stopCamera();
    setPhoto(null);
    setResultUrl(null);
    setSceneId(null);
    setGenError(null);
    setGenAttempt(0);
    setConsented(false);
    setStep("consent");
  }, [stopCamera]);

  const finish = useCallback(() => {
    stopCamera();
    setPhoto(null);
    setResultUrl(null);
    setSceneId(null);
    setConsented(false);
    router.push("/demo");
  }, [stopCamera, router]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 pb-20">
      <Stepper step={step} />

      {step === "consent" && (
        <Consent
          consented={consented}
          onToggle={setConsented}
          onContinue={() => setStep("scene")}
        />
      )}

      {step === "scene" && (
        <SceneSelect
          selectedId={sceneId}
          onSelect={setSceneId}
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

      {step === "result" && resultUrl && photo && (
        <Result
          photo={photo}
          resultUrl={resultUrl}
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
  onContinue,
}: {
  consented: boolean;
  onToggle: (v: boolean) => void;
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
        Nous allons utiliser votre image pour générer une démonstration de
        deepfake, en direct, à des fins pédagogiques.
      </p>

      <ul className="w-full space-y-3 rounded-2xl border border-line bg-surface/60 p-6 text-left">
        {[
          "Votre image est utilisée uniquement pour cette démonstration.",
          "Pour la générer, elle est envoyée à un service tiers, fal.ai.",
          "Elle n'est ni diffusée ni publiée, et n'est pas conservée par nous.",
          "Photo et résultat sont supprimés à la fin de la session.",
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

/* ── Étape 2 — Choix de la scène (vignettes prédéfinies) ───────────── */
function SceneSelect({
  selectedId,
  onSelect,
  onContinue,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  // Image déclarée mais absente → marquée "broken" (via onError) : on ne casse
  // pas l'UI et on empêche sa sélection.
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const markBroken = (id: string) =>
    setBroken((prev) => new Set(prev).add(id));

  return (
    <div className="flex w-full flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
          Choisir une scène
        </span>
        <h2
          className="chromatic text-3xl font-bold tracking-tight sm:text-4xl"
          data-text="Choisir une scène"
        >
          Choisir une scène
        </h2>
        <p className="max-w-md text-sm text-muted">
          Sélectionnez le décor dans lequel votre visage sera transposé.
        </p>
      </div>

      <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
        {scenes.map((s) => {
          const isBroken = broken.has(s.id);
          const isSelected = selectedId === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={isBroken}
                onClick={() => onSelect(s.id)}
                aria-pressed={isSelected}
                className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-surface/70 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-brand-teal shadow-[0_0_36px_-10px_#00a39a]"
                    : "border-line hover:border-brand-teal/50"
                }`}
              >
                <div className="relative aspect-video w-full bg-gradient-to-br from-surface to-surface-2">
                  {isBroken ? (
                    <span className="absolute inset-0 flex items-center justify-center px-3 text-center font-mono text-[0.7rem] uppercase tracking-widest text-muted">
                      image manquante
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/targets/${s.file}`}
                      alt={s.label}
                      onError={() => markBroken(s.id)}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {isSelected && (
                    <span className="absolute right-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 font-mono text-[0.65rem] font-medium text-white">
                      ✓ choisie
                    </span>
                  )}
                </div>
                <span className="p-3 text-sm font-medium text-mist">
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedId || broken.has(selectedId)}
          className={PRIMARY}
        >
          Continuer
        </button>
        <Link href="/demo" className={GHOST}>
          Annuler
        </Link>
      </div>
    </div>
  );
}

/* ── Étape 3 — Capture webcam ──────────────────────────────────────── */
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
          <span className="absolute left-4 top-4 font-mono text-[0.7rem] uppercase tracking-widest text-mist/70">
            ● Caméra en direct
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
        En générant, cette photo sera envoyée à fal.ai pour produire la
        démonstration, puis supprimée à la fin.
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
// faire patienter pendant les ~20-45 s d'attente. On avance puis on reste
// sur le dernier (le spinner continue de tourner → jamais "figé").
const GEN_MESSAGES = [
  "Analyse du visage…",
  "Cartographie des traits…",
  "Application du modèle…",
  "Fusion des images…",
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

/* ── Étape 5 — Résultat AVANT / APRÈS (deepfake réel, présenté en démo) ─ */
function Result({
  photo,
  resultUrl,
  onRestart,
  onFinish,
}: {
  photo: string;
  resultUrl: string;
  onRestart: () => void;
  onFinish: () => void;
}) {
  // Image agrandie en lightbox (null = fermée).
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(
    null,
  );

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {/* Contrôle visuel avant/après : on voit d'un coup d'œil que le visage a
          bien été transposé dans la scène (pas de reconnaissance auto).
          Clic sur une image → lightbox plein écran. */}
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <figcaption className="text-center font-mono text-xs uppercase tracking-[0.28em] text-muted">
            Avant — vous
          </figcaption>
          <button
            type="button"
            onClick={() => setZoom({ src: photo, caption: "Avant — vous" })}
            className="block aspect-video w-full cursor-zoom-in"
            aria-label="Agrandir la photo « avant »"
          >
            <MediaFrame
              mediaType="image"
              mediaUrl={photo}
              label="Avant"
              alt="Votre photo capturée"
              className="h-full w-full"
            />
          </button>
        </figure>

        <figure className="flex flex-col gap-2">
          <figcaption className="text-center font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
            Après — deepfake
          </figcaption>
          <button
            type="button"
            onClick={() =>
              setZoom({
                src: resultUrl,
                caption: "Après — deepfake · démonstration",
              })
            }
            className="relative block aspect-video w-full cursor-zoom-in"
            aria-label="Agrandir le résultat « après »"
          >
            <MediaFrame
              mediaType="image"
              mediaUrl={resultUrl}
              label="Résultat"
              alt="Démonstration de deepfake générée"
              className="h-full w-full"
            />
            <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-brand-blue/60 bg-ink/70 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-mist">
              Démonstration · deepfake
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-3 text-center">
              <span
                className="chromatic text-base font-bold tracking-tight sm:text-lg"
                data-text="DEEPFAKE — démonstration"
              >
                DEEPFAKE — démonstration
              </span>
            </div>
          </button>
        </figure>
      </div>

      <p className="max-w-lg text-center text-sm text-muted">
        Démonstration pédagogique de deepfake, générée via fal.ai. Comparez
        l&apos;avant / après (cliquez pour agrandir) : votre visage a été
        transposé dans la scène. Vos images sont supprimées quand vous terminez.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={onRestart} className={PRIMARY}>
          Recommencer
        </button>
        <button type="button" onClick={onFinish} className={GHOST}>
          Terminer et supprimer
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
