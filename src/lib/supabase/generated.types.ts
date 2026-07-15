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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arrivals: {
        Row: {
          created_at: string
          energy: string
          id: string
          include_faith_reflection: boolean
          message: string | null
          mood: string
          support_need: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy: string
          id?: string
          include_faith_reflection?: boolean
          message?: string | null
          mood: string
          support_need: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy?: string
          id?: string
          include_faith_reflection?: boolean
          message?: string | null
          mood?: string
          support_need?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrivals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_memories: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          kind: string
          last_used_at: string | null
          position_seed: string | null
          reason: string | null
          source: string
          status: string
          title: string | null
          updated_at: string
          use_count: number
          user_approved: boolean
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          last_used_at?: string | null
          position_seed?: string | null
          reason?: string | null
          source: string
          status?: string
          title?: string | null
          updated_at?: string
          use_count?: number
          user_approved?: boolean
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          last_used_at?: string | null
          position_seed?: string | null
          reason?: string | null
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
          use_count?: number
          user_approved?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_profiles: {
        Row: {
          adaptive_learning_enabled: boolean
          created_at: string
          default_support_preference: string
          encouragement_style: string
          faith_preference: string
          humor_level: string
          planning_style: string
          response_length: string
          tone_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adaptive_learning_enabled?: boolean
          created_at?: string
          default_support_preference?: string
          encouragement_style?: string
          faith_preference?: string
          humor_level?: string
          planning_style?: string
          response_length?: string
          tone_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adaptive_learning_enabled?: boolean
          created_at?: string
          default_support_preference?: string
          encouragement_style?: string
          faith_preference?: string
          humor_level?: string
          planning_style?: string
          response_length?: string
          tone_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_turns: {
        Row: {
          closing_line: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          provider_response_id: string | null
          role: string
          support_mode: string | null
          user_id: string
        }
        Insert: {
          closing_line?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          provider_response_id?: string | null
          role: string
          support_mode?: string | null
          user_id: string
        }
        Update: {
          closing_line?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          provider_response_id?: string | null
          role?: string
          support_mode?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_turns_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_turns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horizon_steps: {
        Row: {
          arrival_id: string | null
          completed: boolean
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          description: string
          estimated_minutes: number
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_id?: string | null
          completed?: boolean
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          description: string
          estimated_minutes: number
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_id?: string | null
          completed?: boolean
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string
          estimated_minutes?: number
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horizon_steps_arrival_id_fkey"
            columns: ["arrival_id"]
            isOneToOne: false
            referencedRelation: "arrivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horizon_steps_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horizon_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          preferred_name: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          preferred_name?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_name?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stewardship_events: {
        Row: {
          app_version: string | null
          created_at: string
          error_category: string | null
          event_type: string
          feedback_category: string | null
          id: string
          latency_bucket: string | null
          memory_kind: string | null
          model: string | null
          provider: string | null
          safety_level: string | null
          support_mode: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          error_category?: string | null
          event_type: string
          feedback_category?: string | null
          id?: string
          latency_bucket?: string | null
          memory_kind?: string | null
          model?: string | null
          provider?: string | null
          safety_level?: string | null
          support_mode?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          error_category?: string | null
          event_type?: string
          feedback_category?: string | null
          id?: string
          latency_bucket?: string | null
          memory_kind?: string | null
          model?: string | null
          provider?: string | null
          safety_level?: string | null
          support_mode?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stewardship_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_privacy_settings: {
        Row: {
          allow_companion_memory: boolean
          allow_product_analytics: boolean
          created_at: string
          save_conversation_history: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_companion_memory?: boolean
          allow_product_analytics?: boolean
          created_at?: string
          save_conversation_history?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_companion_memory?: boolean
          allow_product_analytics?: boolean
          created_at?: string
          save_conversation_history?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_founder: { Args: never; Returns: boolean }
      stewardship_event_counts: {
        Args: { days?: number }
        Returns: {
          event_type: string
          occurrences: number
        }[]
      }
      stewardship_memory_counts: {
        Args: never
        Returns: {
          kind: string
          occurrences: number
          status: string
        }[]
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
