'use client';

import { useState, useEffect } from 'react';
import { getPublishedStories } from '@/services/storyService';
import type { StoryMapPoint } from '@/types/frontend';

interface UsePublishedStoriesResult {
  stories: StoryMapPoint[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook pour charger toutes les stories publiées
 */
export function usePublishedStories(): UsePublishedStoriesResult {
  const [stories, setStories] = useState<StoryMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStories() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublishedStories();
        setStories(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Une erreur est survenue lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, []);

  return { stories, loading, error };
}

