'use client';

import { useState, useEffect } from 'react';
import { getStoryWithAssets } from '@/services/storyService';
import type { StoryDetail } from '@/types/frontend';

interface UseStoryDetailResult {
  story: StoryDetail | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook pour charger une story complète avec tous ses assets
 */
export function useStoryDetail(
  storyIdOrSlug: string | null
): UseStoryDetailResult {
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storyIdOrSlug) {
      setStory(null);
      setLoading(false);
      setError(null);
      return;
    }

    async function loadStory() {
      try {
        setLoading(true);
        setError(null);
        const data = await getStoryWithAssets(storyIdOrSlug);
        if (!data) {
          setError('Story non trouvée');
        }
        setStory(data);
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

    loadStory();
  }, [storyIdOrSlug]);

  return { story, loading, error };
}

