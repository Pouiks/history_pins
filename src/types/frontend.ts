// Types utilisés côté frontend pour l'affichage et la logique métier

/**
 * Représente un point sur la carte (version minimale pour l'affichage)
 */
export interface StoryMapPoint {
  id: string;
  title: string;
  slug: string;
  latitude: number;
  longitude: number;
  period?: string | null;
}

/**
 * Représente une scène avec ses assets (image, texte, timing)
 */
export interface SceneAsset {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  imageUrl: string | null;
  textExcerpt?: string | null;
}

/**
 * Représente une story complète avec toutes ses données pour le player
 */
export interface StoryDetail {
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
}

