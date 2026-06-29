import Link from "next/link";
import { notFound } from "next/navigation";
import { celebrityCards } from "@/lib/content";
import MediaFrame from "@/app/components/MediaFrame";

/*
 * /demo/celebrites/[id] — fiche détail d'un deepfake célèbre (Bloc 3).
 * Consultation pédagogique : média en grand + "Comment c'est fait" +
 * "Comment le repérer". Aucun vote, aucune génération.
 */

// Prérendu des 3 fiches placeholder.
export function generateStaticParams() {
  return celebrityCards.map((card) => ({ id: card.id }));
}

export default async function CelebriteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = celebrityCards.find((c) => c.id === id);
  if (!card) notFound();

  // howToSpot = indices forensiques séparés par des sauts de ligne.
  const cues = card.howToSpot
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 pb-20">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
          Cas existant · décortiqué
        </span>
        <h2 className="text-4xl font-bold tracking-tight text-mist sm:text-5xl">
          {card.title}
        </h2>
      </header>

      <MediaFrame
        mediaType={card.mediaType}
        mediaUrl={card.mediaUrl}
        label="Aperçu"
        alt={card.title}
        className="h-[40vh] min-h-56 w-full max-w-3xl max-h-[440px]"
      />

      <section className="w-full space-y-3 text-left">
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
          Comment c&apos;est fait
        </span>
        <p className="text-lg leading-relaxed text-mist/90">{card.howItsMade}</p>
      </section>

      <section className="w-full space-y-3 text-left">
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
          Comment le repérer
        </span>
        <ul className="space-y-2">
          {cues.map((cue) => (
            <li key={cue} className="flex gap-3 text-mist/90">
              <span aria-hidden className="font-mono text-brand-teal">
                ›
              </span>
              <span>{cue}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/demo/celebrites"
          className="inline-flex items-center gap-2 rounded-full border border-brand-blue/40 px-6 py-3 font-mono text-sm text-mist transition-colors hover:border-brand-blue hover:bg-brand-blue/10"
        >
          ← Galerie
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
