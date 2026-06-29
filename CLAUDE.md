# Atelier Deepfake

Web app pour le showroom **Agentic Livepoint** (Lab IA Onepoint).

## Contexte

Deux modes (à venir, ne pas implémenter avant validation) :

1. **Quiz vrai / deepfake** — l'utilisateur devine si un média est authentique ou généré.
2. **Démonstrateur** — génération/illustration de deepfake en direct.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 (config CSS-first dans `app/globals.css`, pas de `tailwind.config.js`)
- Police Poppins via `next/font`
- Déploiement : Vercel

## Déploiement

Sur ce poste (réseau d'entreprise avec **CA custom**), préfixer **toute** commande
`npx vercel` par `NODE_OPTIONS=--use-system-ca`, sinon erreur TLS
(`unable to get local issuer certificate`).

```bash
NODE_OPTIONS=--use-system-ca npx vercel        # preview
NODE_OPTIONS=--use-system-ca npx vercel --prod # production
```

## Charte visuelle

⚠️ **PROVISOIRE** (valeurs de travail reprises du POC lunettes), **PAS** la
charte officielle Onepoint — à remplacer plus tard.

- Bleu `#0066cc` · Teal `#00a39a` · Blanc · Noir neutre `#111111`
- Tokens : `app/globals.css` (`@theme`) + police dans `app/layout.tsx`

## Règles de travail

- **Itératif** : une étape validée avant de passer à la suivante.
- **Montrer avant de committer** : présenter le résultat, puis commit/push sur accord.
- **Clés API en `.env.local` uniquement** : jamais en dur, jamais committées.

## Cadre éthique

- Création de deepfake **uniquement sur consentement explicite** des personnes filmées.
- Pour les **célébrités / personnalités publiques** : on **montre de l'existant**,
  on ne **génère pas** de nouveau contenu.
