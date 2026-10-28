export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          chapter_number: number
          content: string
          created_at: string
          generated_at: string | null
          generation_model: string | null
          id: string
          novel_id: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          chapter_number: number
          content?: string
          created_at?: string
          generated_at?: string | null
          generation_model?: string | null
          id?: string
          novel_id: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          chapter_number?: number
          content?: string
          created_at?: string
          generated_at?: string | null
          generation_model?: string | null
          id?: string
          novel_id?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: number | null
          appearance: string | null
          background: string | null
          created_at: string
          goals: string | null
          id: string
          name: string
          notes: string | null
          novel_id: string
          personality: string | null
          relationships: Json
          role: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          appearance?: string | null
          background?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          name: string
          notes?: string | null
          novel_id: string
          personality?: string | null
          relationships?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          appearance?: string | null
          background?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          name?: string
          notes?: string | null
          novel_id?: string
          personality?: string | null
          relationships?: Json
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          attempts: number
          chapter_id: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_data: Json
          job_type: string
          novel_id: string
          progress: number
          result_data: Json
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          chapter_id?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_data?: Json
          job_type: string
          novel_id: string
          progress?: number
          result_data?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          chapter_id?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          novel_id?: string
          progress?: number
          result_data?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_outlines: {
        Row: {
          chapter_number: number
          characters_involved: Json
          cliffhanger: string | null
          continuity_notes: string | null
          created_at: string
          id: string
          key_events: Json
          novel_id: string
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          chapter_number: number
          characters_involved?: Json
          cliffhanger?: string | null
          continuity_notes?: string | null
          created_at?: string
          id?: string
          key_events?: Json
          novel_id: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          chapter_number?: number
          characters_involved?: Json
          cliffhanger?: string | null
          continuity_notes?: string | null
          created_at?: string
          id?: string
          key_events?: Json
          novel_id?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_outlines_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novels: {
        Row: {
          cover_image_url: string | null
          created_at: string
          genre: string[]
          id: string
          language: string
          premise: string | null
          status: string
          subtitle: string | null
          synopsis: string | null
          target_chapters: number
          title: string
          updated_at: string
          user_id: string
          world_setting: string | null
          writing_style: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          genre?: string[]
          id?: string
          language?: string
          premise?: string | null
          status?: string
          subtitle?: string | null
          synopsis?: string | null
          target_chapters?: number
          title?: string
          updated_at?: string
          user_id: string
          world_setting?: string | null
          writing_style?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          genre?: string[]
          id?: string
          language?: string
          premise?: string | null
          status?: string
          subtitle?: string | null
          synopsis?: string | null
          target_chapters?: number
          title?: string
          updated_at?: string
          user_id?: string
          world_setting?: string | null
          writing_style?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
