---
name: new-story
description: Génère une histoire géolocalisée complète pour l'app History Pins (récit français + 4-6 scènes + images gpt-image-1 + timings + insertion dans src/content/stories.ts). À invoquer avec /new-story <sujet ou lieu>.
argument-hint: <sujet ou lieu> [période=…] [lat=…] [lng=…] [scenes=4-6] [style=…]
disable-model-invocation: true
---

# /new-story — créer une histoire History Pins

Génère de bout en bout une nouvelle `StoryDetail` pour l'app **History Pins** (carte de
l'histoire de France) : récit en français, découpage en scènes, images cohérentes, timings,
puis insertion dans la source de contenu pour que l'histoire apparaisse sur la carte.

**Sujet demandé : `$ARGUMENTS`**

## Prérequis

- Node 18+ (le script utilise `fetch` natif).
- `OPENAI_API_KEY` défini dans `.env.local` (ou `.env`) à la racine du dépôt.
- Exécuter toutes les commandes **depuis la racine du dépôt** (là où vivent `.env.local`,
  `public/` et `src/`).

## Étape 0 — Lire les conventions du dépôt (obligatoire)

Avant tout, lire ces fichiers et s'aligner **exactement** sur leur format réel (ils priment
sur tout exemple de ce skill) :

- `src/types/frontend.ts` → types `StoryDetail` et `SceneAsset`.
- `src/content/stories.ts` → comment les histoires sont stockées et exposées (objet
  `storyDetails` indexé par slug, `mapPoints` dérivé automatiquement, style d'indentation,
  façon dont `id`/`slug`/scenes sont nommés et chaînés).
- `src/components/StoryPlayer.tsx` → comment les scènes sont jouées (lecture des timings,
  comportement quand `imageUrl` ou `audioUrl` est `null`).

Si la convention d'`id` de scène diffère de celle générée par le script
(`<slug>-scene-NN`), adapter le snippet à la convention existante.

## Étape 1 — Analyser la demande

Lire `$ARGUMENTS`. Le premier segment est le **sujet/lieu**. Les paramètres optionnels
peuvent être passés librement : `période`, `lat`/`lng`, nombre de `scenes` (4 à 6, défaut
5), `style` visuel. Tout paramètre absent doit être déduit aux étapes suivantes.

## Étape 2 — Rédiger le récit (français)

Écrire un récit historique **en français**, vivant et **rigoureux** : faits exacts, aucune
date ni détail inventé, **aucun anachronisme**. Longueur : **150 à 250 mots**. C'est le
`scriptText`.

## Étape 3 — Slug + garde anti-écrasement

Construire un `slug` kebab-case depuis le titre (ex. « Le Pont-Neuf » → `pont-neuf`).
**Vérifier dans `src/content/stories.ts`** si une histoire a déjà ce `slug` (ou cet `id`).
Si oui : **s'arrêter et demander** à l'utilisateur avant tout écrasement. Ne jamais écraser
une histoire existante ni ses images sans accord explicite.

## Étape 4 — Découper en scènes

Découper le récit en **4 à 6 scènes** cohérentes. Pour chacune :

- `label` : titre court de la scène (français).
- `textExcerpt` : l'extrait narratif correspondant, repris du récit, même ton (français).
- `imagePrompt` : un prompt d'image **en anglais**, descriptif et précis.

**Cohérence visuelle (essentiel)** : définir une seule direction artistique partagée et la
placer dans le champ `style` du manifest (le script la préfixe à chaque prompt). Garder
d'une scène à l'autre la même technique, palette, lumière et époque. Exemple de `style` :
`historical oil painting, cinematic warm lighting, rich earthy palette, detailed brushwork`.
Les `imagePrompt` ne décrivent alors que le **contenu** de chaque scène, pas le style.

## Étape 5 — Coordonnées

Si `lat`/`lng` ne sont pas fournis, déduire les **vraies coordonnées** du lieu en France
(décimales, ex. `48.857`, `2.341`).

## Étape 6 — Écrire le manifest

Écrire un manifest JSON dans `.claude/skills/new-story/.cache/<slug>.manifest.json` :

```json
{
  "title": "Le Pont-Neuf",
  "slug": "pont-neuf",
  "locationName": "Paris",
  "latitude": 48.857,
  "longitude": 2.341,
  "period": "1578–1607",
  "scriptText": "Le récit complet en français…",
  "style": "historical oil painting, cinematic warm lighting, rich earthy palette",
  "scenes": [
    { "label": "…", "textExcerpt": "…", "imagePrompt": "…" }
  ]
}
```

`period` et `locationName` peuvent être `null` si inconnus. `scenes` doit contenir 4 à 6
entrées.

## Étape 7 — Lancer le script

```bash
node .claude/skills/new-story/scripts/new-story.mjs .claude/skills/new-story/.cache/<slug>.manifest.json
```

Le script :

- valide le manifest (slug kebab-case, 4-6 scènes, champs requis) ;
- calcule les **timings** : `≈ 2,5 mots/seconde`, **minimum 6 s** par scène ;
  `endSec` cumulé, `durationSec` = fin de la dernière scène ;
- génère les images via **OpenAI `gpt-image-1`** en **1536×1024** et les enregistre dans
  `public/stories/<slug>/scene-01.png`, `scene-02.png`, … (les `imageUrl` pointent vers
  `/stories/<slug>/scene-NN.png`) ;
- **idempotent** : une image déjà présente est conservée (utiliser `--force` pour
  régénérer) ;
- écrit l'**entrée prête à coller** (`'<slug>': { … },`) dans `.cache/<slug>.snippet.ts` ;
- **insère automatiquement** cette entrée en tête de l'objet `storyDetails` de
  `src/content/stories.ts` (sauf `--no-insert`). Garde anti-doublon : si une entrée
  `'<slug>'` existe déjà, le script n'écrase rien et affiche l'entrée pour collage manuel.
  `mapPoints` étant dérivé de `storyDetails`, l'histoire apparaît automatiquement sur la
  carte — **aucune seconde édition n'est nécessaire**.

Options utiles : `--force` (régénère les images), `--skip-images` / `--dry-run`
(timings + entrée + insertion sans appeler OpenAI), `--no-insert` (n'écrit pas dans
`stories.ts`), `--quality=low|medium|high|auto`.

## Étape 8 — Vérifier l'insertion

L'insertion dans `src/content/stories.ts` est faite par le script. **Relire le diff** du
fichier pour confirmer que l'entrée est bien formée et qu'aucune autre histoire n'a bougé.
Si le script a signalé un doublon ou n'a pas pu insérer (`--no-insert`, repère introuvable),
coller manuellement l'entrée `'<slug>': { … },` depuis `.cache/<slug>.snippet.ts` dans
l'objet `storyDetails`, en respectant le format existant (repéré à l'étape 0).

## Étape 9 — Vérifier

Lancer `npm run build` (ou `npx tsc --noEmit` si plus rapide) et corriger toute erreur de
type/compilation. Confirmer ensuite à l'utilisateur : titre, slug, nombre de scènes, durée,
coordonnées, et chemin des images.

## Notes

- Contenu visible **en français** ; prompts d'images **en anglais**.
- `audioUrl` reste `null` (audio = phase 2).
- **Phase 2 (à ne pas implémenter)** : un clip ElevenLabs par scène,
  `public/stories/<slug>/scene-NN.mp3`, dont la durée réelle remplacera le timing estimé.
  Le nommage `scene-NN` et la structure actuelle sont déjà compatibles ; ne pas ajouter de
  champ hors du type `SceneAsset`/`StoryDetail` (cela casserait la compilation).
