Tu es le développeur principal d’un projet front React/Next.js déjà connecté à une base Supabase existante.  
Le backend (Supabase + Postgres) est en place et NE DOIT PAS être modifié.  
Ta mission est de reconstruire l’interface front et les services de lecture, pas de toucher au schéma SQL.

---------------------------------------------------
🎯 OBJECTIF DU PROJET
---------------------------------------------------

Le projet, « History Pins », est une application web immersive sur l’histoire de France (carte interactive de récits géolocalisés).

Fonctionnement côté utilisateur :

- Une **carte de Paris** affiche des points d’intérêt (stories).
- Chaque point représente une **histoire courte** (≈ 1min30) liée à un lieu précis (ex : Champ de Mars, Île de la Cité, etc.).
- Quand l’utilisateur clique sur un point :
  - une **modale plein écran** s’ouvre,
  - un **player narratif** se lance :
    - texte et images synchronisées,
    - éventuellement une piste audio (plus tard ElevenLabs ou autre),
    - ambiance immersive (images séquentielles, éventuellement sons de fond).

Le but est de pouvoir :

1. **Afficher la carte** avec toutes les stories `published`.
2. **Ouvrir une story** et charger toutes ses données depuis Supabase.
3. **Lire l’histoire** sous forme de séquence :
   - timeline découpée en scènes,
   - une image par scène,
   - texte associé à la scène,
   - audio si disponible (sinon fallback visuel uniquement).

Pas de création/édition côté front pour l’instant :  
➡️ **lecture seule** sur la base.

---------------------------------------------------
🗄️ BACKEND : SUPABASE / POSTGRES (SCHÉMA FIXE)
---------------------------------------------------

Le schéma existe déjà. Tu NE dois PAS créer/altérer de tables ni de colonnes.  
Tu dois travailler avec les tables suivantes :

1) `stories`
- Représente un lieu + un événement historique.
- Colonnes principales :
  - `id` (uuid, pk)
  - `title` (text)
  - `slug` (text, unique)
  - `location_name` (text)
  - `latitude` (double precision)
  - `longitude` (double precision)
  - `period` (text)
  - `status` (text, ex: 'draft' | 'published')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

Seules les stories avec `status = 'published'` doivent être affichées sur la carte.

2) `story_versions`
- Différentes versions de la narration pour une story.
- Colonnes :
  - `id` (uuid, pk)
  - `story_id` (uuid, fk → stories.id)
  - `version_number` (int)
  - `script_text` (text)  ← texte complet de la narration (~1min30)
  - `duration_estimated_sec` (int)
  - `source_agent` (text)  -- ex: 'manual', 'historian_v1'
  - `is_selected` (boolean) -- indique la version retenue pour la story
  - `created_at` (timestamptz)

Pour une story, on ne considère que la version où `is_selected = true`.

3) `story_audio` (optionnel pour l’instant)
- Métadonnées de la piste audio de la narration (si déjà générée).
- Colonnes :
  - `id` (uuid, pk)
  - `story_id` (uuid, fk → stories.id)
  - `version_id` (uuid, fk → story_versions.id)
  - `audio_url` (text)  ← URL publique ou chemin Storage
  - `duration_sec` (int)
  - `voice_id` (text)    ← ex: id ElevenLabs
  - `status` (text)      ← ex: 'generated', 'approved'
  - `created_at` (timestamptz)

Le front doit être capable de fonctionner **même s’il n’y a pas d’entrée** dans `story_audio` (mode silencieux avec seulement images + texte).

4) `story_scenes`
- Découpage de la narration en scènes (segments de timeline).
- Colonnes :
  - `id` (uuid, pk)
  - `story_id` (uuid, fk → stories.id)
  - `idx` (int)          ← index de la scène (0..N-1)
  - `label` (text)       ← titre court de la scène (ex: "Le choc des armées")
  - `description` (text) ← descriptif interne de la scène
  - `start_sec` (int)    ← début de la scène dans la narration (en secondes)
  - `end_sec` (int)      ← fin de la scène
  - `created_at` (timestamptz)
  - Il peut exister une colonne optionnelle `text_excerpt` (text) :
    - si elle existe, elle contient le morceau de texte à afficher pour cette scène.
    - Si elle n’existe pas, ignorer cette info côté front.

Les scènes doivent être triées par `idx`.

5) `image_prompts`
- Prompts utilisés pour générer les images (Midjourney ou autre).
- Colonnes :
  - `id` (uuid, pk)
  - `scene_id` (uuid, fk → story_scenes.id)
  - `prompt_text` (text)
  - `engine` (text, ex: 'midjourney')
  - `created_at` (timestamptz)

6) `story_images`
- Images associées à une scène.
- Colonnes :
  - `id` (uuid, pk)
  - `scene_id` (uuid, fk → story_scenes.id)
  - `prompt_id` (uuid, fk → image_prompts.id)
  - `image_url` (text)   ← soit URL CDN, soit chemin Storage
  - `width` (int, optionnel)
  - `height` (int, optionnel)
  - `status` (text)      ← ex: 'draft' | 'approved'
  - `created_at` (timestamptz)

Le front doit utiliser **uniquement les images avec `status = 'approved'`**.

---------------------------------------------------
📦 SUPABASE CLIENT & TYPES
---------------------------------------------------

