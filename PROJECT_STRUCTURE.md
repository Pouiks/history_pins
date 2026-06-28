# Structure du projet HistoFrance

```
histofrance/
│
├── 📄 Configuration
│   ├── .env.example                  # Template des variables d'environnement
│   ├── .eslintrc.json               # Configuration ESLint
│   ├── .gitignore                   # Fichiers ignorés par Git
│   ├── .prettierrc.json             # Configuration Prettier
│   ├── components.json              # Configuration shadcn/ui
│   ├── next.config.js               # Configuration Next.js
│   ├── package.json                 # Dépendances et scripts
│   ├── postcss.config.js            # Configuration PostCSS
│   ├── tailwind.config.ts           # Configuration Tailwind CSS
│   └── tsconfig.json                # Configuration TypeScript
│
├── 📚 Documentation
│   ├── README.md                    # Documentation principale
│   ├── GETTING_STARTED.md           # Guide de démarrage rapide
│   ├── DEPLOYMENT.md                # Guide de déploiement
│   ├── FEATURES.md                  # Liste des fonctionnalités
│   ├── PROJECT_STRUCTURE.md         # Ce fichier
│   └── build.md                     # Spécifications initiales
│
├── 📁 public/                       # Assets statiques
│   └── .gitkeep
│
└── 📁 src/                          # Code source
    │
    ├── 📁 app/                      # Application Next.js (App Router)
    │   ├── globals.css              # Styles globaux + Tailwind + Leaflet CSS
    │   ├── layout.tsx               # Layout racine (metadata, fonts)
    │   └── page.tsx                 # Page d'accueil (carte + modale)
    │
    ├── 📁 components/               # Composants React
    │   ├── 📁 ui/                   # Composants shadcn/ui
    │   │   ├── button.tsx           # Bouton réutilisable
    │   │   └── dialog.tsx           # Dialog/Modal
    │   │
    │   ├── MapView.tsx              # Carte Leaflet avec markers
    │   ├── SceneDisplay.tsx         # Affichage d'une scène (image + texte)
    │   ├── StoryModal.tsx           # Modale plein écran pour story
    │   └── StoryPlayer.tsx          # Player principal (audio + fallback)
    │
    ├── 📁 hooks/                    # Hooks React personnalisés
    │   ├── usePublishedStories.ts   # Charge stories pour carte
    │   └── useStoryDetail.ts        # Charge story complète
    │
    ├── 📁 lib/                      # Bibliothèques et utilitaires
    │   ├── storyAdapter.ts          # Adaptateur DB → Frontend
    │   ├── supabaseClient.ts        # Client Supabase typé
    │   └── utils.ts                 # Utilitaires (cn pour classes)
    │
    ├── 📁 services/                 # Services de données
    │   └── storyService.ts          # API Supabase (queries)
    │
    └── 📁 types/                    # Types TypeScript
        ├── database.ts              # Types des tables DB
        └── frontend.ts              # Types pour l'interface
```

## 📂 Détail des responsabilités

### `/src/app` - Pages Next.js

**Rôle** : Structure de l'application avec App Router de Next.js 14

- `layout.tsx` : Layout global, metadata, fonts
- `page.tsx` : Page principale avec carte et gestion de la modale
- `globals.css` : Styles Tailwind + Leaflet + animations personnalisées

### `/src/components` - Interface utilisateur

**Rôle** : Composants React réutilisables et spécifiques

#### Composants principaux

- **`MapView.tsx`** : Carte interactive avec React Leaflet
  - Affiche markers des stories
  - Gère les clics et popups
  - Compatible SSR/Client

- **`StoryModal.tsx`** : Modale de story
  - Utilise Dialog shadcn/ui
  - Charge story via `useStoryDetail`
  - Gère loading/error states

- **`StoryPlayer.tsx`** : Cœur de l'expérience
  - Mode audio avec synchronisation
  - Mode fallback avec timer
  - Contrôles play/pause
  - Barre de progression

- **`SceneDisplay.tsx`** : Affichage de scène
  - Image en background
  - Texte superposé
  - Transitions smooth

#### Composants UI (`/ui`)

- **`button.tsx`** : Bouton avec variants (shadcn/ui)
- **`dialog.tsx`** : Dialog/Modal (shadcn/ui)

### `/src/hooks` - Logique React

**Rôle** : Hooks personnalisés pour la gestion d'état

- **`usePublishedStories.ts`**
  - Charge stories publiées au montage
  - Retourne `{ stories, loading, error }`

- **`useStoryDetail.ts`**
  - Charge story complète par ID ou slug
  - Retourne `{ story, loading, error }`
  - Se réinitialise si ID change

### `/src/lib` - Bibliothèques

**Rôle** : Configuration et adaptateurs

- **`supabaseClient.ts`**
  - Client Supabase typé
  - Validation des variables d'env

- **`storyAdapter.ts`**
  - Convertit données DB en types frontend
  - Gère la logique d'assemblage

- **`utils.ts`**
  - Fonction `cn()` pour classes Tailwind
  - Autres utilitaires génériques

### `/src/services` - Services de données

**Rôle** : Interface avec la base de données

