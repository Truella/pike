export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      jobs_listings: {
        Row: {
          applied_at: string | null;
          company: string;
          follow_up_at: string | null;
          found_at: string;
          id: string;
          link: string;
          notes: string | null;
          source: string;
          status: string;
          title: string;
          user_id: string;
        };
        Insert: {
          applied_at?: string | null;
          company: string;
          follow_up_at?: string | null;
          found_at?: string;
          id?: string;
          link: string;
          notes?: string | null;
          source: string;
          status?: string;
          title: string;
          user_id: string;
        };
        Update: {
          applied_at?: string | null;
          company?: string;
          follow_up_at?: string | null;
          found_at?: string;
          id?: string;
          link?: string;
          notes?: string | null;
          source?: string;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_listings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          last_run_at: string | null;
          name: string;
          notes: string | null;
          status: string | null;
          user_id: string;
        };
        Insert: {
          id: string;
          last_run_at?: string | null;
          name: string;
          notes?: string | null;
          status?: string | null;
          user_id?: string;
        };
        Update: {
          id?: string;
          last_run_at?: string | null;
          name?: string;
          notes?: string | null;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pike_preferences: {
        Row: {
          theme: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          theme?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          theme?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pike_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      study_curriculum: {
        Row: {
          id: string;
          order_index: number;
          section: string;
          title: string;
          url: string;
        };
        Insert: {
          id: string;
          order_index: number;
          section: string;
          title: string;
          url: string;
        };
        Update: {
          id?: string;
          order_index?: number;
          section?: string;
          title?: string;
          url?: string;
        };
        Relationships: [];
      };
      study_progress: {
        Row: {
          completed_at: string | null;
          created_at: string;
          notes: string | null;
          started_at: string | null;
          status: string;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          notes?: string | null;
          started_at?: string | null;
          status?: string;
          topic_id: string;
          user_id?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          notes?: string | null;
          started_at?: string | null;
          status?: string;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_progress_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "study_curriculum";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hackathons_entries: {
        Row: {
          deadline: string | null;
          found_at: string;
          id: string;
          link: string;
          name: string;
          notes: string | null;
          organizer: string | null;
          prize: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          deadline?: string | null;
          found_at?: string;
          id?: string;
          link: string;
          name: string;
          notes?: string | null;
          organizer?: string | null;
          prize?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          deadline?: string | null;
          found_at?: string;
          id?: string;
          link?: string;
          name?: string;
          notes?: string | null;
          organizer?: string | null;
          prize?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hackathons_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pike_content: {
        Row: {
          created_at: string;
          draft_text: string;
          id: string;
          media_urls: string[];
          post_type: string;
          published_at: string | null;
          scheduled_at: string | null;
          source_ref: string | null;
          source_type: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          draft_text: string;
          id?: string;
          media_urls?: string[];
          post_type: string;
          published_at?: string | null;
          scheduled_at?: string | null;
          source_ref?: string | null;
          source_type: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          draft_text?: string;
          id?: string;
          media_urls?: string[];
          post_type?: string;
          published_at?: string | null;
          scheduled_at?: string | null;
          source_ref?: string | null;
          source_type?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pike_content_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pike_topics_bank: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          source: string;
          topic: string;
          used: boolean;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          source: string;
          topic: string;
          used?: boolean;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          source?: string;
          topic?: string;
          used?: boolean;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pike_topics_bank_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      upsert_module_heartbeat: {
        Args: {
          module_id: string;
          module_name: string;
          owner_user_id: string;
          run_at: string;
        };
        Returns: {
          id: string;
          last_run_at: string;
        }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
