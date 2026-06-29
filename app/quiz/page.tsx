import Link from "next/link";

/*
 * /quiz — placeholder (Bloc 1). Le contenu du quiz arrive au Bloc 2.
 * Même identité visuelle que l'accueil (dark + signature chromatique).
 */
export default function QuizPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-20 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-blue/80">
        Démêler le vrai du faux
      </span>
      <h2
        className="chromatic text-5xl font-bold tracking-tight"
        data-text="Quiz"
      >
        Quiz
      </h2>
      <p className="font-mono text-sm text-muted">// bientôt disponible</p>
      <Link
        href="/"
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/40 px-5 py-2 font-mono text-sm text-mist transition-colors hover:border-brand-blue hover:bg-brand-blue/10"
      >
        ← Accueil
      </Link>
    </main>
  );
}
