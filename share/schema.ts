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
      categories: {
        Row: {
          category_id: string
          category_name: string
        }
        Insert: {
          category_id: string
          category_name: string
        }
        Update: {
          category_id?: string
          category_name?: string
        }
        Relationships: []
      }
      category_role: {
        Row: {
          category_id: string
          role_id: string
        }
        Insert: {
          category_id: string
          role_id: string
        }
        Update: {
          category_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_role_access_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_role_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      channel_role: {
        Row: {
          channel_id: string
          role_id: string
        }
        Insert: {
          channel_id: string
          role_id: string
        }
        Update: {
          channel_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_role_access_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "channel_role_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      channels: {
        Row: {
          category_id: string | null
          channel_id: string
          channel_name: string
        }
        Insert: {
          category_id?: string | null
          channel_id: string
          channel_name: string
        }
        Update: {
          category_id?: string | null
          channel_id?: string
          channel_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          display_grade: string
          id: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          display_grade: string
          id: number
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          display_grade?: string
          id?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          emergency_contact: string
          grade: number
          insurance: boolean
          member_id: string
          name: string
          some_allergy: boolean
          student_email: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_contact: string
          grade: number
          insurance?: boolean
          member_id?: string
          name: string
          some_allergy?: boolean
          student_email: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_contact?: string
          grade?: number
          insurance?: boolean
          member_id?: string
          name?: string
          some_allergy?: boolean
          student_email?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_grade_fkey"
            columns: ["grade"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          role_id: string
          role_name: string
        }
        Insert: {
          role_id: string
          role_name: string
        }
        Update: {
          role_id?: string
          role_name?: string
        }
        Relationships: []
      }
      user_role: {
        Row: {
          discord_user_id: string
          role_id: string
        }
        Insert: {
          discord_user_id: string
          role_id: string
        }
        Update: {
          discord_user_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_discord_user_id_fkey"
            columns: ["discord_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["discord_user_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          discord_id: string | null
          discord_user_id: string
          display_name: string
          member_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          discord_id?: string | null
          discord_user_id: string
          display_name: string
          member_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          discord_id?: string | null
          discord_user_id?: string
          display_name?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["member_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_current_user_member_seed: { Args: never; Returns: string }
      ensure_member_seed_for_auth_user: {
        Args: { p_auth_user_id: string }
        Returns: string
      }
      get_current_user_display_name: { Args: never; Returns: string }
      patch_current_user_member: {
        Args: {
          p_discord_name?: string
          p_emergency_contact?: string
          p_full_name?: string
          p_grade?: number
          p_insurance?: boolean
          p_some_allergy?: boolean
          p_student_email?: string
          p_student_id?: string
        }
        Returns: string
      }
      resolve_member_id_for_current_user: { Args: never; Returns: string }
      save_current_user_discord_link: {
        Args: { p_discord_id: string; p_display_name?: string }
        Returns: string
      }
      save_current_user_registration: {
        Args: {
          p_discord_name: string
          p_emergency_contact: string
          p_full_name: string
          p_grade: number
          p_insurance: boolean
          p_some_allergy: boolean
          p_student_email: string
          p_student_id: string
        }
        Returns: string
      }
      set_current_user_display_name: {
        Args: { p_display_name: string }
        Returns: undefined
      }
      upsert_user_auth_link: {
        Args: {
          p_auth_user_id: string
          p_display_name: string
          p_member_id: string
        }
        Returns: undefined
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
