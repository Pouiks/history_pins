// Article server-rendered d'un récit — la page indexable par Google.
// Rendu 100 % HTML (pas de 'use client') : le texte est dans la source.
// Palette éditoriale (crème / encre / serif) cohérente avec la carte.

import Link from 'next/link';
import type { Lang, StoryDetail } from '@/types/frontend';
import {
  pickTitle,
  storyBody,
  fullText,
  relatedStories,
} from '@/lib/stories.server';
import { getArticleMarkdown, stripMarkdown } from '@/lib/articles';
import { Markdown } from '@/components/Markdown';
import {
  SITE_NAME,
  storyPath,
  indexPath,
  absUrl,
  metaDescription,
} from '@/lib/site';

interface Props {
  story: StoryDetail;
  lang: Lang;
}

const T = {
  fr: {
    home: 'Carte',
    all: 'Toutes les histoires',
    onMap: 'Voir sur la carte',
    related: 'À proximité',
    other: 'Autre langue',
    backTop: 'Explorer la carte de France',
    gallery: 'En images',
  },
  en: {
    home: 'Map',
    all: 'All stories',
    onMap: 'View on the map',
    related: 'Nearby',
    other: 'Other language',
    backTop: 'Explore the map of France',
    gallery: 'In pictures',
  },
} as const;

export function StoryArticle({ story, lang }: Props) {
  const t = T[lang];
  const title = pickTitle(story, lang);
  const { scenes } = storyBody(story, lang);
  const related = relatedStories(story.slug, 4);
  const hero = scenes.find((s) => s.imageUrl)?.imageUrl ?? null;
  const otherLang: Lang = lang === 'en' ? 'fr' : 'en';

  // Article long rédigé à la main (si présent) : il devient le corps de la page.
  const article = getArticleMarkdown(story.slug, lang);
  const bodyText = article ? stripMarkdown(article) : fullText(story, lang);
  const galleryScenes = scenes.filter((s) => s.imageUrl);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description: metaDescription(bodyText),
        inLanguage: lang,
        ...(hero ? { image: absUrl(hero) } : {}),
        articleBody: bodyText,
        mainEntityOfPage: absUrl(storyPath(story.slug, lang)),
        author: { '@type': 'Organization', name: SITE_NAME },
        publisher: { '@type': 'Organization', name: SITE_NAME },
      },
      {
        '@type': 'Place',
        name: story.locationName || title,
        ...(story.locationName ? { address: story.locationName } : {}),
        geo: {
          '@type': 'GeoCoordinates',
          latitude: story.latitude,
          longitude: story.longitude,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t.all,
            item: absUrl(indexPath(lang)),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: absUrl(storyPath(story.slug, lang)),
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f7f2e8] text-[#2a2724]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        {/* Fil d'Ariane + bascule de langue */}
        <nav className="mb-8 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[#a8967c]">
          <span className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#9a3412]">
              {t.home}
            </Link>
            <span aria-hidden>/</span>
            <Link href={indexPath(lang)} className="hover:text-[#9a3412]">
              {t.all}
            </Link>
          </span>
          <Link
            href={storyPath(story.slug, otherLang)}
            hrefLang={otherLang}
            className="rounded border border-[#d9cdb6] px-2 py-1 font-semibold text-[#6f6453] hover:border-[#9a3412] hover:text-[#9a3412]"
          >
            {otherLang.toUpperCase()}
          </Link>
        </nav>

        {/* En-tête */}
        <header className="mb-8">
          {story.period && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#a8967c]">
              {story.period}
              {story.locationName ? ` · ${story.locationName}` : ''}
            </p>
          )}
          <h1 className="font-serif text-3xl font-semibold leading-tight text-[#221f1b] md:text-4xl">
            {title}
          </h1>
        </header>

        {article ? (
          /* Article rédigé : image d'ouverture + texte riche + galerie. */
          <div>
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero}
                alt={title}
                loading="eager"
                className="mb-8 w-full rounded-lg border border-[#e3d9c6] object-cover shadow-sm"
              />
            )}
            <Markdown content={article} />

            {galleryScenes.length > 1 && (
              <section className="mt-12">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#a8967c]">
                  {t.gallery}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {galleryScenes.map((sc) => (
                    <figure key={sc.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sc.imageUrl!}
                        alt={sc.label || title}
                        loading="lazy"
                        className="w-full rounded-lg border border-[#e3d9c6] object-cover shadow-sm"
                      />
                      {sc.label && (
                        <figcaption className="mt-2 text-sm text-[#6f6453]">
                          {sc.label}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Repli : scènes illustrées (en attendant un article rédigé). */
          <div className="space-y-10">
            {scenes.map((sc, i) => (
              <section key={sc.id}>
                {sc.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sc.imageUrl}
                    alt={sc.label || title}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className="mb-4 w-full rounded-lg border border-[#e3d9c6] object-cover shadow-sm"
                  />
                )}
                {sc.label && (
                  <h2 className="mb-1 font-serif text-lg font-semibold text-[#221f1b]">
                    {sc.label}
                  </h2>
                )}
                {sc.text && (
                  <p className="text-[1.05rem] leading-relaxed text-[#3a352e]">
                    {sc.text}
                  </p>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Appel à explorer la carte */}
        <div className="mt-12 rounded-xl border border-[#e3d9c6] bg-[#fcf8ef] p-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-[#232019] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#f7f2e8] transition-colors hover:bg-[#9a3412]"
          >
            {t.backTop}
          </Link>
        </div>

        {/* Maillage interne : récits proches */}
        {related.length > 0 && (
          <aside className="mt-12 border-t border-[#e3d9c6] pt-8">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#a8967c]">
              {t.related}
            </h2>
            <ul className="space-y-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={storyPath(r.slug, lang)}
                    className="group flex items-baseline justify-between gap-3"
                  >
                    <span className="font-serif text-[1.05rem] text-[#2a2724] group-hover:text-[#9a3412]">
                      {pickTitle(r, lang)}
                    </span>
                    {r.period && (
                      <span className="shrink-0 text-xs text-[#a8967c]">{r.period}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>
    </div>
  );
}
