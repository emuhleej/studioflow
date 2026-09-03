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
      app_owners: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_links: {
        Row: {
          archived_at: string | null
          asset_id: string
          created_at: string
          deleted_at: string | null
          id: string
          owner_id: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          asset_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          owner_id: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          asset_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          owner_id?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          archived_at: string | null
          bytes: number
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          episode_id: string | null
          filename: string
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string
          notes: string
          owner_id: string
          project_id: string
          review_status: Database["public"]["Enums"]["asset_review_status"]
          source: string
          source_generation_id: string | null
          storage_key: string
          updated_at: string
          width: number | null
        }
        Insert: {
          archived_at?: string | null
          bytes: number
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          episode_id?: string | null
          filename: string
          height?: number | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string
          notes?: string
          owner_id: string
          project_id: string
          review_status?: Database["public"]["Enums"]["asset_review_status"]
          source?: string
          source_generation_id?: string | null
          storage_key: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          archived_at?: string | null
          bytes?: number
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          episode_id?: string | null
          filename?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string
          notes?: string
          owner_id?: string
          project_id?: string
          review_status?: Database["public"]["Enums"]["asset_review_status"]
          source?: string
          source_generation_id?: string | null
          storage_key?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_source_generation_id_fkey"
            columns: ["source_generation_id"]
            isOneToOne: false
            referencedRelation: "generation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          bytes: number
          created_at: string
          id: string
          owner_id: string
          status: string
          storage_key: string
        }
        Insert: {
          bytes: number
          created_at?: string
          id?: string
          owner_id: string
          status: string
          storage_key: string
        }
        Update: {
          bytes?: number
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          storage_key?: string
        }
        Relationships: []
      }
      captures: {
        Row: {
          archived_at: string | null
          converted_to_episode_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          owner_id: string
          text: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          converted_to_episode_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          owner_id: string
          text: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          converted_to_episode_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          owner_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "captures_converted_to_episode_id_fkey"
            columns: ["converted_to_episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_entries: {
        Row: {
          amount_cents: number
          archived_at: string | null
          category: Database["public"]["Enums"]["cost_category"]
          created_at: string
          deleted_at: string | null
          episode_id: string
          id: string
          note: string
          occurred_on: string
          owner_id: string
          provider: string
          source_generation_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          archived_at?: string | null
          category: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          deleted_at?: string | null
          episode_id: string
          id?: string
          note?: string
          occurred_on?: string
          owner_id: string
          provider?: string
          source_generation_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          archived_at?: string | null
          category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          deleted_at?: string | null
          episode_id?: string
          id?: string
          note?: string
          occurred_on?: string
          owner_id?: string
          provider?: string
          source_generation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_entries_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_entries_source_generation_id_fkey"
            columns: ["source_generation_id"]
            isOneToOne: false
            referencedRelation: "generation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          accent: string
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          details: Json
          id: string
          kind: Database["public"]["Enums"]["entity_kind"]
          name: string
          owner_id: string
          project_id: string
          prompt_fragment: string
          reference_asset_ids: string[]
          summary: string
          updated_at: string
        }
        Insert: {
          accent?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          details?: Json
          id?: string
          kind: Database["public"]["Enums"]["entity_kind"]
          name: string
          owner_id: string
          project_id: string
          prompt_fragment?: string
          reference_asset_ids?: string[]
          summary?: string
          updated_at?: string
        }
        Update: {
          accent?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          details?: Json
          id?: string
          kind?: Database["public"]["Enums"]["entity_kind"]
          name?: string
          owner_id?: string
          project_id?: string
          prompt_fragment?: string
          reference_asset_ids?: string[]
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          idea: string
          number: number
          owner_id: string
          series_id: string
          status: Database["public"]["Enums"]["episode_status"]
          tags: string[]
          target_duration_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idea?: string
          number: number
          owner_id: string
          series_id: string
          status?: Database["public"]["Enums"]["episode_status"]
          tags?: string[]
          target_duration_seconds?: number
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idea?: string
          number?: number
          owner_id?: string
          series_id?: string
          status?: Database["public"]["Enums"]["episode_status"]
          tags?: string[]
          target_duration_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      error_events: {
        Row: {
          context: string
          created_at: string
          id: string
          message: string
          owner_id: string
          path: string
          user_agent: string
        }
        Insert: {
          context?: string
          created_at?: string
          id?: string
          message: string
          owner_id: string
          path?: string
          user_agent?: string
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          message?: string
          owner_id?: string
          path?: string
          user_agent?: string
        }
        Relationships: []
      }
      generation_budget_settings: {
        Row: {
          archived_at: string | null
          created_at: string
          daily_limit_micros: number
          deleted_at: string | null
          generated_output_limit_bytes: number
          generation_enabled: boolean
          id: string
          max_image_request_micros: number
          max_video_request_micros: number
          monthly_limit_micros: number
          owner_id: string
          reference_image_limit_bytes: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          daily_limit_micros?: number
          deleted_at?: string | null
          generated_output_limit_bytes?: number
          generation_enabled?: boolean
          id?: string
          max_image_request_micros?: number
          max_video_request_micros?: number
          monthly_limit_micros?: number
          owner_id: string
          reference_image_limit_bytes?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          daily_limit_micros?: number
          deleted_at?: string | null
          generated_output_limit_bytes?: number
          generation_enabled?: boolean
          id?: string
          max_image_request_micros?: number
          max_video_request_micros?: number
          monthly_limit_micros?: number
          owner_id?: string
          reference_image_limit_bytes?: number
          updated_at?: string
        }
        Relationships: []
      }
      generation_events: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          detail: Json
          event_type: string
          from_status: string | null
          generation_id: string
          id: string
          message: string
          owner_id: string
          to_status: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          detail?: Json
          event_type: string
          from_status?: string | null
          generation_id: string
          id?: string
          message?: string
          owner_id: string
          to_status?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          detail?: Json
          event_type?: string
          from_status?: string | null
          generation_id?: string
          id?: string
          message?: string
          owner_id?: string
          to_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_input_assets: {
        Row: {
          archived_at: string | null
          asset_id: string
          created_at: string
          deleted_at: string | null
          generation_id: string
          id: string
          owner_id: string
          position: number
          role: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          asset_id: string
          created_at?: string
          deleted_at?: string | null
          generation_id: string
          id?: string
          owner_id: string
          position?: number
          role: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          asset_id?: string
          created_at?: string
          deleted_at?: string | null
          generation_id?: string
          id?: string
          owner_id?: string
          position?: number
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_input_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_input_assets_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_records: {
        Row: {
          api_version: string | null
          archived_at: string | null
          asset_ids: string[]
          calculated_cost_micros: number | null
          client_request_id: string | null
          completed_at: string | null
          cost_cents: number
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          episode_id: string
          estimated_cost_micros: number
          estimated_output_bytes: number
          execution_mode: string
          failure_code: string | null
          failure_message: string | null
          id: string
          ingest_attempts: number
          media_kind: string | null
          model: string
          model_version: string | null
          next_poll_at: string | null
          notes: string
          operational_status: string
          outcome: Database["public"]["Enums"]["asset_review_status"]
          owner_id: string
          poll_attempts: number
          pricing_snapshot: Json
          prompt_version_id: string | null
          provider: string
          provider_credit_units: number | null
          provider_job_id: string | null
          provider_reported_cost_micros: number | null
          provider_submission_started_at: string | null
          request_settings: Json
          reserved_max_cost_micros: number
          reserved_output_bytes: number
          shot_id: string | null
          started_at: string | null
          submission_claim_expires_at: string | null
          submission_claim_id: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          api_version?: string | null
          archived_at?: string | null
          asset_ids?: string[]
          calculated_cost_micros?: number | null
          client_request_id?: string | null
          completed_at?: string | null
          cost_cents?: number
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          episode_id: string
          estimated_cost_micros?: number
          estimated_output_bytes?: number
          execution_mode?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          ingest_attempts?: number
          media_kind?: string | null
          model: string
          model_version?: string | null
          next_poll_at?: string | null
          notes?: string
          operational_status?: string
          outcome?: Database["public"]["Enums"]["asset_review_status"]
          owner_id: string
          poll_attempts?: number
          pricing_snapshot?: Json
          prompt_version_id?: string | null
          provider: string
          provider_credit_units?: number | null
          provider_job_id?: string | null
          provider_reported_cost_micros?: number | null
          provider_submission_started_at?: string | null
          request_settings?: Json
          reserved_max_cost_micros?: number
          reserved_output_bytes?: number
          shot_id?: string | null
          started_at?: string | null
          submission_claim_expires_at?: string | null
          submission_claim_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          api_version?: string | null
          archived_at?: string | null
          asset_ids?: string[]
          calculated_cost_micros?: number | null
          client_request_id?: string | null
          completed_at?: string | null
          cost_cents?: number
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          episode_id?: string
          estimated_cost_micros?: number
          estimated_output_bytes?: number
          execution_mode?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          ingest_attempts?: number
          media_kind?: string | null
          model?: string
          model_version?: string | null
          next_poll_at?: string | null
          notes?: string
          operational_status?: string
          outcome?: Database["public"]["Enums"]["asset_review_status"]
          owner_id?: string
          poll_attempts?: number
          pricing_snapshot?: Json
          prompt_version_id?: string | null
          provider?: string
          provider_credit_units?: number | null
          provider_job_id?: string | null
          provider_reported_cost_micros?: number | null
          provider_submission_started_at?: string | null
          request_settings?: Json
          reserved_max_cost_micros?: number
          reserved_output_bytes?: number
          shot_id?: string | null
          started_at?: string | null
          submission_claim_expires_at?: string | null
          submission_claim_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_records_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_records_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_records_shot_id_fkey"
            columns: ["shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          accent: string
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          deleted_at: string | null
          episode_id: string
          id: string
          owner_id: string
          purpose: string
          shot_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          episode_id: string
          id?: string
          owner_id: string
          purpose: string
          shot_id?: string | null
          updated_at?: string
          version: number
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          episode_id?: string
          id?: string
          owner_id?: string
          purpose?: string
          shot_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_versions_shot_id_fkey"
            columns: ["shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          episode_id: string
          id: string
          owner_id: string
          platform: Database["public"]["Enums"]["platform_name"]
          published_at: string
          updated_at: string
          url: string
          views: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          episode_id: string
          id?: string
          owner_id: string
          platform: Database["public"]["Enums"]["platform_name"]
          published_at: string
          updated_at?: string
          url: string
          views?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          episode_id?: string
          id?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["platform_name"]
          published_at?: string
          updated_at?: string
          url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          archived_at: string | null
          beat: Database["public"]["Enums"]["beat_type"]
          created_at: string
          deleted_at: string | null
          episode_id: string
          id: string
          location_id: string | null
          owner_id: string
          position: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          beat?: Database["public"]["Enums"]["beat_type"]
          created_at?: string
          deleted_at?: string | null
          episode_id: string
          id?: string
          location_id?: string | null
          owner_id: string
          position: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          beat?: Database["public"]["Enums"]["beat_type"]
          created_at?: string
          deleted_at?: string | null
          episode_id?: string
          id?: string
          location_id?: string | null
          owner_id?: string
          position?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          deleted_at: string | null
          episode_id: string
          id: string
          note: string
          owner_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          episode_id: string
          id?: string
          note?: string
          owner_id: string
          title?: string
          updated_at?: string
          version: number
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          episode_id?: string
          id?: string
          note?: string
          owner_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          orientation: string
          owner_id: string
          premise: string
          project_id: string
          target_duration_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          orientation?: string
          owner_id: string
          premise?: string
          project_id: string
          target_duration_seconds?: number
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          orientation?: string
          owner_id?: string
          premise?: string
          project_id?: string
          target_duration_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          action: string
          archived_at: string | null
          asset_ids: string[]
          character_ids: string[]
          created_at: string
          deleted_at: string | null
          dialogue: string
          duration_seconds: number
          framing: string
          id: string
          owner_id: string
          position: number
          prompt: string
          scene_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action?: string
          archived_at?: string | null
          asset_ids?: string[]
          character_ids?: string[]
          created_at?: string
          deleted_at?: string | null
          dialogue?: string
          duration_seconds?: number
          framing?: string
          id?: string
          owner_id: string
          position: number
          prompt?: string
          scene_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action?: string
          archived_at?: string | null
          asset_ids?: string[]
          character_ids?: string[]
          created_at?: string
          deleted_at?: string | null
          dialogue?: string
          duration_seconds?: number
          framing?: string
          id?: string
          owner_id?: string
          position?: number
          prompt?: string
          scene_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          deleted_at: string | null
          episode_id: string
          id: string
          minutes: number
          note: string
          occurred_on: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          deleted_at?: string | null
          episode_id: string
          id?: string
          minutes: number
          note?: string
          occurred_on?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          episode_id?: string
          id?: string
          minutes?: number
          note?: string
          occurred_on?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          archived_at: string | null
          asset_id: string
          completed_at: string | null
          completed_parts: Json
          created_at: string
          deleted_at: string | null
          expires_at: string
          id: string
          mode: string
          owner_id: string
          part_size: number | null
          state: string
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          archived_at?: string | null
          asset_id: string
          completed_at?: string | null
          completed_parts?: Json
          created_at?: string
          deleted_at?: string | null
          expires_at: string
          id?: string
          mode: string
          owner_id: string
          part_size?: number | null
          state?: string
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          archived_at?: string | null
          asset_id?: string
          completed_at?: string | null
          completed_parts?: Json
          created_at?: string
          deleted_at?: string | null
          expires_at?: string
          id?: string
          mode?: string
          owner_id?: string
          part_size?: number | null
          state?: string
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_generation_submission: {
        Args: {
          requested_claim_id: string
          target_generation_id: string
          target_owner_id: string
        }
        Returns: boolean
      }
      complete_generation_ingest: {
        Args: {
          output_bytes: number
          output_filename: string
          output_mime_type: string
          output_storage_key: string
          target_generation_id: string
          target_owner_id: string
        }
        Returns: string
      }
      current_user_is_app_owner: { Args: never; Returns: boolean }
      delete_asset_metadata: {
        Args: { target_asset_id: string; target_owner_id: string }
        Returns: undefined
      }
      finalize_generation_without_output: {
        Args: {
          settled_cost_micros: number
          target_failure_code: string
          target_failure_message: string
          target_generation_id: string
          target_owner_id: string
          target_status: string
        }
        Returns: boolean
      }
      mark_generation_submission_started: {
        Args: {
          requested_claim_id: string
          target_generation_id: string
          target_owner_id: string
        }
        Returns: boolean
      }
      recover_stale_generation_claims: { Args: never; Returns: number }
    }
    Enums: {
      asset_kind: "image" | "audio" | "video"
      asset_review_status: "unreviewed" | "selected" | "rejected"
      beat_type: "hook" | "setup" | "escalation" | "payoff" | "tag" | "custom"
      cost_category: "image" | "video" | "voice" | "music" | "editing" | "other"
      entity_kind: "character" | "location" | "prop" | "style"
      episode_status:
        | "idea"
        | "scripting"
        | "shot_planning"
        | "generating"
        | "editing"
        | "ready"
        | "published"
        | "archived"
      platform_name: "tiktok" | "youtube" | "facebook" | "instagram"
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
    Enums: {
      asset_kind: ["image", "audio", "video"],
      asset_review_status: ["unreviewed", "selected", "rejected"],
      beat_type: ["hook", "setup", "escalation", "payoff", "tag", "custom"],
      cost_category: ["image", "video", "voice", "music", "editing", "other"],
      entity_kind: ["character", "location", "prop", "style"],
      episode_status: [
        "idea",
        "scripting",
        "shot_planning",
        "generating",
        "editing",
        "ready",
        "published",
        "archived",
      ],
      platform_name: ["tiktok", "youtube", "facebook", "instagram"],
    },
  },
} as const
