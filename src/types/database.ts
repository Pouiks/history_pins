// Types représentant les tables de la base de données Supabase
// Ces types doivent correspondre exactement au schéma Postgres existant

export interface DbStory {
  id: string;
  title: string;
  slug: string;
  location_name: string | null;
  latitude: number;
  longitude: number;
  period: string | null;
  status: string; // 'draft' | 'published'
  created_at: string;
  updated_at: string;
}

export interface DbStoryVersion {
  id: string;
  story_id: string;
  version_number: number;
  script_text: string;
  duration_estimated_sec: number | null;
  source_agent: string | null;
  is_selected: boolean;
  created_at: string;
}

export interface DbStoryAudio {
  id: string;
  story_id: string;
  version_id: string;
  audio_url: string;
  duration_sec: number | null;
  voice_id: string | null;
  status: string | null; // 'generated' | 'approved'
  created_at: string;
}

export interface DbStoryScene {
  id: string;
  story_id: string;
  idx: number;
  label: string;
  description: string | null;
  start_sec: number;
  end_sec: number;
  text_excerpt?: string | null; // Colonne optionnelle
  created_at: string;
}

export interface DbImagePrompt {
  id: string;
  scene_id: string;
  prompt_text: string;
  engine: string | null;
  created_at: string;
}

export interface DbStoryImage {
  id: string;
  scene_id: string;
  prompt_id: string | null;
  image_url: string;
  width: number | null;
  height: number | null;
  status: string; // 'draft' | 'approved'
  created_at: string;
}

// Type pour Supabase client typé
export interface Database {
  public: {
    Tables: {
      stories: {
        Row: DbStory;
        Insert: Omit<DbStory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbStory, 'id' | 'created_at' | 'updated_at'>>;
      };
      story_versions: {
        Row: DbStoryVersion;
        Insert: Omit<DbStoryVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<DbStoryVersion, 'id' | 'created_at'>>;
      };
      story_audio: {
        Row: DbStoryAudio;
        Insert: Omit<DbStoryAudio, 'id' | 'created_at'>;
        Update: Partial<Omit<DbStoryAudio, 'id' | 'created_at'>>;
      };
      story_scenes: {
        Row: DbStoryScene;
        Insert: Omit<DbStoryScene, 'id' | 'created_at'>;
        Update: Partial<Omit<DbStoryScene, 'id' | 'created_at'>>;
      };
      image_prompts: {
        Row: DbImagePrompt;
        Insert: Omit<DbImagePrompt, 'id' | 'created_at'>;
        Update: Partial<Omit<DbImagePrompt, 'id' | 'created_at'>>;
      };
      story_images: {
        Row: DbStoryImage;
        Insert: Omit<DbStoryImage, 'id' | 'created_at'>;
        Update: Partial<Omit<DbStoryImage, 'id' | 'created_at'>>;
      };
    };
  };
}

