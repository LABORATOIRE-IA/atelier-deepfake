"use client";

import { useEffect } from "react";

/*
 * Lightbox — agrandissement plein écran d'une image (résultat avant/après).
 * Fermeture : bouton, clic sur le fond, ou touche Échap. Verrouille le scroll.
 * Charte dark + accent teal.
 */
export default function Lightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // évite le scroll derrière
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 p-6 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-sm text-mist transition-colors hover:border-brand-teal/60"
      >
        ✕ Fermer
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[82vh] max-w-[92vw] rounded-2xl border border-line object-contain shadow-[0_0_60px_-12px_#00a39a]"
      />

      {caption && (
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
          {caption}
        </span>
      )}
    </div>
  );
}
