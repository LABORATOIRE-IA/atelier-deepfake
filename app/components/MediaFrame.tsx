import type { MediaType } from "@/lib/content";

/*
 * Cadre média partagé (quiz + galerie célébrités).
 * Gère image ET vidéo. Tant que mediaUrl commence par "/placeholder",
 * affiche un cadre gris légendé (le vrai contenu arrive au Bloc 6).
 * La TAILLE est pilotée par le parent via `className` (hauteur + largeur).
 */
export default function MediaFrame({
  mediaType,
  mediaUrl,
  label,
  alt,
  className = "",
}: {
  mediaType: MediaType;
  mediaUrl: string;
  /** Texte affiché dans le placeholder gris */
  label: string;
  alt?: string;
  className?: string;
}) {
  const isPlaceholder = mediaUrl.startsWith("/placeholder");

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line ${className}`}
    >
      {isPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-surface-2">
          <span className="absolute left-4 top-4 font-mono text-[0.7rem] uppercase tracking-widest text-muted">
            {mediaType === "video" ? "Vidéo" : "Image"} · placeholder
          </span>
          <span className="px-4 text-center text-2xl font-semibold text-muted sm:text-3xl">
            {label}
          </span>
        </div>
      ) : mediaType === "video" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={mediaUrl}
          controls
          playsInline
          className="h-full w-full bg-black object-contain"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt={alt ?? label}
          className="h-full w-full bg-black object-contain"
        />
      )}
    </div>
  );
}
