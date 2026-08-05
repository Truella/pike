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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
