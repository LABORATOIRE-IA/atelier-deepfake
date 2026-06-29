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

// ─── Manches du quiz — PLACEHOLDER (Bloc 2) ───────────────────────────
// Médias = placeholders gris ("/placeholder"), légendés "Média 1/2/3/4".
// Le VRAI contenu (médias + textes) sera posé au Bloc 6.
// isDeepfake est alterné. Explications/indices bidon mais réalistes.

export const quizRounds: QuizRound[] = [
  {
    id: "manche-1",
    mediaType: "image",
    mediaUrl: "/placeholder",
    isDeepfake: false,
    explanation:
      "Photographie authentique. Le grain est homogène sur toute l'image, les ombres portées suivent une source lumineuse unique et les détails fins (mèches, pores) restent nets sans lissage artificiel.",
    indices: [
      "Éclairage cohérent entre le visage et l'arrière-plan",
      "Reflets identiques dans les deux yeux",
      "Texture de peau naturelle, sans zones « plastique »",
    ],
  },
  {
    id: "manche-2",
    mediaType: "image",
    mediaUrl: "/placeholder",
    isDeepfake: true,
    explanation:
      "Visage synthétique. La zone de raccord au niveau du cou et des oreilles présente un léger flou, et l'éclairage du visage ne correspond pas tout à fait à celui de la scène.",
    indices: [
      "Regardez les mains et les oreilles",
      "Cohérence de l'éclairage : visage vs décor",
      "Bords des cheveux légèrement « baveux »",
    ],
  },
  {
    id: "manche-3",
    mediaType: "image",
    mediaUrl: "/placeholder",
    isDeepfake: false,
    explanation:
      "Image authentique. Les micro-asymétries du visage sont préservées et l'arrière-plan ne comporte ni répétitions ni déformations typiques de la génération.",
    indices: [
      "Asymétries naturelles du visage",
      "Arrière-plan sans motifs répétés",
      "Cohérence des reflets et des ombres",
    ],
  },
  {
    id: "manche-4",
    mediaType: "image",
    mediaUrl: "/placeholder",
    isDeepfake: true,
    explanation:
      "Deepfake. La synchronisation entre la bouche et l'expression se décale par moments, et le clignement des yeux paraît trop régulier pour être naturel.",
    indices: [
      "Synchronisation des lèvres",
      "Fréquence de clignement des yeux",
      "Dents et contours parfois « fondus »",
    ],
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
