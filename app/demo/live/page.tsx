import Link from "next/link";

/*
 * /demo/live — placeholder (Bloc 3). Le flux de création live, AVEC
 * consentement explicite, sera construit au Bloc 4. Rien n'est généré ici.
 */
export default function DemoLivePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-20 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-teal/80">
        Avec consentement
      </span>
      <h2
        className="chromatic text-4xl font-bold tracking-tight sm:text-5xl"
        data-text="Créer mon deepfake"
      >
        Créer mon deepfake
      </h2>
      <p className="font-mono text-sm text-muted">// à venir — Bloc 4</p>
      <p className="max-w-md text-sm text-muted">
        Le flux de création live ne sera proposé qu&apos;avec le consentement
        explicite de la personne filmée.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 rounded-full border border-brand-teal/40 px-6 py-3 font-mono text-sm text-mist transition-colors hover:border-brand-teal hover:bg-brand-teal/10"
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
