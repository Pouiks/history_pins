// Page-liste de tous les récits, groupés par époque.
// Hub d'indexation : une seule page qui pointe (liens crawlables) vers les ~93
// articles, en FR et en EN.

import Link from 'next/link';
import type { Lang } from '@/types/frontend';
import { allStories, pickTitle } from '@/lib/stories.server';
import { storyPath } from '@/lib/site';
import { ERAS, eraOf } from '@/lib/eras';

const T = {
  fr: {
    title: 'Toutes les histoires de France',
    intro:
      'Explorez chaque récit géolocalisé, de la préhistoire à nos jours. Cliquez pour lire l’histoire complète, illustrée scène par scène.',
    map: '← Retour à la carte',
    count: (n: number) => `${n} récits`,
    other: 'Indéterminée',
  },
  en: {
    title: 'All the stories of France',
    intro:
      'Explore every geolocated story, from prehistory to today. Click to read the full account, illustrated scene by scene.',
    map: '← Back to the map',
    count: (n: number) => `${n} stories`,
    other: 'Undated',
  },
} as const;

export function StoriesIndex({ lang }: { lang: Lang }) {
  const t = T[lang];
  const stories = allStories();

  // Regroupe par époque, dans l'ordre chronologique des ERAS.
  const groups = ERAS.map((era) => ({
    key: era.key,
    label: era.label,
    items: stories.filter((s) => eraOf(s.period) === era.key),
  })).filter((g) => g.items.length > 0);
  const undated = stories.filter((s) => eraOf(s.period) === 'autre');
  if (undated.length) groups.push({ key: 'autre', label: t.other, items: undated });

  return (
    <div className="min-h-screen bg-[#f7f2e8] text-[#2a2724]">
      <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <nav className="mb-8 text-xs uppercase tracking-[0.12em] text-[#a8967c]">
          <Link href="/" className="hover:text-[#9a3412]">
            {t.map}
          </Link>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-3xl font-semibold leading-tight text-[#221f1b] md:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-[#3a352e]">
            {t.intro}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[#a8967c]">
            {t.count(stories.length)}
          </p>
        </header>

        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-3 border-b border-[#e3d9c6] pb-1 font-serif text-xl font-semibold text-[#221f1b]">
                {g.label}
              </h2>
              <ul className="space-y-2">
                {g.items.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={storyPath(s.slug, lang)}
                      className="group flex items-baseline justify-between gap-3 py-1"
                    >
                      <span className="text-[1.02rem] text-[#2a2724] group-hover:text-[#9a3412]">
                        {pickTitle(s, lang)}
                      </span>
                      <span className="shrink-0 text-xs text-[#a8967c]">
                        {[s.period, s.locationName].filter(Boolean).join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
