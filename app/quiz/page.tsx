"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  quizRounds,
  themePacks,
  type QuizRound,
  type ThemeId,
} from "@/lib/content";
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

// P2 — 5 manches par session, tirées dans l'UNION des thèmes sélectionnés
// (fiches statiques + banque visiteurs), split 3+2 ou 2+3 FAKE/VRAI tiré au
// sort parmi les splits réalisables. Re-tirage à chaque "Commencer".
const TOTAL_PER_SESSION = 5;
// Splits candidats { fake, real } — l'ordre n'a pas d'importance.
const SPLITS = [
  { fake: 3, real: 2 },
  { fake: 2, real: 3 },
];
// Thèmes des rounds banque, injectés CÔTÉ CLIENT au fetch : le serveur
// (/api/bank/quiz) ne connaît pas les thèmes et reste intact (P2, décision).
const BANK_THEMES: ThemeId[] = ["visages", "showroom"];

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

const isBankRound = (r: QuizRound) => r.id.startsWith("bank-");

/**
 * Plan de tirage pour une sélection de thèmes : pools VRAI/FAKE (union
 * dédupliquée), splits réalisables, et complément éventuel.
 *
 * RÈGLE DE COMPLÉMENT (jamais silencieuse — la mention est affichée sur
 * l'intro AVANT le lancement) : si aucun split n'est réalisable avec la
 * seule union (ex. « showroom » seul → 0 VRAI), chaque côté déficitaire
 * (< 3, le max demandé par un split) est complété depuis le pool statique
 * « visages ».
 */
type DrawPlan = {
  real: QuizRound[];
  fakeBank: QuizRound[]; // banque en tête du pool FAKE (priorité P1)
  fakeStatic: QuizRound[];
  splits: { fake: number; real: number }[];
  complementedReal: boolean;
  complementedFake: boolean;
  playable: boolean;
};

function planDraw(
  selected: ReadonlySet<ThemeId>,
  bankPool: readonly QuizRound[],
): DrawPlan {
  const inTheme = (r: QuizRound) =>
    (r.themes ?? []).some((t) => selected.has(t));
  // Union banque + statique, dédupliquée par id (une fiche présente via
  // deux thèmes ne compte qu'une fois).
  const seen = new Set<string>();
  const pool = [...bankPool, ...quizRounds].filter(
    (r) => inTheme(r) && !seen.has(r.id) && Boolean(seen.add(r.id)),
  );

  let real = pool.filter((r) => !r.isDeepfake);
  const fakeBank = pool.filter((r) => r.isDeepfake && isBankRound(r));
  let fakeStatic = pool.filter((r) => r.isDeepfake && !isBankRound(r));

  const feasible = (nReal: number, nFake: number) =>
    SPLITS.filter((s) => nFake >= s.fake && nReal >= s.real);

  let complementedReal = false;
  let complementedFake = false;
  if (feasible(real.length, fakeBank.length + fakeStatic.length).length === 0) {
    const extras = quizRounds.filter(
      (r) => (r.themes ?? []).includes("visages") && !seen.has(r.id),
    );
    if (real.length < 3) {
      const extraReal = extras.filter((r) => !r.isDeepfake);
      if (extraReal.length > 0) {
        real = [...real, ...extraReal];
        complementedReal = true;
      }
    }
    if (fakeBank.length + fakeStatic.length < 3) {
      const extraFake = extras.filter((r) => r.isDeepfake);
      if (extraFake.length > 0) {
        fakeStatic = [...fakeStatic, ...extraFake];
        complementedFake = true;
      }
    }
  }

  const splits = feasible(real.length, fakeBank.length + fakeStatic.length);
  return {
    real,
    fakeBank,
    fakeStatic,
    splits,
    complementedReal,
    complementedFake,
    playable: selected.size > 0 && splits.length > 0,
  };
}

