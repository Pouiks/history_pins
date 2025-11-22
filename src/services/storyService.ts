import { supabase } from '@/lib/supabaseClient';
import {
  dbStoryToMapPoint,
  buildSceneAsset,
  buildStoryDetail,
} from '@/lib/storyAdapter';
import type { StoryMapPoint, StoryDetail } from '@/types/frontend';
import type { 
  DbStory, 
  DbStoryVersion, 
  DbStoryAudio, 
  DbStoryScene, 
  DbStoryImage 
} from '@/types/database';

/**
 * Récupère toutes les stories publiées pour affichage sur la carte
 */
export async function getPublishedStories(): Promise<StoryMapPoint[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des stories:', error);
    throw new Error('Impossible de charger les stories');
  }

  return data.map(dbStoryToMapPoint);
}

/**
 * Charge une story complète avec tous ses assets pour le player
 * @param storyIdOrSlug - ID ou slug de la story
 */
export async function getStoryWithAssets(
  storyIdOrSlug: string
): Promise<StoryDetail | null> {
  // 1. Récupérer la story principale
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('*')
    .or(`id.eq.${storyIdOrSlug},slug.eq.${storyIdOrSlug}`)
    .single();

  if (storyError || !story) {
    console.error('Story non trouvée:', storyError);
    return null;
  }

  // Annotation de type explicite pour TypeScript
  const typedStory = story as DbStory;

  // 2. Récupérer la version sélectionnée
  const { data: version, error: versionError } = await supabase
    .from('story_versions')
    .select('*')
    .eq('story_id', typedStory.id)
    .eq('is_selected', true)
    .single();

  if (versionError || !version) {
    console.error('Version sélectionnée non trouvée:', versionError);
    return null;
  }

  const typedVersion = version as DbStoryVersion;

  // 3. Récupérer l'audio si disponible
  const { data: audioData } = await supabase
    .from('story_audio')
    .select('*')
    .eq('story_id', typedStory.id)
    .eq('version_id', typedVersion.id)
    .maybeSingle();

  const typedAudioData = audioData as DbStoryAudio | null;

  // 4. Récupérer les scènes triées par idx
  const { data: scenes, error: scenesError } = await supabase
    .from('story_scenes')
    .select('*')
    .eq('story_id', typedStory.id)
    .order('idx', { ascending: true });

  if (scenesError || !scenes) {
    console.error('Erreur lors de la récupération des scènes:', scenesError);
    return null;
  }

  const typedScenes = scenes as DbStoryScene[];

  console.log('📋 Ordre des scènes en DB:', typedScenes.map(s => `idx:${s.idx} - "${s.label}"`));

  // 5. Pour chaque scène, récupérer l'image principale approuvée
  const sceneAssets = await Promise.all(
    typedScenes.map(async (scene) => {
      const { data: images, error: imgError } = await supabase
        .from('story_images')
        .select('*')
        .eq('scene_id', scene.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1);

      if (imgError) {
        console.error(`Erreur chargement image scène ${scene.idx}:`, imgError);
      }

      const typedImages = (images || []) as DbStoryImage[];
      const image: DbStoryImage | null = typedImages[0] || null;
      
      console.log(`🖼️ Scène idx:${scene.idx} "${scene.label}" → Image: ${image ? image.image_url.substring(image.image_url.lastIndexOf('/') + 1, image.image_url.lastIndexOf('/') + 15) : 'null'}`);
      
      return buildSceneAsset(scene, image);
    })
  );

  console.log('✅ Scènes assemblées:', sceneAssets.map(s => s.label));

  // 6. Assembler le tout
  const storyDetail = buildStoryDetail(typedStory, typedVersion, typedAudioData, sceneAssets);
  
  return storyDetail;
}

