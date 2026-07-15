/*
 * Schéma de données — PLACEHOLDER (Bloc 1).
 * Structures qui alimenteront les modes ; on les remplira aux Blocs 2/3.
 * Ici : 1 entrée d'exemple BIDON par type, juste pour fixer la forme.
 *
 * Rappel cadre éthique : pour les célébrités on montre de l'EXISTANT,
 * on ne génère pas (voir CLAUDE.md).
 */

export type MediaType = "image" | "video";

/** Thèmes du quiz (P2) — extensible : "documents"… */
export type ThemeId = "visages" | "showroom" | "paysages";

/** Pack de thème affiché sur l'écran de sélection du quiz. */
export interface ThemePack {
  id: ThemeId;
  label: string;
  description: string;
}

// Les fiches référencent les thèmes (champ `themes`), pas l'inverse : un
// nouveau pack = de nouvelles fiches taguées, zéro refactor.
export const themePacks: ThemePack[] = [
  {
    id: "visages",
    label: "Visages",
    description: "Portraits réels et visages générés",
  },
  {
    id: "showroom",
    label: "Vu au showroom",
    description: "Deepfakes créés par les visiteurs (banque)",
  },
  {
    id: "paysages",
    label: "Paysages",
    description: "Vrai cliché ou paysage généré ?",
  },
];

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
  /**
   * Thèmes d'appartenance (multi). OPTIONNEL car les rounds de la banque
   * (/api/bank/quiz) reçoivent leurs thèmes CÔTÉ CLIENT (BANK_THEMES,
   * app/quiz/page.tsx) — le serveur ne connaît pas les thèmes. Les fiches
   * statiques ci-dessous doivent toutes le renseigner.
   */
  themes?: ThemeId[];
}

/**
 * Scène prédéfinie pour "Créer mon deepfake (live)".
 * Depuis la migration Ideogram : une scène est un PROMPT de génération
 * (fal-ai/ideogram/character recompose la scène autour du visage de
 * référence). Les prompts sont résolus CÔTÉ SERVEUR uniquement — le client
 * n'envoie jamais de prompt (même logique anti-abus que l'ancienne
 * whitelist de fichiers).
 */
