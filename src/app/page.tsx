'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePublishedStories } from '@/hooks/usePublishedStories';
import { StoryModal } from '@/components/StoryModal';
import { StoryListPanel } from '@/components/StoryListPanel';
import type { StoryMapPoint, Lang } from '@/types/frontend';
import { ERAS } from '@/lib/eras';
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
  const [focusedStory, setFocusedStory] = useState<StoryMapPoint | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fitTo, setFitTo] = useState<StoryMapPoint[] | null>(null);
  const [lang, setLang] = useState<Lang>('fr');
  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Époques présentes dans le contenu, avec leur nombre d'histoires.
  const eraChips = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of stories) if (s.era) counts[s.era] = (counts[s.era] || 0) + 1;
    return ERAS.filter((e) => counts[e.key]).map((e) => ({
      key: e.key,
      label: e.label,
      count: counts[e.key],
    }));
  }, [stories]);

  // Histoires visibles selon les époques cochées (tout par défaut = aucune cochée).
  const visibleStories = useMemo(
    () =>
      selectedEras.length === 0
        ? stories
        : stories.filter((s) => s.era && selectedEras.includes(s.era)),
    [stories, selectedEras]
  );

  // Quand une recherche est active, on cadre la carte sur les résultats.
  const handleResults = useCallback(
    (results: StoryMapPoint[], query: string) => {
      setFitTo(query ? results : null);
    },
    []
  );

  // Changement de filtre d'époques : recadre la carte sur la sélection.
  const handleEras = useCallback(
    (next: string[]) => {
      setSelectedEras(next);
      setFitTo(
        next.length ? stories.filter((s) => s.era && next.includes(s.era)) : null
      );
    },
    [stories]
  );

  // Au montage : langue mémorisée si choix manuel, sinon langue du navigateur.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hp_lang');
      if (saved === 'fr' || saved === 'en') {
        setLang(saved);
        return;
      }
      const nav = (navigator.language || '').toLowerCase();
      setLang(nav.startsWith('fr') ? 'fr' : 'en');
    } catch {
      /* localStorage indisponible : on garde le FR par défaut */
    }
  }, []);

  // Bascule manuelle : applique + mémorise le choix.
  const changeLang = useCallback((l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('hp_lang', l);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSelectStory = (story: StoryMapPoint) => {
    setSelectedStory(story);
    setFocusedStory(story);
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
              Chargement des histoires de France
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
            Vérifiez que les variables d&apos;environnement Supabase sont correctement configurées.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Carte */}
      <div className="w-full h-full">
        <MapView
          stories={visibleStories}
          onSelectStory={handleSelectStory}
          focusedStory={focusedStory}
          hoveredId={hoveredId}
          fitTo={fitTo}
          lang={lang}
        />
      </div>

      {/* Panneau de navigation */}
      <StoryListPanel
        stories={visibleStories}
        activeId={selectedStory?.id}
        onSelect={handleSelectStory}
        onHover={setHoveredId}
        onResults={handleResults}
        lang={lang}
        eras={eraChips}
        selectedEras={selectedEras}
        onErasChange={handleEras}
      />

      {/* Bascule de langue FR / EN */}
      <div className="absolute right-4 top-4 z-[500] flex overflow-hidden rounded-full border border-white/60 bg-white/85 shadow-lg backdrop-blur-md">
        {(['fr', 'en'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => changeLang(l)}
            className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
              lang === l
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-900/5'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Indice en bas + lien crawlable vers la liste complète (SEO) */}
      <div className="absolute bottom-4 left-1/2 z-[400] flex -translate-x-1/2 items-center gap-2">
        <div className="pointer-events-none rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-lg backdrop-blur-md">
          {lang === 'en'
            ? 'Click a point on the map to explore a story'
            : 'Cliquez sur un point de la carte pour explorer un récit'}
        </div>
        <Link
          href={lang === 'en' ? '/en/histoires' : '/histoires'}
          className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md transition-colors hover:text-blue-700"
        >
          {lang === 'en' ? 'All stories' : 'Toutes les histoires'}
        </Link>
      </div>

      {/* Modale de story */}
      <StoryModal
        story={selectedStory}
        open={modalOpen}
        onOpenChange={handleCloseModal}
        lang={lang}
      />
    </main>
  );
}