// Tirage d'une session : split au sort parmi les réalisables, banque en tête
// du pool FAKE (priorité P1), ordre final mélangé (vrai/faux imprévisible).
function drawRounds(plan: DrawPlan): QuizRound[] {
  const split = plan.splits[Math.floor(Math.random() * plan.splits.length)];
  const fakePicks = [
    ...shuffle(plan.fakeBank),
    ...shuffle(plan.fakeStatic),
  ].slice(0, split.fake);
  const realPicks = shuffle(plan.real).slice(0, split.real);
  return shuffle([...realPicks, ...fakePicks]);
}

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Ordre mélangé, figé pour toute la session. Re-mélangé à chaque "Commencer"
  // / "Recommencer". (Vide tant qu'on n'a pas démarré : pas de shuffle au SSR.)
  const [order, setOrder] = useState<QuizRound[]>([]);
  // Pool dynamique de la banque (P1) : chargé en arrière-plan au montage.
  // Échec, lenteur ou pool vide = [], et le tirage reste 100 % statique —
  // AUCUN état de chargement, le facilitateur peut démarrer immédiatement.
  const [bankPool, setBankPool] = useState<QuizRound[]>([]);
  // Sélection de thèmes (P2) — défaut : TOUS (Espace direct = comportement
  // historique). `customized` passe à true au premier toggle (clavier OU
  // souris) : Espace ne démarre alors plus depuis l'intro (anti-fausse
  // manip pendant la personnalisation) ; Entrée reste le démarrage sûr.
  const [selected, setSelected] = useState<ReadonlySet<ThemeId>>(
    () => new Set(themePacks.map((p) => p.id)),
  );
  const [customized, setCustomized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bank/quiz", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.rounds))
          // Thèmes injectés côté client (le serveur ne les connaît pas).
          setBankPool(
            data.rounds.map((r: QuizRound) => ({ ...r, themes: BANK_THEMES })),
          );
      } catch {
        /* silencieux : fallback statique */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fiches par thème (statique + banque) — pilote compteurs et chips grisées.
  const themeCounts = useMemo(() => {
    const counts = new Map<ThemeId, number>();
    for (const p of themePacks) {
      counts.set(
        p.id,
        [...quizRounds, ...bankPool].filter((r) =>
          (r.themes ?? []).includes(p.id),
        ).length,
      );
    }
    return counts;
  }, [bankPool]);

  const plan = useMemo(() => planDraw(selected, bankPool), [selected, bankPool]);

  const toggleTheme = useCallback(
    (id: ThemeId) => {
      if ((themeCounts.get(id) ?? 0) === 0) return; // chip grisée : inerte
      setCustomized(true);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [themeCounts],
  );

  const start = useCallback(() => {
    if (!plan.playable) return;
    setOrder(drawRounds(plan));
    setCurrent(0);
    setRevealed(false);
    setPhase("round");
  }, [plan]);

  // Avancer : question -> révélation -> manche suivante -> fin
  // (tout dérive de order.length — le total varie avec le tirage)
  const next = useCallback(() => {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    if (current < order.length - 1) {
      setCurrent((c) => c + 1);
      setRevealed(false);
    } else {
      setPhase("end");
    }
  }, [revealed, current, order.length]);

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
      setCustomized(false); // nouvelle session d'intro : Espace redémarre
      setPhase("intro");
    }
  }, [revealed, current]);

  // Télécommande facilitateur.
  // Intro : [1..9] = toggle du thème n, Entrée = démarrer, Espace/→ =
  // démarrer UNIQUEMENT tant que rien n'a été personnalisé (historique).
  // Round : Espace/→ avancent, ← recule.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "intro") {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= themePacks.length) {
          e.preventDefault();
          toggleTheme(themePacks[n - 1].id);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          start();
          return;
        }
        if ((e.key === " " || e.key === "ArrowRight") && !customized) {
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
  }, [phase, start, next, back, toggleTheme, customized]);

  if (phase === "intro")
    return (
      <Intro
        selected={selected}
        counts={themeCounts}
        plan={plan}
        onToggle={toggleTheme}
        onStart={start}
      />
    );
  if (phase === "end") return <End onRestart={start} />;

  const round = order[current];
  const isLast = current === order.length - 1;
  if (!round) return null; // garde-fou : "round" sans ordre prêt

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8 px-6 pb-16">
      <Progress current={current} total={order.length} />

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

/* ── Intro + sélection de thèmes (P2) ──────────────────────────────── */
function Intro({
  selected,
  counts,
  plan,
  onToggle,
  onStart,
}: {
  selected: ReadonlySet<ThemeId>;
  counts: ReadonlyMap<ThemeId, number>;
  plan: DrawPlan;
  onToggle: (id: ThemeId) => void;
  onStart: () => void;
}) {
  // Mention de complément (jamais silencieux) — affichée AVANT le lancement.
  const complemented = [
    plan.complementedReal && "VRAI",
    plan.complementedFake && "DEEPFAKE",
  ].filter(Boolean);

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
        {TOTAL_PER_SESSION} manches tirées au hasard · vote à main levée
      </p>

      {/* Chips de thèmes — multi-sélection, raccourci clavier affiché */}
      <ul className="flex flex-wrap items-stretch justify-center gap-3">
        {themePacks.map((p, i) => {
          const count = counts.get(p.id) ?? 0;
          const isEmpty = count === 0;
          const isSelected = selected.has(p.id) && !isEmpty;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                disabled={isEmpty}
                aria-pressed={isSelected}
                className={`flex h-full min-w-52 flex-col items-start gap-1 rounded-2xl border px-5 py-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-brand-blue bg-brand-blue/10 shadow-[0_0_30px_-12px_#0066cc]"
                    : "border-line bg-surface/60 hover:border-brand-blue/50"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-base font-semibold text-mist">
                    {isSelected ? "✓ " : ""}
                    {p.label}
                  </span>
                  <kbd className="rounded border border-line px-1.5 font-mono text-xs text-muted">
                    {i + 1}
                  </kbd>
                </span>
                <span className="text-xs text-muted">{p.description}</span>
                <span className="font-mono text-xs text-muted">
                  {isEmpty ? "0 fiche" : `${count} fiche${count > 1 ? "s" : ""}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {plan.playable && complemented.length > 0 && (
        <p className="font-mono text-xs text-muted">
          Manches {complemented.join(" et ")} complétées depuis Visages
        </p>
      )}
      {!plan.playable && (
        <p className="font-mono text-xs text-muted">
          {selected.size === 0
            ? "Sélectionnez au moins un thème."
            : `Union insuffisante : ${plan.real.length} VRAI · ${
                plan.fakeBank.length + plan.fakeStatic.length
              } DEEPFAKE (il faut 3+2 ou 2+3).`}
        </p>
      )}

      <p className="max-w-md text-sm text-muted">
        Le facilitateur anime, le public vote à main levée. Rien n&apos;est
        enregistré : l&apos;objectif est d&apos;apprendre à douter.
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={!plan.playable}
        className={`${PRIMARY} mt-2 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        Commencer
      </button>
      <p className="font-mono text-xs text-muted">
        {themePacks.map((_, i) => `[${i + 1}]`).join("")} pour choisir · Entrée
        pour commencer
      </p>
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

/* ── Compteur + progression (dérivé du tirage réel) ────────────────── */
function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <span className="font-mono text-sm uppercase tracking-[0.2em] text-muted">
        Manche {current + 1} / {total}
      </span>
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
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
