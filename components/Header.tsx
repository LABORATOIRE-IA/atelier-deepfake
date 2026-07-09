import Link from "next/link";

/*
 * Header Onepoint réutilisable : logo O animé (dot bleu en orbite, 8 s
 * linéaire — statique si prefers-reduced-motion), tagline LAB IA /
 * Agentic Livepoint, nav dots (page active = teal, plus grande).
 * Tokens dédiés dans app/globals.css (@theme, section Header Onepoint).
 *
 * ⚠️ Coexiste pour l'instant avec app/components/Header.tsx (wordmark
 * chromatique rendu par le layout sur toutes les pages) — l'articulation
 * des deux est à trancher à l'intégration.
 */

const PAGES = [
  { id: "home", href: "/", label: "Accueil" },
  { id: "quiz", href: "/quiz", label: "Quiz — Vrai ou Deepfake ?" },
  { id: "demo", href: "/demo", label: "Démonstrateur" },
  { id: "celebrites", href: "/demo/celebrites", label: "Deepfakes célèbres" },
] as const;

export type PageId = (typeof PAGES)[number]["id"];

export default function Header({ currentPage }: { currentPage?: PageId }) {
  return (
    <header className="flex flex-col items-center gap-5 px-10 py-6 md:flex-row md:justify-between">
      {/* Logo O + tagline */}
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="logo-o-animated inline-block h-[60px] w-[60px] shrink-0"
        >
          <svg viewBox="0 0 60 60" className="h-full w-full">
            {/* Anneau O — teal, fill transparent */}
            <circle
              cx="30"
              cy="30"
              r="22"
              fill="none"
              stroke="var(--color-logo-o)"
              strokeWidth="5"
            />
            {/* Dot bleu sur l'anneau — orbite via la rotation du svg */}
            <circle cx="30" cy="8" r="8" fill="var(--color-dot-active)" />
          </svg>
        </span>
        <span className="flex flex-col">
          <span className="font-sans text-base font-bold leading-tight text-mist">
            LAB IA
          </span>
          <span className="font-sans text-xs text-[color:var(--color-text-tagline)]">
            Agentic Livepoint
          </span>
        </span>
      </div>

      {/* Nav dots — un par page, cliquables */}
      <nav aria-label="Navigation principale" className="flex items-center gap-3">
        {PAGES.map((page) => {
          const active = page.id === currentPage;
          return (
            <Link
              key={page.id}
              href={page.href}
              title={page.label}
              aria-label={page.label}
              aria-current={active ? "page" : undefined}
              className={`rounded-full transition-all duration-300 ${
                active
                  ? "h-3.5 w-3.5 bg-brand-teal"
                  : "h-3 w-3 bg-[color:var(--color-dot-inactive)] hover:bg-muted"
              }`}
            />
          );
        })}
      </nav>
    </header>
  );
}
