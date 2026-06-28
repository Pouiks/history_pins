import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoryArticle } from '@/components/StoryArticle';
import { allSlugs, getStory, buildStoryMetadata } from '@/lib/stories.server';

export const dynamicParams = false;

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return buildStoryMetadata(params.slug, 'fr');
}

export default function StoryPageFr({ params }: { params: { slug: string } }) {
  const story = getStory(params.slug);
  if (!story) notFound();
  return <StoryArticle story={story} lang="fr" />;
}