Tu dois :

1. Créer un client Supabase typé (ex: `src/lib/supabaseClient.ts`) utilisant :
   - URL et clé anonyme (env) :
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Utilisation côté client uniquement (pas de logique serveur complexe).

2. Définir des types TypeScript pour :
   - `DbStory` (ligne de `stories`)
   - `DbStoryVersion`
   - `DbStoryAudio`
   - `DbStoryScene`
   - `DbImagePrompt`
   - `DbStoryImage`

3. Créer un adaptateur DB → Front (ex: `src/lib/storyAdapter.ts`) qui prend les lignes brutes et renvoie une structure front unique du type :

```ts
type SceneAsset = {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  imageUrl: string | null;
  textExcerpt?: string | null;
};

type StoryDetail = {
  id: string;
  title: string;
  slug: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  period: string | null;
  scriptText: string;
  durationSec: number | null;
  audioUrl?: string | null;
  scenes: SceneAsset[];
};
Tu peux ajuster les types internes mais l’idée est :

1 objet StoryDetail complet :

texte,

audio (optionnel),

scènes (avec image+texte+timings).

🧩 SERVICES DE LECTURE À RECRÉER
Créer un fichier de services (ex: src/services/storyService.ts) qui expose au moins :

getPublishedStories()

Rôle : récupérer les stories à afficher sur la carte.

Implémentation :

SELECT * FROM stories

WHERE status = 'published'

retourner une liste d’objets minimalistes pour la carte :

ts
Copier le code
type StoryMapPoint = {
  id: string;
  title: string;
  slug: string;
  latitude: number;
  longitude: number;
  period?: string | null;
};
getStoryWithAssets(storyIdOrSlug: string)

Rôle : charger tout ce qu’il faut pour le player :

story,

version sélectionnée (story_versions.is_selected = true),

audio (si présent, sinon audioUrl = null),

scènes,

image principale par scène (ex: la première story_images approuvée pour la scène).

Contraintes :

Trier les scènes par idx.

Pour chaque scène, récupérer 1 image approuvée (par ex. order by created_at asc limit 1).

Adapter le tout au type StoryDetail.

🧭 COMPORTEMENT FRONT / UX
Stack recommandée :

Next.js (app router), React 18, TypeScript.

Styling : CSS simple ou Tailwind au choix, mais propre et minimal.

Composants principaux à reconstruire :

Page principale (ex: app/page.tsx)

Affiche une carte plein écran centrée sur Paris.

Utilise getPublishedStories() via un hook (ex: usePublishedStories).

Place un marker pour chaque story.

Quand l’utilisateur clique sur un marker :

ouvrir une modale (StoryModal) avec les détails de la story.

MapView

Composant responsable de la carte.

Tu peux utiliser React Leaflet ou une autre librairie équivalente (mais React Leaflet est très bien).

Props possibles : stories, onSelectStory.

StoryModal

Modale plein écran (overlay sombre).

Affiche :

titre de la story,

période,

éventuellement location_name,

un composant StoryPlayer,

un bouton de fermeture.

StoryPlayer

C’est le cœur de l’expérience.

Entrée : StoryDetail.

Comportement :

Si audio disponible (audioUrl non null) :

utiliser un <audio> HTML avec onTimeUpdate pour récupérer currentTime.

déterminer la scène active en fonction de currentTime entre startSec et endSec.

afficher l’image de la scène active en plein cadre.

afficher le texte de scene.textExcerpt si disponible, sinon éventuellement rien ou un extrait global.

afficher une barre de progression basée sur currentTime / durationSec.

boutons Play/Pause.

Si audio NON disponible :

fallback : mode visuel.

tu peux :

soit faire défiler automatiquement les scènes (timer basé sur startSec/endSec),

soit laisser l’utilisateur passer de scène en scène via “Précédent/Suivant”.

même logique d’affichage : image + texte de scène.

Animations :

simple fade/zoom entre les images (transition CSS, pas besoin de trucs complexes).

📌 CONTRAINTES & GUIDELINES
Ne JAMAIS modifier la structure de la base (pas de migrations SQL dans le code).

Ne PAS ajouter/supprimer de colonnes.

Ne PAS faire d’INSERT/UPDATE côté front : lecture seule.

Toujours gérer les cas où :

il n’y a pas d’audio,

il manque une image pour une scène (ne pas crasher, fallback texte).

Code proprement typé, avec séparation claire :

lib/ → supabase client, adaptateurs

services/ → fonctions de lecture

hooks/ → logique de chargement (loading, error)

components/ → UI

Comportement attendu :

Au lancement :

la page principale charge les stories publiées via Supabase,

affiche les markers sur la carte.

Au clic sur un marker :

on charge la story complète,

on ouvre la modale,

le player est prêt à jouer (audio si présent, sinon diaporama scénarisé).

Ton rôle est de recréer cette architecture et ce comportement de manière robuste et lisible, à partir de ce contexte.

diff
Copier le code

Tu peux partir de ça, et ensuite dans Cursor lui demander des trucs du style :

- “Crée-moi tout le squelette Next.js + les services Supabase selon ce prompt.”
- “Implémente le composant StoryPlayer en suivant la structure StoryDetail et la logique de scènes.”
::contentReference[oaicite:0]{index=0}

