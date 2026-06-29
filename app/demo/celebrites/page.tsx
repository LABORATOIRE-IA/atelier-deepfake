import Link from "next/link";
import { celebrityCards } from "@/lib/content";
import MediaFrame from "@/app/components/MediaFrame";

/*
 * /demo/celebrites — galerie "Deepfakes célèbres" (Bloc 3).
 * CONSULTATION pédagogique de cas DÉJÀ EXISTANTS et publics : on montre et on
 * décortique, on ne génère rien. Clic sur une carte → fiche détail.
 */
export default function CelebritesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-6 pb-20">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
          Décortiquer des cas réels
        </span>
        <h2
          className="chromatic text-4xl font-bold tracking-tight sm:text-5xl"
          data-text="Deepfakes célèbres"
        >
          Deepfakes célèbres
        </h2>
        <p className="max-w-xl text-sm text-muted">
          Des deepfakes connus et publics, décortiqués : comment ils ont été
          fabriqués et comment les repérer. On montre l&apos;existant, on ne
          génère rien.
        </p>
      </header>

      <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {celebrityCards.map((card) => {
          const first = card.howItsMade.split(". ")[0];
          const teaser = first.endsWith(".") ? first : `${first}.`;
          return (
            <li key={card.id}>
              <Link
                href={`/demo/celebrites/${card.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface/70 transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/50 hover:bg-surface-2 hover:shadow-[0_0_48px_-12px_#0066cc]"
              >
                <MediaFrame
                  mediaType={card.mediaType}
                  mediaUrl={card.mediaUrl}
                  label="Aperçu"
                  alt={card.title}
                  className="aspect-video w-full rounded-none border-0 border-b border-line"
                />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h3 className="text-xl font-bold text-mist">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{teaser}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 font-mono text-sm text-brand-blue transition-transform duration-300 group-hover:translate-x-1">
                    Décortiquer →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 rounded-full border border-brand-blue/40 px-6 py-3 font-mono text-sm text-mist transition-colors hover:border-brand-blue hover:bg-brand-blue/10"
        >
          ← Démonstrateur
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-mono text-sm text-muted transition-colors hover:border-brand-blue/50 hover:text-mist"
        >
          Accueil
        </Link>
      </div>
    </main>
  );
}
