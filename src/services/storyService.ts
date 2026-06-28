import { mapPoints, storyDetails } from '@/content/stories';
import type { StoryMapPoint, StoryDetail } from '@/types/frontend';

/**
 * Récupère toutes les histoires publiées pour affichage sur la carte.
 * Lit la source de contenu locale (plus de dépendance Supabase).
 */
export async function getPublishedStories(): Promise<StoryMapPoint[]> {
  return mapPoints;
}

/**
 * Version synchrone : les histoires sont bundlées, donc disponibles
 * immédiatement (pas d'attente au premier rendu de la carte).
 */
export function getPublishedStoriesSync(): StoryMapPoint[] {
  return mapPoints;
}

/**
 * Charge une histoire complète avec tous ses assets pour le player.
 * @param storyIdOrSlug - ID ou slug de l'histoire
 */
export async function getStoryWithAssets(
  storyIdOrSlug: string
): Promise<StoryDetail | null> {
  return (
    storyDetails[storyIdOrSlug] ??
    Object.values(storyDetails).find((s) => s.slug === storyIdOrSlug) ??
    null
  );
}
