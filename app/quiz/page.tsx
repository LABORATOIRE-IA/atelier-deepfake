"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { quizRounds, type QuizRound } from "@/lib/content";
import MediaFrame from "@/app/components/MediaFrame";

/*
 * /quiz — Mode 1 "Vrai ou Deepfake ?" (Bloc 2).
 * Vote à MAIN LEVÉE : aucun vote/score dans l'app, aucun backend, aucune
 * persistance. Tout l'état vit côté client (useState).
 * Animé par un facilitateur sur grand écran : gros éléments, lisibles à
 * distance, navigation avant/arrière + télécommande clavier (Espace / ← →).
 * Direction visuelle reprise de l'accueil (dark + aberration chromatique).
 */

type Phase = "intro" | "round" | "end";

const TOTAL = quizRounds.length;

// Styles partagés
const PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_-8px_#0066cc] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_-6px_#2b8cff]";
const GHOST =
  "inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-mono text-sm text-muted transition-colors hover:border-brand-blue/50 hover:text-mist";

// Mélange Fisher-Yates (copie, ne mute pas l'original).
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Ordre mélangé, figé pour toute la session. Re-mélangé à chaque "Commencer"
  // / "Recommencer". (Vide tant qu'on n'a pas démarré : pas de shuffle au SSR.)
  const [order, setOrder] = useState<QuizRound[]>([]);

  const start = useCallback(() => {
    setOrder(shuffle(quizRounds));
    setCurrent(0);
    setRevealed(false);
    setPhase("round");
  }, []);

  // Avancer : question -> révélation -> manche suivante -> fin
  const next = useCallback(() => {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    if (current < TOTAL - 1) {
      setCurrent((c) => c + 1);
      setRevealed(false);
    } else {
      setPhase("end");
    }
  }, [revealed, current]);

  // Reculer (facilitateur) : miroir de l'avancée
  const back = useCallback(() => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    if (current > 0) {
      setCurrent((c) => c - 1);
      setRevealed(true);
    } else {
      setPhase("intro");
    }
  }, [revealed, current]);

  // Télécommande facilitateur : Espace / → avancent, ← recule
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "intro") {
        if (e.key === " " || e.key === "ArrowRight") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (phase !== "round") return;
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start, next, back]);

  if (phase === "intro") return <Intro onStart={start} />;
  if (phase === "end") return <End onRestart={start} />;

  const round = order[current];
  const isLast = current === TOTAL - 1;
  if (!round) return null; // garde-fou : "round" sans ordre prêt

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8 px-6 pb-16">
      <Progress current={current} />

      <MediaFrame
        mediaType={round.mediaType}
        mediaUrl={round.mediaUrl}
        label={`Média ${current + 1}`}
        className={`w-full max-w-3xl ${
          revealed
            ? "h-[22vh] min-h-40 max-h-60"
            : "h-[40vh] min-h-56 max-h-[440px]"
        }`}
      />

      {!revealed ? (
        <Question onReveal={next} onBack={back} />
      ) : (
        <Reveal round={round} isLast={isLast} onNext={next} onBack={back} />
      )}
    </main>
  );
}

/* ── Intro ─────────────────────────────────────────────────────────── */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
        Démêler le vrai du faux
      </span>
      <h2
        className="chromatic max-w-2xl text-4xl font-bold leading-tight sm:text-5xl"
        data-text="Quiz — Vrai ou Deepfake ?"
      >
        Quiz — Vrai ou Deepfake ?
      </h2>
      <p className="text-lg text-mist/80">
        {TOTAL} manches · vote à main levée
      </p>
      <p className="max-w-md text-sm text-muted">
        Le facilitateur anime, le public vote à main levée. Rien n&apos;est
        enregistré : l&apos;objectif est d&apos;apprendre à douter.
      </p>
      <button type="button" onClick={onStart} className={`${PRIMARY} mt-2`}>
        Commencer
      </button>
      <Link href="/" className={`${GHOST} mt-2`}>
        ← Accueil
      </Link>
    </main>
  );
}

/* ── Fin ───────────────────────────────────────────────────────────── */
function End({ onRestart }: { onRestart: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
        Fin de session
      </span>
      <h2
        className="chromatic text-4xl font-bold leading-tight sm:text-5xl"
        data-text="C'est terminé"
      >
        C&apos;est terminé
      </h2>
      <p className="max-w-md text-lg text-mist/80">
        Pas de score, et c&apos;est volontaire : l&apos;important, c&apos;est
        d&apos;avoir aiguisé le réflexe de douter.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={onRestart} className={PRIMARY}>
          Recommencer
        </button>
        <Link href="/" className={GHOST}>
          ← Accueil
        </Link>
      </div>
    </main>
  );
}

/* ── Compteur + progression ────────────────────────────────────────── */
function Progress({ current }: { current: number }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <span className="font-mono text-sm uppercase tracking-[0.2em] text-muted">
        Manche {current + 1} / {TOTAL}
      </span>
      <div className="flex gap-2" aria-hidden>
        {quizRounds.map((r, i) => (
          <span
            key={r.id}
            className={`h-1.5 w-10 rounded-full transition-colors ${
              i <= current ? "bg-brand-blue" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── État QUESTION ─────────────────────────────────────────────────── */
function Question({
  onReveal,
  onBack,
}: {
  onReveal: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <h3 className="text-3xl font-bold text-mist sm:text-4xl">
        Vrai ou Deepfake&nbsp;?
      </h3>
      <p className="inline-flex items-center gap-3 font-mono text-base uppercase tracking-[0.2em] text-brand-teal">
        <span aria-hidden className="text-2xl">
          ✋
        </span>
        Votez à main levée
      </p>
      <button type="button" onClick={onReveal} className={`${PRIMARY} mt-2`}>
        Révéler la réponse
      </button>
      <NavBack onBack={onBack} />
    </div>
  );
}

/* ── État RÉVÉLATION ───────────────────────────────────────────────── */
function Reveal({
  round,
  isLast,
  onNext,
  onBack,
}: {
  round: QuizRound;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
          La réponse
        </span>
        {round.isDeepfake ? (
          <span
            className="chromatic live text-6xl font-bold tracking-tight sm:text-7xl"
            data-text="DEEPFAKE"
          >
            DEEPFAKE
          </span>
        ) : (
          <span className="text-6xl font-bold tracking-tight text-teal-glow sm:text-7xl">
            VRAI
          </span>
        )}
      </div>

      <div className="w-full max-w-2xl space-y-6 text-left">
        <p className="text-lg leading-relaxed text-mist/90">
          {round.explanation}
        </p>

        <div className="space-y-3">
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
            Indices
          </span>
          <ul className="space-y-2">
            {round.indices.map((indice) => (
              <li key={indice} className="flex gap-3 text-mist/90">
                <span aria-hidden className="font-mono text-brand-teal">
                  ›
                </span>
                <span>{indice}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button type="button" onClick={onNext} className={`${PRIMARY} mt-2`}>
        {isLast ? "Voir la clôture →" : "Manche suivante →"}
      </button>
      <NavBack onBack={onBack} />
    </div>
  );
}

/* ── Retour facilitateur ───────────────────────────────────────────── */
function NavBack({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className={GHOST}>
      ← Précédent
    </button>
  );
}
