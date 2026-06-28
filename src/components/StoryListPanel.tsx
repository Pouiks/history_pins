'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StoryMapPoint, Lang } from '@/types/frontend';
import {
  Compass,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  X,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

// Normalise (sans accents, minuscule) pour une recherche tolérante.
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface StoryListPanelProps {
  stories: StoryMapPoint[];
  activeId?: string | null;
  onSelect: (story: StoryMapPoint) => void;
  onHover?: (id: string | null) => void;
  /** Appelé quand la recherche change : permet de recadrer la carte. */
  onResults?: (results: StoryMapPoint[], query: string) => void;
  lang?: Lang;
  /** Époques disponibles (avec compte) pour le filtre. */
  eras?: { key: string; label: string; count: number }[];
  selectedEras?: string[];
  onErasChange?: (next: string[]) => void;
}

/**
 * Panneau de navigation : liste parcourable des histoires.
 * Cliquer recentre la carte et ouvre le récit ; survoler fait clignoter le marqueur.
 */
export function StoryListPanel({
  stories,
  activeId,
  onSelect,
  onHover,
  onResults,
  lang,
  eras = [],
  selectedEras = [],
  onErasChange,
}: StoryListPanelProps) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleEra = (key: string) => {
    const next = selectedEras.includes(key)
      ? selectedEras.filter((k) => k !== key)
      : [...selectedEras, key];
    onErasChange?.(next);
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return stories;
    return stories.filter((s) => {
      const hay = s.keywords ?? normalize([s.title, s.period, s.locationName].filter(Boolean).join(' '));
      return hay.includes(q);
    });
  }, [stories, query]);

  // Recadre la carte sur les résultats quand on tape une recherche.
  useEffect(() => {
    onResults?.(filtered, query.trim());
  }, [filtered, query, onResults]);

  return (
    <div className="absolute top-4 left-4 z-[500] w-[88vw] max-w-sm">
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-xl shadow-slate-900/10 backdrop-blur-md">
        {/* En-tête / marque */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
            <Compass className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-base font-bold leading-tight text-slate-900">
              History Pins
            </span>
            <span className="block text-xs text-slate-500">
              {query
                ? `${filtered.length} / ${stories.length} résultat${filtered.length > 1 ? 's' : ''}`
                : `${stories.length} récit${stories.length > 1 ? 's' : ''} en France`}
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
              open ? '' : '-rotate-90'
            }`}
          />
        </button>

        {/* Liste */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden border-t border-slate-200/70">
            {/* Recherche : ville ou mots-clés */}
            <div className="p-2 pb-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher (ville, mot-clé…)"
                  className="w-full rounded-xl border border-slate-200 bg-white/70 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Effacer la recherche"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-900/5 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre par époque : bouton + menu déroulant à cases à cocher */}
            {eras.length > 0 && (
              <div className="px-2 pb-1">
                <button
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedEras.length
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">
                    {selectedEras.length === 0
                      ? 'Filtrer par époque'
                      : `${selectedEras.length} époque${selectedEras.length > 1 ? 's' : ''}`}
                  </span>
                  {selectedEras.length > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onErasChange?.([]);
                      }}
                      className="rounded-md p-0.5 text-blue-600 hover:bg-blue-100"
                      aria-label="Réinitialiser le filtre"
                    >
                      <X className="h-4 w-4" />
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {filterOpen && (
                  <ul className="mt-1 space-y-0.5 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm">
                    {eras.map((e) => {
                      const checked = selectedEras.includes(e.key);
                      return (
                        <li key={e.key}>
                          <button
                            type="button"
                            onClick={() => toggleEra(e.key)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-slate-900/5"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                checked
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="flex-1 text-slate-700">{e.label}</span>
                            <span className="text-xs text-slate-400">{e.count}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <ul className="story-scroll max-h-[55vh] space-y-1 overflow-y-auto p-2 pt-1">
              {filtered.map((story) => {
                const active = story.id === activeId;
                return (
                  <li key={story.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(story)}
                      onMouseEnter={() => onHover?.(story.id)}
                      onMouseLeave={() => onHover?.(null)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                          : 'hover:bg-slate-900/5'
                      }`}
                    >
                      <MapPin
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-white' : 'text-blue-600'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[0.95rem] font-semibold leading-tight">
                          {lang === 'en' && story.titleEn ? story.titleEn : story.title}
                        </span>
                        {story.period && (
                          <span
                            className={`block truncate text-xs ${
                              active ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            {story.period}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                          active ? 'text-white' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  </li>
                );
              })}

              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  {query
                    ? `Aucun résultat pour « ${query} »`
                    : 'Aucune histoire pour le moment.'}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
