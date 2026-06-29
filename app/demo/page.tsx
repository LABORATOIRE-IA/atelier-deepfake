import Link from "next/link";

/*
 * /demo — placeholder (Bloc 1). Le contenu du démonstrateur arrive au Bloc 3.
 * Même identité visuelle que l'accueil (dark + signature chromatique).
 */
export default function DemoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-20 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
        Fabriquer l&apos;illusion
      </span>
      <h2
        className="chromatic text-5xl font-bold tracking-tight"
        data-text="Démonstrateur"
      >
        Démonstrateur
      </h2>
      <p className="font-mono text-sm text-muted">// bientôt disponible</p>
      <Link
        href="/"
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-teal/40 px-5 py-2 font-mono text-sm text-mist transition-colors hover:border-brand-teal hover:bg-brand-teal/10"
      >
        ← Accueil
      </Link>
    </main>
  );
}
