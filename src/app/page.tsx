'use client';

import { useState } from 'react';
import { usePublishedStories } from '@/hooks/usePublishedStories';
import { StoryModal } from '@/components/StoryModal';
import type { StoryMapPoint } from '@/types/frontend';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import dynamique pour éviter le SSR avec Leaflet
const MapView = dynamic(
  () => import('@/components/MapView').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const { stories, loading, error } = usePublishedStories();
  const [selectedStory, setSelectedStory] = useState<StoryMapPoint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectStory = (story: StoryMapPoint) => {
    setSelectedStory(story);
    setModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Petit délai avant de réinitialiser la story sélectionnée
      setTimeout(() => setSelectedStory(null), 300);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        <div className="text-center space-y-8">
          {/* Animation de la carte avec marqueurs */}
          <div className="relative w-32 h-32 mx-auto">
            {/* Cercle de carte */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 opacity-10 animate-pulse" />
            <div className="absolute inset-4 rounded-full border-2 border-blue-500/30 animate-ping" />

            {/* Marqueurs animés */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full animate-bounce shadow-lg shadow-red-500/50"
                  style={{ animationDelay: '0ms' }} />
                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-lg shadow-blue-500/50"
                  style={{ animationDelay: '200ms' }} />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce shadow-lg shadow-purple-500/50"
                  style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>

          {/* Texte */}
          <div className="space-y-3">
            <h2 className="text-slate-900 text-2xl font-bold">
              History Pins 📌 </h2>
            <p className="text-slate-600 text-lg">
              Chargement des histoires de Paris
            </p>
            <div className="flex justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-red-600 text-xl font-semibold mb-2">
            Erreur de chargement
          </h2>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500 mt-4">
            Vérifiez que les variables d'environnement Supabase sont correctement configurées.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      {/* Carte */}
      <div className="w-full h-full">
        <MapView stories={stories} onSelectStory={handleSelectStory} />
      </div>

      {/* Modale de story */}
      <StoryModal
        story={selectedStory}
        open={modalOpen}
        onOpenChange={handleCloseModal}
      />

      {/* Info overlay */}
      <div className="absolute top-4 left-20 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-xs z-[400] pointer-events-auto">
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          History Pins 📌
        </h1>
        <p className="text-sm text-slate-600">
          Découvrez l'histoire de Paris à travers {stories.length} récit{stories.length > 1 ? 's' : ''} immersif{stories.length > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Cliquez sur un marqueur pour commencer
        </p>
      </div>
    </main>
  );
}

