'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { StoryDetail, Lang } from '@/types/frontend';
import { SceneDisplay } from './SceneDisplay';
import { Button } from './ui/button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
} from 'lucide-react';

interface StoryPlayerProps {
  story: StoryDetail;
  lang?: Lang;
}

/**
 * Player narratif : un clip audio par scène (ElevenLabs).
 * - Scène avec audio  → on joue le clip, on enchaîne à la fin (événement `ended`).
 * - Scène sans audio  → défilement minuté sur startSec/endSec (fallback).
 * La durée de chaque scène = la durée de son clip, donc plus aucun calcul de sync.
 */
export function StoryPlayer({ story, lang = 'fr' }: StoryPlayerProps) {
  const scenes = story.scenes;
  const totalScenes = scenes.length;
  const en = lang === 'en';

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioErr, setAudioErr] = useState<Record<string, boolean>>({});

  const audioRef = useRef<HTMLAudioElement>(null);
  const elapsedRef = useRef(0); // secondes écoulées dans la scène (mode minuté)
  const pendingSeekRef = useRef(0); // offset à appliquer à l'audio au (re)montage
  const timeRef = useRef(0);

  const scene = scenes[index];
  const lastEnd = scenes[totalScenes - 1]?.endSec || 0;
  const totalDuration = story.durationSec || lastEnd || 1;
  const hasAnyAudio = scenes.some((s) => s.audioUrl || s.audioUrlEn);
  const sceneLabel = scene ? (en && scene.labelEn ? scene.labelEn : scene.label) : '';
  // Clip de la langue active (repli sur le FR si pas de version EN).
  const sceneClip = scene
    ? (en ? scene.audioUrlEn ?? scene.audioUrl : scene.audioUrl) ?? null
    : null;
  const audioKey = scene ? `${scene.id}-${lang}` : '';
  const sceneAudioUrl = sceneClip && !audioErr[audioKey] ? sceneClip : null;

  const setTime = (t: number) => {
    timeRef.current = t;
    setCurrentTime(t);
  };

  // Réinitialise tout quand on change d'histoire.
  useEffect(() => {
    setIndex(0);
    setIsPlaying(true);
    setAudioErr({});
    elapsedRef.current = 0;
    pendingSeekRef.current = 0;
    setTime(0);
  }, [story.id]);

  const advance = useCallback(() => {
    elapsedRef.current = 0;
    pendingSeekRef.current = 0;
    setIndex((i) => {
      if (i < totalScenes - 1) return i + 1;
      setIsPlaying(false);
      return i;
    });
  }, [totalScenes]);

  // Applique le volume / mute à l'élément audio.
  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.volume = volume;
      a.muted = isMuted;
    }
  }, [volume, isMuted, index]);

  // Mode minuté (scènes sans clip audio).
  useEffect(() => {
    if (!isPlaying || !scene || sceneAudioUrl) return;
    const dur = Math.max(0.1, scene.endSec - scene.startSec);
    const id = setInterval(() => {
      elapsedRef.current += 0.1;
      if (elapsedRef.current >= dur) {
        setTime(scene.endSec);
        advance();
      } else {
        setTime(scene.startSec + elapsedRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, index, sceneAudioUrl, scene, advance]);

  const togglePlay = () => {
    setIsPlaying((p) => {
      const next = !p;
      const a = audioRef.current;
      if (sceneAudioUrl && a) {
        if (next) a.play().catch(() => {});
        else a.pause();
      }
      return next;
    });
  };

  const goPrev = () => {
    if (index <= 0) return;
    elapsedRef.current = 0;
    pendingSeekRef.current = 0;
    setTime(scenes[index - 1].startSec);
    setIndex(index - 1);
  };

  const goNext = () => {
    if (index >= totalScenes - 1) return;
    elapsedRef.current = 0;
    pendingSeekRef.current = 0;
    setTime(scenes[index + 1].startSec);
    setIndex(index + 1);
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const t = pct * totalDuration;
    let idx = scenes.findIndex((s) => t >= s.startSec && t < s.endSec);
    if (idx === -1) idx = totalScenes - 1;
    const offset = Math.max(0, t - scenes[idx].startSec);
    setTime(t);
    if (idx === index) {
      elapsedRef.current = offset;
      const a = audioRef.current;
      if (sceneAudioUrl && a) a.currentTime = offset;
    } else {
      elapsedRef.current = offset;
      pendingSeekRef.current = offset;
      setIndex(idx);
    }
  };

  const toggleMute = () => setIsMuted((m) => !m);
  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
  };
  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const progress = (currentTime / totalDuration) * 100;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black">
      {/* Zone d'affichage */}
      <div
        className="relative flex-1 min-h-0 w-full overflow-hidden cursor-pointer"
        onClick={togglePlay}
      >
        {scene && <SceneDisplay scene={scene} lang={lang} key={`${scene.id}-${lang}`} />}
      </div>

      {/* Contrôles */}
      <div className="relative flex-shrink-0 bg-black">
        {/* Timeline */}
        <div className="px-4 pt-3">
          <div
            className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-3 transition-all group"
            onClick={onSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-150 group-hover:bg-red-500"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0">
              {scenes.map((s, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-px bg-white/40"
                  style={{ left: `${(s.startSec / totalDuration) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={togglePlay}
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
              onClick={goPrev}
              disabled={index === 0}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={goNext}
              disabled={index === totalScenes - 1}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <div className="text-white/80 text-sm ml-2">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
          </div>

          {/* Volume + info scène */}
          <div className="flex items-center gap-4">
            {hasAnyAudio && (
              <div className="group/vol flex items-center gap-2">
                <Button
                  onClick={toggleMute}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
                >
                  <VolumeIcon className="h-5 w-5" />
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={onVolume}
                  aria-label="Volume"
                  className="volume-slider hidden w-0 opacity-0 transition-all duration-200 sm:block sm:w-20 sm:opacity-100 group-hover/vol:w-24"
                  style={{ ['--vol' as string]: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            )}

            <div className="text-white/60 text-sm">
              {en ? 'Scene' : 'Scène'} {index + 1} / {totalScenes}
              {scene && <span className="ml-2">· {sceneLabel}</span>}
            </div>
          </div>
        </div>

        {/* Indicateurs de scènes */}
        <div className="flex justify-center gap-1 pb-3 px-4">
          {scenes.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === index
                  ? 'w-6 bg-red-600'
                  : idx < index
                  ? 'w-3 bg-white/60'
                  : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Audio (un clip par scène) */}
      {hasAnyAudio && (
        <audio
          key={audioKey}
          ref={audioRef}
          src={sceneAudioUrl ?? undefined}
          preload="auto"
          onCanPlay={() => {
            const a = audioRef.current;
            if (!a) return;
            a.volume = volume;
            a.muted = isMuted;
            if (pendingSeekRef.current) {
              a.currentTime = pendingSeekRef.current;
              pendingSeekRef.current = 0;
            }
            if (isPlaying) a.play().catch(() => setIsPlaying(false));
          }}
          onTimeUpdate={() => {
            const a = audioRef.current;
            if (a && scene) setTime(scene.startSec + a.currentTime);
          }}
          onEnded={advance}
          onError={() => {
            if (scene) {
              elapsedRef.current = Math.max(0, timeRef.current - scene.startSec);
              setAudioErr((m) => ({ ...m, [audioKey]: true }));
            }
          }}
        />
      )}
    </div>
  );
}
