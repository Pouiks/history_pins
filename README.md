# History Pins — Histoires de France

Application web immersive pour explorer l'histoire de France sur une carte interactive, à travers des récits géolocalisés.

## 🎯 Fonctionnalités

- **Carte interactive** : Explorez Paris avec des points d'intérêt historiques
- **Player narratif immersif** : Écoutez des histoires avec images synchronisées
- **Mode audio** : Lecture avec voix narrative (ElevenLabs ou autre)
- **Mode visuel** : Défilement automatique des scènes si pas d'audio
- **Interface moderne** : Built avec Next.js 14, React 18, Tailwind CSS et shadcn/ui

## 🏗️ Architecture

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Page d'accueil avec carte
│   └── globals.css        # Styles globaux
├── components/            # Composants React
│   ├── ui/               # Composants shadcn/ui
│   │   ├── button.tsx
│   │   └── dialog.tsx
│   ├── MapView.tsx       # Carte Leaflet
│   ├── SceneDisplay.tsx  # Affichage d'une scène
│   ├── StoryModal.tsx    # Modale plein écran
│   └── StoryPlayer.tsx   # Player principal
├── hooks/                # Hooks React personnalisés
│   ├── usePublishedStories.ts
│   └── useStoryDetail.ts
├── lib/                  # Bibliothèques et utilitaires
│   ├── supabaseClient.ts # Client Supabase typé
│   ├── storyAdapter.ts   # Adaptateur DB → Frontend
│   └── utils.ts          # Utilitaires (cn, etc.)
├── services/             # Services de données
│   └── storyService.ts   # API Supabase
└── types/                # Types TypeScript
    ├── database.ts       # Types des tables Supabase
    └── frontend.ts       # Types frontend
```

## 🗄️ Base de données (Supabase)

Le backend utilise Supabase/Postgres avec les tables suivantes :

- `stories` : Stories principales (titre, localisation, status)
- `story_versions` : Versions du script narratif
- `story_audio` : Métadonnées audio
- `story_scenes` : Découpage en scènes avec timing
- `image_prompts` : Prompts de génération d'images
- `story_images` : Images des scènes

**⚠️ Important** : Le schéma DB est fixe et ne doit **jamais** être modifié par le front.

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm/yarn/pnpm
- Un projet Supabase configuré

### Étapes

1. **Cloner et installer les dépendances** :

```bash
npm install
```

2. **Configurer les variables d'environnement** :

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=votre-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-supabase
```

3. **Lancer le serveur de développement** :

```bash
npm run dev
```

4. **Ouvrir l'application** :

Naviguez vers [http://localhost:3000](http://localhost:3000)

## 📦 Scripts disponibles

- `npm run dev` : Démarre le serveur de développement
- `npm run build` : Build de production
- `npm run start` : Lance le serveur de production
- `npm run lint` : Vérifie le code avec ESLint

## 🎨 Technologies utilisées

- **Framework** : Next.js 14 (App Router)
- **UI** : React 18, TypeScript
- **Styling** : Tailwind CSS, shadcn/ui
- **Carte** : React Leaflet
- **Base de données** : Supabase (Postgres)
- **Déploiement** : Vercel (recommandé)

## 🔧 Configuration

### Tailwind CSS

La configuration Tailwind est dans `tailwind.config.ts` et inclut :
- Les tokens de couleur shadcn/ui
- Les animations personnalisées
- Le plugin `tailwindcss-animate`

### shadcn/ui

Configuration dans `components.json`. Composants utilisés :
- Dialog (modale plein écran)
- Button (contrôles du player)

## 📖 Utilisation

### Affichage des stories

Les stories avec `status = 'published'` sont automatiquement affichées sur la carte.

### Player narratif

Le player détecte automatiquement :
- **Mode audio** : Si `audioUrl` existe, lecture avec synchronisation des scènes
- **Mode visuel** : Sinon, défilement automatique basé sur les timings des scènes

### Structure des données

Chaque story complète (`StoryDetail`) contient :
- Métadonnées (titre, localisation, période)
- Script narratif complet
- Audio optionnel
- Scènes avec images et textes

## 🚨 Points d'attention

- **Pas de modification DB** : Le front est en lecture seule
- **Gestion des erreurs** : Tous les cas edge sont gérés (audio/images manquants)
- **Performance** : Les images sont chargées de façon optimisée
- **Responsive** : Interface adaptée desktop et mobile

## 📝 Contribution

Ce projet est conçu pour être robuste et maintenable :
- Code entièrement typé en TypeScript
- Séparation claire des responsabilités
- Composants réutilisables
- Documentation inline

## 📄 Licence

Projet privé - Tous droits réservés

