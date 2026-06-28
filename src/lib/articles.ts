// Articles longs rédigés à la main (Markdown), un fichier par histoire.
// Convention : src/content/articles/<slug>.md (FR) et <slug>.en.md (EN).
// Lus côté serveur au build (SSG). Tant qu'un article riche n'existe pas, la
// page reste `noindex` — on n'expose pas de contenu mince à Google.

import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '@/types/frontend';

const DIR = path.join(process.cwd(), 'src', 'content', 'articles');

/** Seuil (en mots) à partir duquel un article est jugé « assez riche » pour être indexé. */
export const RICH_MIN_WORDS = 150;

/**
 * Barrière de publication : un article n'est indexé QUE si son slug figure dans
 * articles/published.json. Permet de rédiger/preview des brouillons sans les
 * exposer à Google tant qu'ils ne sont pas relus et validés à la main.
 */
function publishedSet(): Set<string> {
  try {
    const raw = fs.readFileSync(path.join(DIR, 'published.json'), 'utf8');
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/** Vrai si l'article a été explicitement publié (relu et validé). */
export function isPublished(slug: string): boolean {
  return publishedSet().has(slug);
}

/** Contenu Markdown brut d'un article (ou null s'il n'existe pas). */
export function getArticleMarkdown(slug: string, lang: Lang): string | null {
  const file = lang === 'en' ? `${slug}.en.md` : `${slug}.md`;
  try {
    const txt = fs.readFileSync(path.join(DIR, file), 'utf8').trim();
    return txt || null;
  } catch {
    return null;
  }
}

/** Retire la syntaxe Markdown pour obtenir du texte brut (meta-description, JSON-LD). */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '') // titres
    .replace(/^>\s?/gm, '') // citations
    .replace(/^[-*]\s+/gm, '') // puces
    .replace(/\*\*([^*]+)\*\*/g, '$1') // gras
    .replace(/\*([^*]+)\*/g, '$1') // italique
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // liens
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nombre de mots du texte brut d'un article. */
export function articleWordCount(slug: string, lang: Lang): number {
  const md = getArticleMarkdown(slug, lang);
  if (!md) return 0;
  return stripMarkdown(md).split(/\s+/).filter(Boolean).length;
}

/** Vrai si l'article est riche ET publié → seul cas indexable. */
export function hasRichArticle(slug: string, lang: Lang): boolean {
  return articleWordCount(slug, lang) >= RICH_MIN_WORDS && isPublished(slug);
}
