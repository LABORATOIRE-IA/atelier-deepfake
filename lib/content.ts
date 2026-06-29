/*
 * Schéma de données — PLACEHOLDER (Bloc 1).
 * Structures qui alimenteront les modes ; on les remplira aux Blocs 2/3.
 * Ici : 1 entrée d'exemple BIDON par type, juste pour fixer la forme.
 *
 * Rappel cadre éthique : pour les célébrités on montre de l'EXISTANT,
 * on ne génère pas (voir CLAUDE.md).
 */

export type MediaType = "image" | "video";

/** Mode 1 — une manche du quiz "Vrai ou Deepfake ?" */
export interface QuizRound {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  /** true = média truqué (deepfake), false = média authentique */
  isDeepfake: boolean;
  /** Explication révélée après la réponse */
  explanation: string;
  /** Indices/points d'attention pour repérer le trucage */
  indices: string[];
}

/** Mode 2b — fiche célébrité (deepfake existant présenté, non généré) */
export interface CelebrityCard {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  title: string;
  /** Comment ce deepfake a été fabriqué */
  howItsMade: string;
  /** Comment le repérer */
  howToSpot: string;
}

// ─── Données d'exemple (BIDON — à remplacer) ──────────────────────────

export const quizRounds: QuizRound[] = [
  {
    id: "exemple-quiz-1",
    mediaType: "image",
    mediaUrl: "/placeholder.jpg",
    isDeepfake: true,
    explanation: "Exemple bidon — explication à rédiger au Bloc 2.",
    indices: ["indice bidon 1", "indice bidon 2"],
  },
];

export const celebrityCards: CelebrityCard[] = [
  {
    id: "exemple-celebrite-1",
    mediaType: "video",
    mediaUrl: "/placeholder.mp4",
    title: "Exemple bidon",
    howItsMade: "À rédiger au Bloc 3.",
    howToSpot: "À rédiger au Bloc 3.",
  },
];
