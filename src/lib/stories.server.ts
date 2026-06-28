// Accès serveur au contenu (pour les pages SSG / metadata / sitemap).
// Le contenu est bundlé (src/content/stories.ts), donc lisible directement
// côté serveur sans I/O ni dépendance externe.

import type { Metadata } from 'next';
import { storyDetails } from '@/content/stories';
import type { Lang, StoryDetail, SceneAsset } from '@/types/frontend';
import { eraLabel } from '@/lib/eras';
import { getArticleMarkdown, stripMarkdown, hasRichArticle } from '@/lib/articles';
import {
  SITE_NAME,
  storyPath,
  storyAlternates,
  absUrl,
  metaDescription,
} from '@/lib/site';

/** Toutes les histoires, triées par titre FR (ordre stable). */
export function allStories(): StoryDetail[] {
  return Object.values(storyDetails).sort((a, b) =>
    a.title.localeCompare(b.title, 'fr')
  );
}

/** Tous les slugs (pour generateStaticParams / sitemap). */
export function allSlugs(): string[] {
  return allStories().map((s) => s.slug);
}

/** Une histoire par slug (ou null). */
export function getStory(slug: string): StoryDetail | null {
  return (
    storyDetails[slug] ??
    Object.values(storyDetails).find((s) => s.slug === slug) ??
    null
  );
}

/** Titre localisé (repli FR). */
export function pickTitle(s: StoryDetail, lang: Lang): string {
  return lang === 'en' && s.titleEn ? s.titleEn : s.title;
}

/** Libellé de scène localisé (repli FR). */
export function pickLabel(sc: SceneAsset, lang: Lang): string {
  return lang === 'en' && sc.labelEn ? sc.labelEn : sc.label;
}

/** Texte de scène localisé (repli FR). */
export function pickExcerpt(sc: SceneAsset, lang: Lang): string {
  return (lang === 'en' && sc.textExcerptEn ? sc.textExcerptEn : sc.textExcerpt) || '';
}

/**
 * Corps de l'article localisé : un chapeau + une liste de scènes illustrées.
 * En FR le chapeau est le scriptText ; en EN on assemble les extraits anglais.
 */
export function storyBody(s: StoryDetail, lang: Lang) {
  const scenes = s.scenes.map((sc) => ({
    id: sc.id,
    label: pickLabel(sc, lang),
    text: pickExcerpt(sc, lang),
    imageUrl: sc.imageUrl,
  }));
  const lead =
    lang === 'en'
      ? scenes.map((sc) => sc.text).filter(Boolean).join(' ')
      : s.scriptText || scenes.map((sc) => sc.text).filter(Boolean).join(' ');
  return { lead, scenes };
}

/** Texte complet (pour meta-description), langue donnée. */
export function fullText(s: StoryDetail, lang: Lang): string {
  const { lead, scenes } = storyBody(s, lang);
  return lead || scenes.map((sc) => sc.text).join(' ') || s.title;
}

const R = 6371; // rayon terrestre (km)
function haversine(a: StoryDetail, b: StoryDetail): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Métadonnées SEO complètes (title, description, hreflang, OG) d'un récit. */
export function buildStoryMetadata(slug: string, lang: Lang): Metadata {
  const s = getStory(slug);
  if (!s) return {};

  const base = pickTitle(s, lang);
  const loc = (s.locationName || '').trim();
  const era = eraLabel(s.period, lang);

  // Title : titre + lieu (s'il n'y figure pas déjà). Le template du layout
  // ajoute « — History Pins » derrière.
  const locInTitle = loc && base.toLowerCase().includes(loc.toLowerCase());
  const title = loc && !locInTitle ? `${base} · ${loc}` : base;

  // Description : on front-load les mots-clés (époque · lieu) avant l'accroche.
  // Si un article rédigé existe, on le préfère au script vidéo (plus riche).
  const rich = getArticleMarkdown(s.slug, lang);
  const context = [era, loc].filter(Boolean).join(' · ');
  const narrative = rich ? stripMarkdown(rich) : fullText(s, lang);
  const description = metaDescription(
    context ? `${context} — ${narrative}` : narrative
  );

  // Garde-fou : tant qu'il n'y a pas d'article riche, on demande à Google de ne
  // PAS indexer (mais de suivre les liens). Évite le signal « contenu mince ».
  const indexable = hasRichArticle(s.slug, lang);

  // Mots-clés naturels (titre, lieu, époque, requêtes génériques).
  const keywords = [
    base,
    loc,
    era,
    lang === 'en' ? 'history of France' : 'histoire de France',
  ].filter(Boolean) as string[];

  const hero = s.scenes.find((sc) => sc.imageUrl)?.imageUrl ?? null;
  const url = absUrl(storyPath(s.slug, lang));

  return {
    title,
    description,
    keywords,
    robots: indexable ? undefined : { index: false, follow: true },
    alternates: storyAlternates(s.slug, lang),
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: lang === 'en' ? 'en_US' : 'fr_FR',
      ...(hero ? { images: [{ url: absUrl(hero), alt: base }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(hero ? { images: [absUrl(hero)] } : {}),
    },
  };
}

/** Récits les plus proches géographiquement (maillage interne). */
export function relatedStories(slug: string, n = 4): StoryDetail[] {
  const current = getStory(slug);
  if (!current) return [];
  return allStories()
    .filter((s) => s.slug !== current.slug)
    .map((s) => ({ s, d: haversine(current, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.s);
}
