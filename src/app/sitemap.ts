import type { MetadataRoute } from 'next';
import { allSlugs } from '@/lib/stories.server';
import { hasRichArticle } from '@/lib/articles';
import { SITE_URL, storyPath, indexPath, absUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: absUrl(indexPath('fr')), changeFrequency: 'weekly', priority: 0.8 },
    { url: absUrl(indexPath('en')), changeFrequency: 'weekly', priority: 0.8 },
  ];

  // On n'annonce dans le sitemap QUE les pages réellement indexables (article
  // riche rédigé). Les autres sont en `noindex` et n'ont rien à y faire.
  for (const slug of allSlugs()) {
    const fr = hasRichArticle(slug, 'fr');
    const en = hasRichArticle(slug, 'en');
    if (!fr && !en) continue;
    const languages: Record<string, string> = {};
    if (fr) languages.fr = absUrl(storyPath(slug, 'fr'));
    if (en) languages.en = absUrl(storyPath(slug, 'en'));
    if (fr) {
      entries.push({
        url: absUrl(storyPath(slug, 'fr')),
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages },
      });
    }
    if (en) {
      entries.push({
        url: absUrl(storyPath(slug, 'en')),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages },
      });
    }
  }

  return entries;
}
