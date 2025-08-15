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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          keycloak_user_id: string | null
          login: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          keycloak_user_id?: string | null
          login: string
          password_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          keycloak_user_id?: string | null
          login?: string
          password_hash?: string
        }
        Relationships: []
      }
      candidate_event_notifications: {
        Row: {
          candidate_id: string
          created_at: string
          description: string | null
          event_date: string
          event_id: string
          id: string
          location: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          description?: string | null
          event_date: string
          event_id: string
          id?: string
          location?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_id?: string
          id?: string
          location?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      candidate_expertises: {
        Row: {
          candidate_id: string
          created_at: string
          expertise_id: string
          id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          expertise_id: string
          id?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          expertise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_expertises_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_expertises_expertise_id_fkey"
            columns: ["expertise_id"]
            isOneToOne: false
            referencedRelation: "hr_expertises"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_languages: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          language_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          language_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          language_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_languages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_languages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "hr_languages"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notifications: {
        Row: {
          calculated_price: number | null
          candidate_id: string
          created_at: string
          description: string
          id: string
          profile_type: string | null
          project_id: string
          required_expertises: string[] | null
          required_languages: string[] | null
          required_seniority: string | null
          resource_assignment_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          calculated_price?: number | null
          candidate_id: string
          created_at?: string
          description: string
          id?: string
          profile_type?: string | null
          project_id: string
          required_expertises?: string[] | null
          required_languages?: string[] | null
          required_seniority?: string | null
          resource_assignment_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          calculated_price?: number | null
          candidate_id?: string
          created_at?: string
          description?: string
          id?: string
          profile_type?: string | null
          project_id?: string
          required_expertises?: string[] | null
          required_languages?: string[] | null
          required_seniority?: string | null
          resource_assignment_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notifications_resource_assignment_id_fkey"
            columns: ["resource_assignment_id"]
            isOneToOne: false
            referencedRelation: "hr_resource_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          created_at: string
          daily_rate: number
          email: string
          email_verification_code: string | null
          first_name: string
          id: string
          is_email_verified: boolean
          keycloak_user_id: string | null
          last_name: string
          password_hash: string
          phone: string | null
          profile_id: string | null
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          qualification_status: string | null
          rating: number | null
          seniority: Database["public"]["Enums"]["hr_seniority"]
          status: string
          updated_at: string
          verification_code_expires_at: string | null
        }
        Insert: {
          created_at?: string
          daily_rate?: number
          email: string
          email_verification_code?: string | null
          first_name: string
          id?: string
          is_email_verified?: boolean
          keycloak_user_id?: string | null
          last_name: string
          password_hash: string
          phone?: string | null
          profile_id?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          qualification_status?: string | null
          rating?: number | null
          seniority?: Database["public"]["Enums"]["hr_seniority"]
          status?: string
          updated_at?: string
          verification_code_expires_at?: string | null
        }
        Update: {
          created_at?: string
          daily_rate?: number
          email?: string
          email_verification_code?: string | null
          first_name?: string
          id?: string
          is_email_verified?: boolean
          keycloak_user_id?: string | null
          last_name?: string
          password_hash?: string
          phone?: string | null
          profile_id?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          qualification_status?: string | null
          rating?: number | null
          seniority?: Database["public"]["Enums"]["hr_seniority"]
          status?: string
          updated_at?: string
          verification_code_expires_at?: string | null
        }
        Relationships: []
      }
      candidate_project_assignments: {
        Row: {
          assigned_at: string
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_project_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_qualification_results: {
        Row: {
          answers: Json | null
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          max_score: number
          score: number
          started_at: string | null
          status: string
          test_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number
          score?: number
          started_at?: string | null
          status?: string
          test_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number
          score?: number
          started_at?: string | null
          status?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_reviews: {
        Row: {
          candidate_id: string
          client_comment: string | null
          client_rating: number
          created_at: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          client_comment?: string | null
          client_rating: number
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          client_comment?: string | null
          client_rating?: number
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_reviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          keycloak_user_id: string | null
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          keycloak_user_id?: string | null
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          keycloak_user_id?: string | null
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
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
      hr_qualification_tests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_score: number
          name: string
          passing_score: number
          profile_id: string
          questions: Json
          time_limit_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_score?: number
          name: string
          passing_score?: number
          profile_id: string
          questions?: Json
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_score?: number
          name?: string
          passing_score?: number
          profile_id?: string
          questions?: Json
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hr_resource_assignments: {
        Row: {
          booking_status: string
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
          booking_status?: string
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
          booking_status?: string
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
      kanban_boards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          members: string[] | null
          project_id: string
          team_members: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          members?: string[] | null
          project_id: string
          team_members?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          members?: string[] | null
          project_id?: string
          team_members?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          assigned_to: string | null
          assigned_to_avatar: string | null
          assigned_to_email: string | null
          assigned_to_name: string | null
          board_id: string
          column_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          labels: string[] | null
          position: number
          priority: string | null
          progress: number | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_avatar?: string | null
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          board_id: string
          column_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          position: number
          priority?: string | null
          progress?: number | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_avatar?: string | null
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          board_id?: string
          column_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          position?: number
          priority?: string | null
          progress?: number | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string
          color: string | null
          created_at: string
          id: string
          limit: number | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string
          id?: string
          limit?: number | null
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string
          id?: string
          limit?: number | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      nextcloud_projects: {
        Row: {
          created_at: string
          folder_path: string | null
          id: string
          nextcloud_url: string
          project_id: string
          talk_url: string | null
        }
        Insert: {
          created_at?: string
          folder_path?: string | null
          id?: string
          nextcloud_url: string
          project_id: string
          talk_url?: string | null
        }
        Update: {
          created_at?: string
          folder_path?: string | null
          id?: string
          nextcloud_url?: string
          project_id?: string
          talk_url?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_bookings: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          project_id: string
          resource_assignment_id: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          project_id: string
          resource_assignment_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          project_id?: string
          resource_assignment_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bookings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bookings_resource_assignment_id_fkey"
            columns: ["resource_assignment_id"]
            isOneToOne: false
            referencedRelation: "hr_resource_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_event_attendees: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          id: string
          profile_id: string | null
          required: boolean
          response_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          profile_id?: string | null
          required?: boolean
          response_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          profile_id?: string | null
          required?: boolean
          response_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "project_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          drive_url: string | null
          end_at: string | null
          id: string
          location: string | null
          project_id: string
          start_at: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          drive_url?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          project_id: string
          start_at: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          drive_url?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          project_id?: string
          start_at?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
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
      project_groups: {
        Row: {
          created_at: string
          id: string
          keycloak_group_id: string
          keycloak_group_name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keycloak_group_id: string
          keycloak_group_name: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keycloak_group_id?: string
          keycloak_group_name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          member_id: string
          member_type: string
          profile_type: string | null
          project_id: string
          role: string | null
          seniority: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          member_id: string
          member_type: string
          profile_type?: string | null
          project_id: string
          role?: string | null
          seniority?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          member_id?: string
          member_type?: string
          profile_type?: string | null
          project_id?: string
          role?: string | null
          seniority?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_budget: number | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          keycloak_user_id: string | null
          owner_id: string | null
          price_per_minute: number
          project_date: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_budget?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          keycloak_user_id?: string | null
          owner_id?: string | null
          price_per_minute?: number
          project_date?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_budget?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          keycloak_user_id?: string | null
          owner_id?: string | null
          price_per_minute?: number
          project_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          keycloak_user_id: string
          last_name: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          keycloak_user_id: string
          last_name: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          keycloak_user_id?: string
          last_name?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_delete_event: {
        Args: {
          event_created_by: string
          event_id: string
          event_project_id: string
        }
        Returns: boolean
      }
      candidate_can_view_booking: {
        Args: { booking_candidate_id: string; candidate_email: string }
        Returns: boolean
      }
      candidate_has_project_access: {
        Args: { candidate_email: string; project_id_param: string }
        Returns: boolean
      }
      debug_jwt_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      find_matching_candidates: {
        Args: { assignment_id: string }
        Returns: {
          candidate_id: string
          email: string
        }[]
      }
      is_event_attendee: {
        Args: { event_id_param: string; user_email: string }
        Returns: boolean
      }
      is_project_team_member: {
        Args: { project_id_param: string; user_id_param: string }
        Returns: boolean
      }
      owner_can_view_booking: {
        Args: { booking_project_id: string; owner_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      hr_seniority: "junior" | "intermediate" | "senior"
      profile_type: "client" | "resource"
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
      profile_type: ["client", "resource"],
    },
  },
} as const
