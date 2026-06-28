import type { Metadata } from 'next';
import { StoriesIndex } from '@/components/StoriesIndex';
import { indexAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Toutes les histoires de France',
  description:
    'La liste complète des récits historiques géolocalisés de France, de la préhistoire à nos jours — illustrés scène par scène.',
  alternates: indexAlternates('fr'),
};

export default function HistoiresPage() {
  return <StoriesIndex lang="fr" />;
}
