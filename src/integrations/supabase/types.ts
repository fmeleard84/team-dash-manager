export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          login: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          login: string
          password_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          login?: string
          password_hash?: string
        }
        Relationships: []
      }
      hr_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_expertises: {
        Row: {
          category_id: string
          cost_percentage: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          cost_percentage?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          cost_percentage?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_expertises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hr_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_languages: {
        Row: {
          code: string
          cost_percentage: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          cost_percentage?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          cost_percentage?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_profile_expertises: {
        Row: {
          created_at: string
          expertise_id: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expertise_id: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expertise_id?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_profile_expertises_expertise_id_fkey"
            columns: ["expertise_id"]
            isOneToOne: false
            referencedRelation: "hr_expertises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_profile_expertises_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_profiles: {
        Row: {
          base_price: number
          category_id: string
          created_at: string
          id: string
          inputs: string[] | null
          name: string
          outputs: string[] | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_id: string
          created_at?: string
          id?: string
          inputs?: string[] | null
          name: string
          outputs?: string[] | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string
          created_at?: string
          id?: string
          inputs?: string[] | null
          name?: string
          outputs?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hr_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_resource_assignments: {
        Row: {
          calculated_price: number
          created_at: string
          expertises: string[] | null
          id: string
          languages: string[] | null
          node_data: Json | null
          profile_id: string
          project_id: string
          seniority: Database["public"]["Enums"]["hr_seniority"]
          updated_at: string
        }
        Insert: {
          calculated_price?: number
          created_at?: string
          expertises?: string[] | null
          id?: string
          languages?: string[] | null
          node_data?: Json | null
          profile_id: string
          project_id: string
          seniority?: Database["public"]["Enums"]["hr_seniority"]
          updated_at?: string
        }
        Update: {
          calculated_price?: number
          created_at?: string
          expertises?: string[] | null
          id?: string
          languages?: string[] | null
          node_data?: Json | null
          profile_id?: string
          project_id?: string
          seniority?: Database["public"]["Enums"]["hr_seniority"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_resource_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_resource_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planka_projects: {
        Row: {
          created_at: string
          id: string
          planka_board_id: string
          planka_project_id: string
          planka_url: string
          project_id: string
          synced_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          planka_board_id: string
          planka_project_id: string
          planka_url: string
          project_id: string
          synced_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          planka_board_id?: string
          planka_project_id?: string
          planka_url?: string
          project_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planka_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_flows: {
        Row: {
          created_at: string
          flow_data: Json
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flow_data?: Json
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flow_data?: Json
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_flows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          price_per_minute: number
          project_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          price_per_minute?: number
          project_date?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          price_per_minute?: number
          project_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      hr_seniority: "junior" | "intermediate" | "senior"
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
    Enums: {
      hr_seniority: ["junior", "intermediate", "senior"],
    },
  },
} as const
