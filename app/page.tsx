import Link from "next/link";

/*
 * Accueil — deux grandes entrées vers les deux modes.
 * Routing uniquement ; le CONTENU des modes arrive aux blocs suivants.
 * Cartes "vrai vs faux" : surface sombre, titre à aberration chromatique
 * (signature), halo d'accent au survol. Zones tactiles généreuses (showroom).
 *
 * Motion "signal lock" (app/globals.css) : data-home déclenche le calage du
 * wordmark du header (scopé à cette page via body:has), .enter fait monter
 * les cartes en cascade (--enter-delay), .glitch-hover ajoute la secousse
 * au survol. Sans JS ni impact sur le chargement ; désactivé par
 * prefers-reduced-motion.
 */
export default function Home() {
  return (
    <main
      data-home
      className="flex flex-1 flex-col items-center justify-center px-6 pb-20"
    >
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        {/* Mode 1 — Quiz (accent bleu) */}
        <Link
          href="/quiz"
          style={{ "--enter-delay": "280ms" } as React.CSSProperties}
          className="enter glitch-hover group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface/70 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/50 hover:bg-surface-2 hover:shadow-[0_0_48px_-12px_#0066cc]"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
            Démêler le vrai du faux
          </span>
          <span
            className="chromatic mt-6 text-3xl font-bold leading-tight sm:text-[2rem]"
            data-text="Quiz — Vrai ou Deepfake ?"
          >
            Quiz — Vrai ou Deepfake ?
          </span>
          <span className="mt-5 flex items-center justify-between gap-4">
            <span className="text-sm text-muted">
              Saurez-vous repérer le média truqué&nbsp;?
            </span>
            <span className="shrink-0 font-mono text-sm font-medium text-mist transition-transform duration-300 group-hover:translate-x-1">
              Commencer →
            </span>
          </span>
        </Link>

        {/* Mode 2 — Démonstrateur (accent teal) */}
        <Link
          href="/demo"
          style={{ "--enter-delay": "430ms" } as React.CSSProperties}
          className="enter glitch-hover group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface/70 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand-teal/50 hover:bg-surface-2 hover:shadow-[0_0_48px_-12px_#00a39a]"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
            Fabriquer l&apos;illusion
          </span>
          <span
            className="chromatic mt-6 text-3xl font-bold leading-tight sm:text-[2rem]"
            data-text="Démonstrateur"
          >
            Démonstrateur
          </span>
          <span className="mt-5 flex items-center justify-between gap-4">
            <span className="text-sm text-muted">
              Voyez comment un deepfake se fabrique, en direct.
            </span>
            <span className="shrink-0 font-mono text-sm font-medium text-mist transition-transform duration-300 group-hover:translate-x-1">
              Découvrir →
            </span>
          </span>
        </Link>
      </div>
    </main>
  );
}
