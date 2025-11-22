'use client';

import type { StoryMapPoint } from '@/types/frontend';
import { useStoryDetail } from '@/hooks/useStoryDetail';
import { StoryPlayer } from './StoryPlayer';
import {
  Dialog,
  DialogContentFullscreen,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Loader2 } from 'lucide-react';

interface StoryModalProps {
  story: StoryMapPoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modale plein écran pour afficher une story avec son player
 */
export function StoryModal({ story, open, onOpenChange }: StoryModalProps) {
  const { story: storyDetail, loading, error } = useStoryDetail(
    story?.id || null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentFullscreen className="p-0 gap-0">
        {loading && (
          <>
            <DialogTitle className="sr-only">Chargement de l'histoire</DialogTitle>
            <DialogDescription className="sr-only">
              Veuillez patienter pendant le chargement de l'histoire
            </DialogDescription>
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-950 via-gray-900 to-black">
              <div className="text-center space-y-8">
                {/* Animation élégante avec cercles concentriques */}
                <div className="relative w-24 h-24 mx-auto">
                  {/* Cercle extérieur pulsant */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
                  {/* Cercle moyen */}
                  <div className="absolute inset-2 rounded-full border-2 border-blue-400/40 animate-pulse" />
                  {/* Cercle intérieur tournant */}
                  <div className="absolute inset-4 rounded-full border-t-2 border-l-2 border-blue-500 animate-spin" />
                  {/* Point central */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50" />
                  </div>
                </div>
                
                {/* Texte avec animation */}
                <div className="space-y-2">
                  <p className="text-white text-lg font-medium animate-pulse">
                    Chargement de l'histoire
                  </p>
                  <div className="flex justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                
                {/* Barre de progression stylée */}
                <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 animate-pulse" 
                       style={{ 
                         width: '60%',
                         animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                       }} 
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <>
            <DialogTitle className="sr-only">Erreur de chargement</DialogTitle>
            <DialogDescription className="sr-only">{error}</DialogDescription>
            <div className="flex items-center justify-center h-full bg-black">
              <div className="text-center p-8">
                <p className="text-red-400 text-lg mb-2">
                  Erreur de chargement
                </p>
                <p className="text-white/70">{error}</p>
              </div>
            </div>
          </>
        )}

        {!loading && !error && storyDetail && (
          <div className="w-full h-full flex flex-col">
            {/* Header avec infos */}
            <div className="flex-shrink-0 bg-gradient-to-b from-gray-900 to-gray-800 px-6 py-4 border-b border-white/10">
              <DialogTitle className="text-white text-xl font-bold mb-1">
                {storyDetail.title}
              </DialogTitle>
              <DialogDescription className="flex gap-4 text-white/60 text-sm">
                {storyDetail.period && <span>📅 {storyDetail.period}</span>}
                {storyDetail.locationName && (
                  <span>📍 {storyDetail.locationName}</span>
                )}
              </DialogDescription>
            </div>

            {/* Player */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <StoryPlayer story={storyDetail} />
            </div>
          </div>
        )}
      </DialogContentFullscreen>
    </Dialog>
  );
}

