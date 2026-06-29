/*
 * Page d'accueil — placeholder minimal (Bloc 0).
 * Le routing des deux modes (Quiz / Démonstrateur) arrive au Bloc 1.
 * Identité visuelle = charte PROVISOIRE (voir app/globals.css).
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <span
        aria-hidden
        className="h-1.5 w-24 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-teal))",
        }}
      />
      <h1 className="text-5xl font-bold tracking-tight text-brand-blue sm:text-6xl">
        Atelier Deepfake
      </h1>
      <p className="max-w-md text-base text-black/60">
        Showroom Agentic Livepoint — Lab IA Onepoint
      </p>
    </main>
  );
}