- **`storyService.ts`**
  - `getPublishedStories()` : Stories pour carte
  - `getStoryWithAssets()` : Story complète avec assets
  - Toute la logique SQL/Supabase

### `/src/types` - Types TypeScript

**Rôle** : Définitions de types centralisées

- **`database.ts`**
  - Types des tables Supabase
  - `DbStory`, `DbStoryVersion`, etc.
  - Type `Database` pour client typé

- **`frontend.ts`**
  - Types pour l'interface
  - `StoryMapPoint`, `StoryDetail`, `SceneAsset`

## 🔄 Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                      Page d'accueil                          │
│                     (app/page.tsx)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ usePublishedStories()
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   hooks/usePublishedStories                  │
│                  ┌────────────────────┐                      │
│                  │  useState, useEffect                       │
│                  └────────┬───────────┘                      │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          │ getPublishedStories()
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 services/storyService                        │
│                  ┌────────────────────┐                      │
│                  │  Supabase queries  │                      │
│                  └────────┬───────────┘                      │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          │ supabase.from('stories')
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    lib/supabaseClient                        │
│                  ┌────────────────────┐                      │
│                  │ Client Supabase    │                      │
│                  └────────┬───────────┘                      │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ↓
                    [SUPABASE DB]
                          │
                          │ Raw data
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  lib/storyAdapter                            │
│                  ┌────────────────────┐                      │
│                  │ DB → Frontend      │                      │
│                  └────────┬───────────┘                      │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          │ StoryMapPoint[]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    components/MapView                        │
│                  ┌────────────────────┐                      │
│                  │ Affiche markers    │                      │
│                  └────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Flux UI

```
Utilisateur ouvre l'app
       │
       ↓
┌──────────────────┐
│   Page charge    │  → usePublishedStories()
│   Affiche carte  │  → Stories affichées comme markers
└────────┬─────────┘
         │
         │ Clic sur marker
         ↓
┌──────────────────┐
│  StoryModal      │  → useStoryDetail(storyId)
│  s'ouvre         │  → Chargement story complète
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  StoryPlayer     │  → Audio ? Mode audio : Mode fallback
│  démarre         │  → Affiche SceneDisplay
└────────┬─────────┘
         │
         │ Temps s'écoule
         ↓
┌──────────────────┐
│  Scènes changent │  → Transitions smooth
│  automatiquement │  → Images + textes synchronisés
└──────────────────┘
```

## 📊 Hiérarchie des composants

```
<RootLayout>                      (app/layout.tsx)
  │
  └─ <HomePage>                   (app/page.tsx)
       │
       ├─ <MapView>               (components/MapView.tsx)
       │    └─ <Marker> × N       (react-leaflet)
       │
       └─ <StoryModal>            (components/StoryModal.tsx)
            │
            └─ <Dialog>           (components/ui/dialog.tsx)
                 │
                 └─ <StoryPlayer> (components/StoryPlayer.tsx)
                      │
                      ├─ <SceneDisplay>     (components/SceneDisplay.tsx)
                      ├─ <Button>           (components/ui/button.tsx)
                      └─ <audio>            (HTML5)
```

## 🔑 Fichiers clés à connaître

### Pour modifier l'UI
- `src/app/page.tsx` : Layout de la page principale
- `src/components/StoryPlayer.tsx` : Logique du player
- `src/app/globals.css` : Styles et animations
- `tailwind.config.ts` : Configuration des couleurs/thème

### Pour modifier la logique de données
- `src/services/storyService.ts` : Requêtes Supabase
- `src/lib/storyAdapter.ts` : Transformation des données
- `src/types/*.ts` : Types TypeScript

### Pour configurer
- `.env.local` : Variables d'environnement (à créer)
- `next.config.js` : Configuration Next.js
- `components.json` : Configuration shadcn/ui

## 🛠️ Conventions du code

### Nommage
- Composants : PascalCase (`MapView.tsx`)
- Hooks : camelCase avec préfixe `use` (`useStoryDetail.ts`)
- Services : camelCase (`storyService.ts`)
- Types : PascalCase avec préfixe `Db` pour DB (`DbStory`)

### Organisation des imports
```typescript
// 1. Imports externes
import { useState } from 'react';
import { supabase } from '@supabase/supabase-js';

// 2. Imports internes (types)
import type { StoryDetail } from '@/types/frontend';

// 3. Imports de composants
import { Button } from '@/components/ui/button';

// 4. Imports de styles
import './styles.css';
```

### Structure des composants
```typescript
'use client'; // Si nécessaire

// 1. Imports
import ...

// 2. Types/Interfaces
interface ComponentProps { ... }

// 3. Composant
export function Component({ props }: ComponentProps) {
  // États
  const [state, setState] = useState();
  
  // Effets
  useEffect(() => { ... }, []);
  
  // Handlers
  const handleEvent = () => { ... };
  
  // Render
  return ( ... );
}
```

## 📝 Notes importantes

- Tous les composants UI sont dans `/src/components`
- Tous les composants sont "client components" (`'use client'`)
- Les types DB et Frontend sont séparés volontairement
- Le client Supabase est un singleton
- Aucune mutation DB n'est effectuée (lecture seule)

