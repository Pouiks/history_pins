import type {
  DbStory,
  DbStoryVersion,
  DbStoryAudio,
  DbStoryScene,
  DbStoryImage,
} from '@/types/database';
import type { StoryMapPoint, StoryDetail, SceneAsset } from '@/types/frontend';

/**
 * Convertit une story DB en point sur la carte
 */
export function dbStoryToMapPoint(story: DbStory): StoryMapPoint {
  return {
    id: story.id,
    title: story.title,
    slug: story.slug,
    latitude: story.latitude,
    longitude: story.longitude,
    period: story.period,
  };
}

/**
 * Assemble les données brutes en SceneAsset
 */
export function buildSceneAsset(
  scene: DbStoryScene,
  image: DbStoryImage | null
): SceneAsset {
  return {
    id: scene.id,
    label: scene.label,
    startSec: scene.start_sec,
    endSec: scene.end_sec,
    imageUrl: image?.image_url || null,
    // Utilise text_excerpt (texte narratif éloquent) en priorité
    textExcerpt: scene.text_excerpt || scene.description || null,
  };
}

/**
 * Assemble une StoryDetail complète à partir des données DB
 */
export function buildStoryDetail(
  story: DbStory,
  version: DbStoryVersion,
  audio: DbStoryAudio | null,
  scenes: SceneAsset[]
): StoryDetail {
  return {
    id: story.id,
    title: story.title,
    slug: story.slug,
    locationName: story.location_name,
    latitude: story.latitude,
    longitude: story.longitude,
    period: story.period,
    scriptText: version.script_text,
    durationSec: audio?.duration_sec || version.duration_estimated_sec || null,
    audioUrl: audio?.audio_url || null,
    scenes,
  };
}

