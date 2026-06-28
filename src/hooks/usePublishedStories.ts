'use client';

import { useState, useEffect } from 'react';
import {
  getPublishedStories,
  getPublishedStoriesSync,
} from '@/services/storyService';
import type { StoryMapPoint } from '@/types/frontend';

interface UsePublishedStoriesResult {
  stories: StoryMapPoint[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook pour charger les histoires publiées.
 * Les données étant bundlées (pas de backend), elles sont disponibles
 * DÈS le premier rendu (init synchrone) → les pins s'affichent en même
 * temps que la carte, sans écran d'attente. Un rafraîchissement async
 * reste possible si la source devient distante un jour.
 */
export function usePublishedStories(): UsePublishedStoriesResult {
  const [stories, setStories] = useState<StoryMapPoint[]>(() =>
    getPublishedStoriesSync()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublishedStories()
      .then(setStories)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      );
  }, []);

  return { stories, loading: false, error };
}
