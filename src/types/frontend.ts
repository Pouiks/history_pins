// Types utilisés côté frontend pour l'affichage et la logique métier

/** Langue d'affichage de l'application. */
export type Lang = 'fr' | 'en';

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
  locationName?: string | null;
  /** Titre anglais (mode EN). */
  titleEn?: string | null;
  /** Clé d'époque (Antiquité, Moyen Âge…) pour le filtre. */
  era?: string;
  /** Texte normalisé (sans accents, minuscule) pour la recherche (FR + EN). */
  keywords?: string;
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
  audioUrl?: string | null;
  textExcerpt?: string | null;
  // Variantes anglaises (mode EN ; repli sur le FR si absentes)
  labelEn?: string | null;
  textExcerptEn?: string | null;
  audioUrlEn?: string | null;
}

/**
 * Représente une story complète avec toutes ses données pour le player
 */
export interface StoryDetail {
  id: string;
  title: string;
  titleEn?: string | null;
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

