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

/**
 * Scène cible prédéfinie pour "Créer mon deepfake (live)".
 * Option A (scènes contrôlées) : pas de dépôt libre. `file` est une image
 * placée dans public/targets/. Sert de base_image_url au face-swap.
 */
export interface Scene {
  id: string;
  label: string;
  file: string; // nom de fichier dans public/targets/
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

// ─── Banque du quiz (FINAL_DATASET.csv) ───────────────────────────────
// 10 fiches tirées du dataset : 5 REAL (Unsplash) + 5 FAKE (sous-ensemble
// photoréaliste du dataset ; label CSV = StyleGAN3). isDeepfake reflète le
// label du CSV : FAKE → true → révélation "DEEPFAKE", REAL → false → "VRAI".
// Fichiers locaux dans public/quiz/quiz-<image_id>.jpg (pas de dépendance
// réseau en showroom). Le quiz tire ROUNDS_PER_SESSION manches au hasard
// dans cette banque à chaque session (app/quiz/page.tsx).

export const quizRounds: QuizRound[] = [
  // — REAL (photos authentiques, Unsplash) —
  {
    id: "quiz-1315",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-1315.jpg",
    isDeepfake: false,
    explanation:
      "Photographie authentique. La main dans les cheveux, le foulard à motifs et les feuilles qui passent devant le corps forment des occlusions complexes parfaitement gérées — c'est précisément là que les générateurs trébuchent.",
    indices: [
      "Motifs du foulard continus, sans « fonte » dans les plis",
      "Doigts complets et cohérents derrière la tête",
      "Feuillage net qui chevauche le corps sans artefact",
    ],
  },
  {
    id: "quiz-2612",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-2612.jpg",
    isDeepfake: false,
    explanation:
      "Photo authentique. Les rides et taches de peau sont irrégulières et cohérentes avec l'âge, le motif à pois du chemisier reste régulier jusque dans les plis, et le flou d'arrière-plan est optiquement uniforme.",
    indices: [
      "Micro-défauts de peau non répétitifs (taches, grains de beauté)",
      "Motif à pois régulier même déformé par les plis",
      "Mèches fines qui se détachent proprement sur le bokeh",
    ],
  },
  {
    id: "quiz-2678",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-2678.jpg",
    isDeepfake: false,
    explanation:
      "Portrait authentique en noir et blanc. En très gros plan, chaque poil de moustache et de sourcil est net et individuel, la texture de peau (pores, petites marques) est continue — un niveau de détail que la génération lisse ou brouille.",
    indices: [
      "Pores et imperfections visibles et continus",
      "Poils individuels nets (sourcils, moustache)",
      "Reflets positionnés à l'identique dans les deux yeux",
    ],
  },
  {
    id: "quiz-740",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-740.jpg",
    isDeepfake: false,
    explanation:
      "Photo authentique. Le flou est optique : la mise au point est sur l'œil et s'estompe progressivement vers l'oreille et l'arrière-plan, comme le ferait un objectif — pas par zones incohérentes comme dans une image générée.",
    indices: [
      "Dégradé de netteté continu (œil net → oreille douce)",
      "Sourcils et cils nets dans la zone de mise au point",
      "Rides du front fines et asymétriques",
    ],
  },
  {
    id: "quiz-437",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-437.jpg",
    isDeepfake: false,
    explanation:
      "Photo authentique prise pendant Holi, la fête des couleurs. La poudre suit exactement les reliefs du visage et de la barbe, et les lunettes reflètent le décor environnant — des interactions physiques que l'IA reproduit très mal.",
    indices: [
      "La poudre s'accroche différemment à la peau, à la barbe, au tissu",
      "Reflets des lunettes cohérents avec le décor",
      "Éclaboussures individuelles nettes sur le t-shirt",
    ],
  },
  // — FAKE (label CSV : générés, StyleGAN3) —
  {
    id: "quiz-2858",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-2858.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré (StyleGAN3 selon la banque). La résolution très faible et la forte compression sont un signal en soi : c'est le moyen le plus simple de masquer les artefacts de synthèse. Une image minuscule et invérifiable doit renforcer la méfiance.",
    indices: [
      "Résolution très faible : méfiance par défaut",
      "Arrière-plan illisible, impossible à recouper",
      "Cadrage serré type avatar, classique des visages générés",
    ],
  },
  {
    id: "quiz-2976",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-2976.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré (StyleGAN3 selon la banque). Le format selfie basse résolution supprime tout ce qui permettrait de vérifier : pores, mèches, reflets dans les yeux. Une photo qui ne circule qu'en vignette est suspecte.",
    indices: [
      "Image trop petite pour vérifier pores et reflets",
      "Lissage uniforme de la peau",
      "Contexte intérieur générique, invérifiable",
    ],
  },
  {
    id: "quiz-2993",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-2993.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré (StyleGAN3 selon la banque). Le rendu est propre — presque trop : peau lisse et uniforme pour un gros plan, dents très régulières, et un arrière-plan neigeux vide qui n'offre aucun élément de contexte à recouper.",
    indices: [
      "Peau anormalement lisse pour un gros plan",
      "Arrière-plan vide : rien à vérifier",
      "Dents d'une régularité parfaite",
    ],
  },
  {
    id: "quiz-3048",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-3048.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré (StyleGAN3 selon la banque). Les matières complexes sont le talon d'Achille de la synthèse : scrutez la frontière entre la fourrure de la chapka et les mèches de cheveux, zone typiquement « fondue » sur les visages générés.",
    indices: [
      "Frontière fourrure / cheveux confuse",
      "Arrière-plan de forêt flou aux formes répétitives",
      "Saturation des couleurs anormalement poussée",
    ],
  },
  {
    id: "quiz-2836",
    mediaType: "image",
    mediaUrl: "/quiz/quiz-2836.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré (StyleGAN3 selon la banque). Portrait frontal, cadrage carré serré, fond d'intérieur à peine esquissé : la signature des banques de visages synthétiques — crédibles en vignette, beaucoup moins en grand écran.",
    indices: [
      "Format vignette : les défauts disparaissent à petite taille",
      "Fond minimal, hors de tout contexte vérifiable",
      "Symétrie du visage inhabituellement forte",
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
    mediaUrl: "/celebrites/pape-doudoune.jpg",
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

// ─── Scènes prédéfinies "Créer mon deepfake" (Bloc 5+) ────────────────
// 4 scènes : JT, Tribune, LinkedIn, Magazine.
// Pour en ajouter une : déposer l'image dans public/targets/ puis ajouter
// une entrée ici. Une image déclarée mais absente est gérée côté UI (ignorée
// / placeholder) et refusée proprement côté route.
export const scenes: Scene[] = [
  { id: "jt", label: "Présentateur JT", file: "jt.jpg" },
  { id: "tribune", label: "Tribune politique", file: "tribune.jpg" },
  { id: "linkedin", label: "Photo LinkedIn", file: "linkedin.jpg" },
  { id: "magazine", label: "Couverture magazine", file: "magazine.jpg" },
  // Pour en ajouter : déposer l'image dans public/targets/ + une ligne ici
  // (file = nom de fichier EXACT, casse/extension comprises).
];
