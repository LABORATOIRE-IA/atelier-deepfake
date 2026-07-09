import Link from "next/link";

/*
 * Header commun à toutes les pages (rendu dans app/layout.tsx).
 * Titre = wordmark à aberration chromatique (signature), cliquable = accueil.
 * Identité = charte PROVISOIRE (tokens dans app/globals.css).
 */
export default function Header() {
  return (
    <header className="flex justify-center px-6 pt-9 pb-7">
      <Link
        href="/"
        aria-label="Atelier Deepfake — retour à l'accueil"
        className="group flex max-w-full flex-col items-center gap-3 rounded-2xl px-4 py-2"
      >
        <span
          className="chromatic text-3xl font-bold tracking-tight sm:text-4xl"
          data-text="Atelier Deepfake"
        >
          Atelier Deepfake
        </span>
        <span
          aria-hidden
          className="hdr-line h-px w-28 bg-gradient-to-r from-transparent via-brand-teal to-transparent"
        />
        <span className="hdr-sub text-center font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted sm:text-[0.7rem] sm:tracking-[0.3em]">
          Agentic Livepoint · Lab IA Onepoint
        </span>
      </Link>
    </header>
  );
}