export interface Scene {
  id: string;
  label: string;
  /** Prompt de scène (anglais), envoyé à fal-ai/ideogram/character */
  prompt: string;
  /** Vignette illustrative optionnelle dans public/targets/ (plus une image cible) */
  thumb?: string;
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
    themes: ["visages"],
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
    themes: ["visages"],
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
    themes: ["visages"],
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
    themes: ["visages"],
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
    themes: ["visages"],
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
  // FAKE — visages 100% synthétiques générés via FLUX 1.1 pro (raw), aucune personne réelle
  {
    id: "visage-fake-1",
    themes: ["visages"],
    mediaType: "image",
    mediaUrl: "/quiz/visage-fake-1.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré par IA. Très convaincant : c'est un des faux les plus difficiles à démasquer, la lumière et la peau sont crédibles. Le fond et les raccords vestimentaires trahissent la génération.",
    indices: [
      "Le col de chemise a une pointe molle, mal raccordée à l'épaule.",
      "Le fond intérieur sombre est vague : le cadre au mur n'a aucun contenu lisible.",
      "Quelques poils de barbe se dissolvent dans l'obscurité du fond, sans limite nette.",
    ],
  },
  {
    id: "visage-fake-2",
    themes: ["visages"],
    mediaType: "image",
    mediaUrl: "/quiz/visage-fake-2.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré par IA. Portrait très crédible en extérieur — les tells sont subtils, à chercher dans les accessoires et les détails.",
    indices: [
      "Une seule boucle d'oreille est visible ; l'autre oreille est cachée par les cheveux, paire invérifiable (astuce classique de génération).",
      "Les sourcils sont légèrement dépareillés, l'un plus arqué que l'autre.",
      "Les pressions dorées de la veste sont irrégulières et la boucle de la bandoulière semble flotter.",
    ],
  },
  {
    id: "visage-fake-3",
    themes: ["visages"],
    mediaType: "image",
    mediaUrl: "/quiz/visage-fake-3.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré par IA. Le contre-jour et la texture de peau sont excellents, mais la bouche et un contour d'oreille révèlent la synthèse.",
    indices: [
      "La rangée de dents supérieure est irrégulière, un peu fusionnée au centre.",
      "L'oreille en plein contre-jour a un cartilage « fondu », mal défini.",
      "À la jonction favoris/oreille, les poils blancs se dispersent en halo flou sur le fond.",
    ],
  },
  {
    id: "visage-fake-4",
    themes: ["visages"],
    mediaType: "image",
    mediaUrl: "/quiz/visage-fake-4.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré par IA — style photo corporate. Propre au point d'être « trop lisse » pour l'âge affiché ; les bijoux trahissent la génération.",
    indices: [
      "Les créoles sont dépareillées : l'une bien visible et ronde, l'autre absente ou masquée.",
      "Le pendentif du collier a un motif interne indistinct, une forme « inventée » non identifiable.",
      "La peau est trop lisse et uniforme pour l'âge apparent, et les luminaires du plafond se répètent mécaniquement.",
    ],
  },
  {
    id: "visage-fake-5",
    themes: ["visages"],
    mediaType: "image",
    mediaUrl: "/quiz/visage-fake-5.jpg",
    isDeepfake: true,
    explanation:
      "Visage généré par IA — le plus facile à démasquer. Le regard et les accessoires cumulent plusieurs signatures franches de génération.",
    indices: [
      "Les deux yeux ne pointent pas dans la même direction (effet strabisme non naturel).",
      "Le vermillon dans la raie des cheveux est éclaté en pixels rouges dispersés, peu réaliste.",
      "Une seule boucle d'oreille pendante est visible ; l'autre côté est vide.",
    ],
  },
  // ─── Thème "Paysages" (P2) — 5 FAKE (bench IA) + 5 REAL (Unsplash) ────
  // FAKE : paysages générés (scripts/bench-output), copiés en local dans
  // public/quiz/paysages/. Chaque fiche est taguée themes:["paysages"].
  // — FAKE (paysages générés par IA) —
  {
    id: "pay-fake-rue",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/fake-rue.jpg",
    isDeepfake: true,
    explanation:
      "Générée par IA. La scène est convaincante au premier coup d'œil, mais le texte la trahit : les modèles de génération ne savent toujours pas écrire.",
    indices: [
      "Le panneau jaune sur la façade rose affiche un texte incohérent (« FAP RISHON »).",
      "La plaque de la voiture blanche est brouillée et illisible.",
      "La lanterne en fer forgé et la gouttière se fondent l'une dans l'autre au premier plan.",
    ],
  },
  {
    id: "pay-fake-lac",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/fake-lac.jpg",
    isDeepfake: true,
    explanation:
      "Générée par IA. L'eau calme et claire devrait renvoyer les montagnes — l'absence de reflet est le signe le plus sûr.",
    indices: [
      "Le lac ne reflète ni les sommets ni la forêt, alors que la surface est lisse.",
      "Les deux versants sont presque symétriques, trop équilibrés pour un paysage réel.",
      "Les galets immergés semblent flotter : la réfraction sous l'eau est mal rendue.",
    ],
  },
  {
    id: "pay-fake-falaises",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/fake-falaises.jpg",
    isDeepfake: true,
    explanation:
      "Générée par IA. Spectaculaire, mais la lumière du coucher de soleil n'éclaire pas les falaises de façon cohérente d'un cap à l'autre.",
    indices: [
      "Des pans de falaise qui devraient être à contre-jour sont éclairés, et inversement.",
      "Les strates de la grande paroi ondulent et se raccordent mal, avec des coutures verticales.",
      "Les caps successifs vers l'horizon se répètent, clonés à échelle décroissante.",
    ],
  },
  {
    id: "pay-fake-desert",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/fake-desert.jpg",
    isDeepfake: true,
    explanation:
      "Générée par IA — et difficile. Les indices sont subtils : cohérence des ombres et répétition des textures.",
    indices: [
      "Les dunes sont éclairées par la droite, mais les buissons du premier plan ne projettent presque aucune ombre.",
      "Les rides de sable se répètent de façon trop homogène et « glissent » sans suivre le relief.",
      "Plusieurs buissons sont quasi identiques et se terminent dans le vide, sans tronc net.",
    ],
  },
  {
    id: "pay-fake-foret",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/fake-foret.jpg",
    isDeepfake: true,
    explanation:
      "Générée par IA — l'image la plus propre du lot. C'est la répétition, plus qu'un défaut franc, qui trahit la génération.",
    indices: [
      "Les conifères se ressemblent trop en forme et en espacement : un motif d'arbres clonés.",
      "Le détail des aiguilles se dissout en amas verts flous, sans branches lisibles.",
      "La limite entre arbres nets et arbres noyés dans la brume est parfois trop brutale.",
    ],
  },
  // — REAL (photographies authentiques, Unsplash) —
  {
    id: "pay-real-champ",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/real-1.jpg",
    isDeepfake: false,
    explanation:
      "Photographie authentique. Un paysage simple est parfois le plus piégeux : sans texte ni architecture, il y a peu de prise pour un artefact — mais la texture de l'herbe et le dégradé du ciel sont parfaitement cohérents.",
    indices: [
      "Le brin d'herbe est irrégulier et non répétitif : une vraie texture naturelle.",
      "Le dégradé du ciel est continu, sans raccord ni aplat.",
      "L'horizon est net et régulier, sans ondulation suspecte.",
    ],
  },
  {
    id: "pay-real-ville",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/real-2.jpg",
    isDeepfake: false,
    explanation:
      "Photographie authentique. Attention au réflexe « il y a du texte donc c'est vrai » — ici les enseignes et panneaux sont lisibles et cohérents, contrairement au charabia d'une génération.",
    indices: [
      "Les inscriptions et enseignes sont lisibles et bien formées.",
      "Les lignes de fuite de la rue sont géométriquement cohérentes.",
      "Les fenêtres et façades s'alignent sans fusion ni déformation.",
    ],
  },
  {
    id: "pay-real-plage",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/real-3.jpg",
    isDeepfake: false,
    explanation:
      "Photographie authentique. Le bord de mer sous ciel dégagé suit une logique physique cohérente : écume, reflets sur l'eau et dégradé du ciel s'accordent.",
    indices: [
      "L'écume et les vagues suivent une houle plausible, non répétée.",
      "Les reflets et la brillance sur l'eau sont cohérents avec la lumière du ciel.",
      "La ligne d'horizon mer/ciel est nette et rectiligne.",
    ],
  },
  {
    id: "pay-real-route",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/real-4.jpg",
    isDeepfake: false,
    explanation:
      "Photographie authentique. La végétation dense pourrait évoquer la « pâte verte » d'une génération, mais en y regardant, les arbres gardent une structure de branches et une profondeur cohérentes.",
    indices: [
      "Le feuillage garde une structure lisible, avec des branches et des plans de profondeur.",
      "La route et son marquage fuient de façon géométriquement correcte.",
      "Les ombres portées des arbres suivent toutes la même direction de lumière.",
    ],
  },
  {
    id: "pay-real-prairie",
    themes: ["paysages"],
    mediaType: "image",
    mediaUrl: "/quiz/paysages/real-5.jpg",
    isDeepfake: false,
    explanation:
      "Photographie authentique. Le ciel nuageux est le vrai juge : les nuages ont une structure de bords irrégulière et une profondeur que la génération lisse souvent en cotons trop uniformes.",
    indices: [
      "Les nuages ont des bords irréguliers et une épaisseur variable, non lissée.",
      "La lumière du ciel et celle du sol sont cohérentes entre elles.",
      "L'herbe présente des variations de densité et de teinte naturelles.",
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

// ─── Scènes prédéfinies "Créer mon deepfake" (migration Ideogram) ─────
// 4 prompts de scène "quotidien" — les 3 premiers repris tels quels du
// bench validé (scripts/bench-ideogram.mjs), le 4e (jt) rédigé dans le
// même style : REALISTIC, une personne centrale = la référence.
// Les 4 scènes sont TOUTES générées à chaque session (1 appel par scène,
// en parallèle) ; le visiteur choisit sa préférée à l'écran résultat.
// Pour en ajouter une : une entrée ici suffit (thumb optionnelle dans
// public/targets/).
export const scenes: Scene[] = [
  {
    id: "team-office",
    label: "Photo d'équipe",
    prompt:
      "professional team photo in a modern open-space office, group of colleagues smiling at camera",
  },
  {
    id: "badge",
    label: "Badge employé",
    prompt: "employee ID badge photo, corporate headshot, neutral background",
    thumb: "linkedin.jpg", // portrait corporate existant, illustre bien le badge
  },
  {
    id: "family",
    label: "Photo de famille",
    prompt: "family photo in a living room, casual setting, natural light",
  },
  {
    id: "jt",
    label: "Présentateur JT",
    prompt:
      "TV news anchor presenting the evening news on a television studio set, sitting at the anchor desk, professional studio lighting",
    thumb: "jt.jpg",
  },
];
