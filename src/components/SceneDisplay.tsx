'use client';

import { useState } from 'react';
import type { SceneAsset, Lang } from '@/types/frontend';

interface SceneDisplayProps {
  scene: SceneAsset;
  lang?: Lang;
}

/**
 * Affiche une scène : image en plein écran + texte en bas.
 * Si l'image est absente ou ne charge pas, on retombe sur un fond dégradé.
 */
export function SceneDisplay({ scene, lang = 'fr' }: SceneDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(scene.imageUrl) && !imgError;
  const en = lang === 'en';
  const label = en && scene.labelEn ? scene.labelEn : scene.label;
  const text = en && scene.textExcerptEn ? scene.textExcerptEn : scene.textExcerpt;

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Image de fond */}
      {showImage ? (
        <img
          src={scene.imageUrl as string}
          alt={label}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover zoom-in-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-white/40 text-base sm:text-lg">{label}</p>
        </div>
      )}

      {/* Overlay pour lisibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Texte de la scène en bas */}
      {text && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 sm:p-6 md:p-8 z-10">
          <p className="text-white text-[0.8rem] sm:text-base md:text-lg leading-snug sm:leading-relaxed font-normal max-w-3xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}
