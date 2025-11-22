'use client';

import { useState, useRef, useEffect } from 'react';
import type { StoryDetail } from '@/types/frontend';
import { SceneDisplay } from './SceneDisplay';
import { Button } from './ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface StoryPlayerProps {
  story: StoryDetail;
}

/**
 * Player narratif : lecture automatique avec images, texte et timing synchronisés
 */
export function StoryPlayer({ story }: StoryPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<number>(0); // Temps au moment de la pause

  const hasAudioUrl = !!story.audioUrl;
  // Mode audio seulement si URL existe ET audio prêt ET pas d'erreur
  const hasAudio = hasAudioUrl && audioReady && !audioError;
  const currentScene = story.scenes[currentSceneIndex];
  const totalScenes = story.scenes.length;
  const totalDuration = story.durationSec || story.scenes[totalScenes - 1]?.endSec || 90;

  // Démarrage automatique au montage
  useEffect(() => {
    // Démarrage automatique après 500ms
    const playTimer = setTimeout(() => {
      setIsPlaying(true);
      if (hasAudioUrl && audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.error('Erreur lecture audio:', err);
          setAudioError(true);
        });
      }
    }, 500);

    // Si audio pas prêt après 2 secondes, forcer mode fallback
    const fallbackTimer = setTimeout(() => {
      if (hasAudioUrl && !audioReady) {
        setAudioError(true);
      }
    }, 2000);

    return () => {
      clearTimeout(playTimer);
      clearTimeout(fallbackTimer);
    };
  }, [hasAudioUrl, audioReady, story.audioUrl]);

  // Mode audio : synchronisation des scènes
  useEffect(() => {
    if (!hasAudio || !isPlaying) return;

    const activeSceneIndex = story.scenes.findIndex(
      (scene) => currentTime >= scene.startSec && currentTime < scene.endSec
    );

    if (activeSceneIndex !== -1 && activeSceneIndex !== currentSceneIndex) {
      setCurrentSceneIndex(activeSceneIndex);
    }
  }, [currentTime, story.scenes, hasAudio, isPlaying, currentSceneIndex]);

  // Mode fallback : timer automatique avec progression fluide
  useEffect(() => {
    if (hasAudio || !isPlaying || !currentScene) {
      // Sauvegarder le temps actuel quand on met pause
      if (!isPlaying && currentTime > 0) {
        pausedTimeRef.current = currentTime;
      }
      return;
    }

    // Utiliser le temps de la pause si on reprend, sinon le début de la scène
    const resumeTime = pausedTimeRef.current > 0 && 
                       pausedTimeRef.current >= currentScene.startSec && 
                       pausedTimeRef.current < currentScene.endSec
      ? pausedTimeRef.current
      : currentScene.startSec;

    // Calculer la durée restante
    const timeIntoScene = resumeTime - currentScene.startSec;
    const remainingDuration = ((currentScene.endSec - currentScene.startSec) - timeIntoScene) * 1000;

    const startTime = Date.now();

    // Réinitialiser la pause
    pausedTimeRef.current = 0;

    // Mettre à jour le temps progressivement
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(resumeTime + elapsed);
    }, 100);

    // Passer à la scène suivante à la fin
    timerRef.current = setTimeout(() => {
      if (currentSceneIndex < totalScenes - 1) {
        setCurrentSceneIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentTime(totalDuration);
      }
    }, remainingDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasAudio, isPlaying, currentSceneIndex, currentScene, story.scenes, totalScenes, totalDuration]);

  const handlePlayPause = () => {
    if (hasAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentSceneIndex(0);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * totalDuration;

    // Réinitialiser la pause car on change manuellement le temps
    pausedTimeRef.current = newTime;

    if (hasAudio && audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else {
      setCurrentTime(newTime);
    }

    // Trouver la scène correspondante
    const sceneIndex = story.scenes.findIndex(
      (scene) => newTime >= scene.startSec && newTime < scene.endSec
    );
    if (sceneIndex !== -1) {
      setCurrentSceneIndex(sceneIndex);
    }
  };

  const handlePrevScene = () => {
    if (currentSceneIndex > 0) {
      const newIndex = currentSceneIndex - 1;
      setCurrentSceneIndex(newIndex);
      const newTime = story.scenes[newIndex].startSec;
      setCurrentTime(newTime);
      pausedTimeRef.current = 0; // Réinitialiser la pause
      if (hasAudio && audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  const handleNextScene = () => {
    if (currentSceneIndex < totalScenes - 1) {
      const newIndex = currentSceneIndex + 1;
      setCurrentSceneIndex(newIndex);
      const newTime = story.scenes[newIndex].startSec;
      setCurrentTime(newTime);
      pausedTimeRef.current = 0; // Réinitialiser la pause
      if (hasAudio && audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  const progress = (currentTime / totalDuration) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black">
      {/* Zone d'affichage - La scène prend tout l'espace disponible */}
      <div 
        className="relative flex-1 min-h-0 w-full overflow-hidden cursor-pointer"
        onClick={handlePlayPause}
      >
        {currentScene && <SceneDisplay scene={currentScene} key={currentScene.id} />}
      </div>

      {/* Contrôles en bas - Style player vidéo */}
      <div className="relative flex-shrink-0 bg-black">
        {/* Timeline avec marqueurs de scènes */}
        <div className="px-4 pt-3">
          <div
            className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-3 transition-all group"
            onClick={handleProgressClick}
          >
            {/* Barre de progression */}
            <div
              className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-300 group-hover:bg-red-500"
              style={{ width: `${progress}%` }}
            />
            
            {/* Marqueurs de scènes */}
            <div className="absolute inset-0">
              {story.scenes.map((scene, idx) => {
                const sceneProgress = (scene.startSec / totalDuration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-px bg-white/40"
                    style={{ left: `${sceneProgress}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Boutons de contrôle */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayPause}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              onClick={handlePrevScene}
              disabled={currentSceneIndex === 0}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleNextScene}
              disabled={currentSceneIndex === totalScenes - 1}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Temps */}
            <div className="text-white/80 text-sm ml-2">
              {formatTime(currentTime)}
              {' / '}
              {formatTime(totalDuration)}
            </div>
          </div>

          {/* Info scène */}
          <div className="text-white/60 text-sm">
            Scène {currentSceneIndex + 1} / {totalScenes}
            {currentScene && <span className="ml-2">· {currentScene.label}</span>}
          </div>
        </div>

        {/* Indicateurs de scènes */}
        <div className="flex justify-center gap-1 pb-3 px-4">
          {story.scenes.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === currentSceneIndex
                  ? 'w-6 bg-red-600'
                  : idx < currentSceneIndex
                  ? 'w-3 bg-white/60'
                  : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Audio HTML (caché) */}
      {hasAudioUrl && story.audioUrl && (
        <audio
          ref={audioRef}
          src={story.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          onCanPlay={() => setAudioReady(true)}
          onError={(e) => {
            console.error('Erreur chargement audio:', e);
            setAudioError(true);
          }}
          preload="auto"
        />
      )}
    </div>
  );
}
