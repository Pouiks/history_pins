import type { Metadata } from 'next';
import { StoriesIndex } from '@/components/StoriesIndex';
import { indexAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'All the stories of France',
  description:
    'The full list of geolocated historical stories of France, from prehistory to today — illustrated scene by scene.',
  alternates: indexAlternates('en'),
};

export default function StoriesIndexEn() {
  return <StoriesIndex lang="en" />;
}
