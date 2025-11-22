'use client';

import type { SceneAsset } from '@/types/frontend';

interface SceneDisplayProps {
  scene: SceneAsset;
}

/**
 * Affiche une scène : image en plein écran + texte en bas
 */
export function SceneDisplay({ scene }: SceneDisplayProps) {
  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Image de fond */}
      {scene.imageUrl ? (
        <img
          src={scene.imageUrl}
          alt={scene.label}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-white/40 text-lg">{scene.label}</p>
        </div>
      )}

      {/* Overlay pour lisibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Texte de la scène en bas */}
      {scene.textExcerpt && (
        <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
          <p className="text-white text-xl leading-relaxed font-normal max-w-4xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {scene.textExcerpt}
          </p>
        </div>
      )}
    </div>
  );
}
