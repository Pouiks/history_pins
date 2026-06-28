// Configuration centrale du site (SEO, URLs, métadonnées).
// L'URL de production se règle via NEXT_PUBLIC_SITE_URL (.env.local + Vercel).
// Sans ça on retombe sur un défaut, mais les balises canonical/hreflang/OG
// seront fausses : pense à définir cette variable une fois le domaine connu.

import type { Lang } from '@/types/frontend';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://histofrance.com'
).replace(/\/$/, '');

export const SITE_NAME = 'HistoFrance';

export const DEFAULT_LANG: Lang = 'fr';

/** Préfixe de chemin selon la langue ('' pour le FR, '/en' pour l'EN). */
export function langPrefix(lang: Lang): string {
  return lang === 'en' ? '/en' : '';
}

/** Chemin (relatif) de la page d'un récit. */
export function storyPath(slug: string, lang: Lang): string {
  return lang === 'en' ? `/en/histoire/${slug}` : `/histoire/${slug}`;
}

/** Chemin (relatif) de la page-liste de tous les récits. */
export function indexPath(lang: Lang): string {
  return lang === 'en' ? '/en/histoires' : '/histoires';
}

/** URL absolue à partir d'un chemin relatif. */
export function absUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Alternates hreflang pour Next `metadata.alternates`.
 * `canonical` = la version courante, `languages` = les deux langues + x-default.
 */
export function storyAlternates(slug: string, lang: Lang) {
  return {
    canonical: absUrl(storyPath(slug, lang)),
    languages: {
      fr: absUrl(storyPath(slug, 'fr')),
      en: absUrl(storyPath(slug, 'en')),
      'x-default': absUrl(storyPath(slug, 'fr')),
    },
  };
}

/** Alternates hreflang pour la page-liste. */
export function indexAlternates(lang: Lang) {
  return {
    canonical: absUrl(indexPath(lang)),
    languages: {
      fr: absUrl(indexPath('fr')),
      en: absUrl(indexPath('en')),
      'x-default': absUrl(indexPath('fr')),
    },
  };
}

/** Tronque proprement un texte pour une meta-description (~155 caractères). */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/[\s,;:.!?-]+\S*$/, '') + '…';
}
