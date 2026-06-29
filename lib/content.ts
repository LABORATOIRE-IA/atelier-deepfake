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

// ─── Fiches "Deepfakes célèbres" — PLACEHOLDER (Bloc 3) ───────────────
// Cas DÉJÀ EXISTANTS et publics : on MONTRE et on DÉCORTIQUE, on ne génère
// rien (cf. CLAUDE.md). Médias = placeholders gris ("/placeholder").
// `howToSpot` = indices forensiques séparés par des sauts de ligne, découpés
// en liste côté UI (le type reste une string). Vrais médias/textes au Bloc 6.

export const celebrityCards: CelebrityCard[] = [
  {
    id: "pape-doudoune",
    mediaType: "image",
    mediaUrl: "/placeholder",
    title: "Le pape en doudoune",
    howItsMade:
      "Image entièrement générée par un modèle text-to-image à partir d'une simple description. Aucune photo réelle n'a été utilisée : le visage et la doudoune sont synthétisés, puis l'image a circulé sans contexte sur les réseaux où elle a été prise pour vraie.",
    howToSpot:
      "Mains et doigts déformés, l'anneau fusionne avec le tissu\nTexture de la doudoune trop lisse, coutures incohérentes\nBords flous entre les lunettes, la peau et le col",
  },
  {
    id: "fausse-allocution",
    mediaType: "video",
    mediaUrl: "/placeholder",
    title: "Fausse allocution politique",
    howItsMade:
      "Deepfake vidéo par face-swap : le visage d'un dirigeant est plaqué sur un acteur, et la voix est clonée à partir d'extraits publics. Le montage reprend les codes d'une allocution officielle (drapeau, pupitre) pour gagner en crédibilité.",
    howToSpot:
      "Synchronisation lèvres/voix qui décroche par moments\nClignements d'yeux trop rares ou trop réguliers\nContour du visage qui « vibre » sur les mouvements rapides",
  },
  {
    id: "voix-clonee-pdg",
    mediaType: "video",
    mediaUrl: "/placeholder",
    title: "Voix clonée d'un PDG",
    howItsMade:
      "Clonage vocal : à partir de quelques minutes d'interviews publiques, un modèle de synthèse reproduit le timbre et l'intonation du dirigeant. On lui fait ensuite dire un message d'arnaque (faux ordre de virement) lors d'un appel à un collaborateur.",
    howToSpot:
      "Intonation plate, respirations absentes ou mal placées\nBruit de fond artificiel ou anormalement « propre »\nDemande urgente et inhabituelle (virement, secret)",
  },
];
