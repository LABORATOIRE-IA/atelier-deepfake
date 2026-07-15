import Link from "next/link";

/*
 * /demo — aiguillage du Démonstrateur (Bloc 3).
 * Deux sous-modes, même charte que l'accueil :
 *  - Créer mon deepfake (live, avec consentement) → /demo/live  [Bloc 4]
 *  - Deepfakes célèbres (consultation pédagogique) → /demo/celebrites
 */
export default function DemoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
      <div className="mx-auto w-full max-w-xl">
        {/* Créer mon deepfake (accent teal) — cible placeholder Bloc 4 */}
        <Link
          href="/demo/live"
          className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface/70 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand-teal/50 hover:bg-surface-2 hover:shadow-[0_0_48px_-12px_#00a39a]"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
              Avec consentement
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">
              Bientôt
            </span>
          </span>
          <span
            className="chromatic mt-6 text-3xl font-bold leading-tight sm:text-[2rem]"
            data-text="Créer mon deepfake"
          >
            Créer mon deepfake
          </span>
          <span className="mt-5 flex items-center justify-between gap-4">
            <span className="text-sm text-muted">
              Une démo live, uniquement sur consentement explicite.
            </span>
            <span className="shrink-0 font-mono text-sm font-medium text-mist transition-transform duration-300 group-hover:translate-x-1">
              Ouvrir →
            </span>
          </span>
        </Link>

        {/*
          masqué — galerie retirée de la nav (décision meeting), réversible.
          Carte « Deepfakes célèbres » (accent bleu). Pour la réafficher :
          décommenter ce Link ET remettre la grille 2 colonnes du conteneur
          ci-dessus (grid w-full max-w-4xl gap-6 md:grid-cols-2).
          <Link
            href="/demo/celebrites"
            className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface/70 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/50 hover:bg-surface-2 hover:shadow-[0_0_48px_-12px_#0066cc]"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
              Décortiquer des cas réels
            </span>
            <span
              className="chromatic mt-6 text-3xl font-bold leading-tight sm:text-[2rem]"
              data-text="Deepfakes célèbres"
            >
              Deepfakes célèbres
            </span>
            <span className="mt-5 flex items-center justify-between gap-4">
              <span className="text-sm text-muted">
                Des cas connus, expliqués : comment c'est fait, comment le
                repérer.
              </span>
              <span className="shrink-0 font-mono text-sm font-medium text-mist transition-transform duration-300 group-hover:translate-x-1">
                Explorer →
              </span>
            </span>
          </Link>
        */}
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-mono text-sm text-muted transition-colors hover:border-brand-blue/50 hover:text-mist"
      >
        ← Accueil
      </Link>
    </main>
  );
}
