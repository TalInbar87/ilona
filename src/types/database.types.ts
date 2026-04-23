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
      patients: {
        Row: {
          id: string;
          full_name: string;
          date_of_birth: string;
          id_number: string;
          phone: string | null;
          email: string | null;
          parent_name: string | null;
          notes: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          date_of_birth: string;
          id_number: string;
          phone?: string | null;
          email?: string | null;
          parent_name?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          date_of_birth?: string;
          id_number?: string;
          phone?: string | null;
          email?: string | null;
          parent_name?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      hearing_tests: {
        Row: {
          id: string;
          patient_id: string;
          test_date: string | null;
          results: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          test_date?: string | null;
          results?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          test_date?: string | null;
          results?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hearing_tests_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          }
        ];
      };
      supervisees: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      supervision_sessions: {
        Row: {
          id: string;
          supervisee_id: string;
          session_date: string;
          session_time: string | null;
          duration_min: number | null;
          goals: string | null;
          summary: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          supervisee_id: string;
          session_date: string;
          session_time?: string | null;
          duration_min?: number | null;
          goals?: string | null;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          session_date?: string;
          session_time?: string | null;
          duration_min?: number | null;
          goals?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supervision_sessions_supervisee_id_fkey";
            columns: ["supervisee_id"];
            isOneToOne: false;
            referencedRelation: "supervisees";
            referencedColumns: ["id"];
          }
        ];
      };
      supervision_files: {
        Row: {
          id: string;
          session_id: string;
          supervisee_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number | null;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          supervisee_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size?: number | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          file_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supervision_files_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "supervision_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      diagnoses: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          goals: string | null;
          description: string | null;
          diagnosed_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          goals?: string | null;
          description?: string | null;
          diagnosed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
          goals?: string | null;
          description?: string | null;
          diagnosed_at?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnoses_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          }
        ];
      };
      patient_files: {
        Row: {
          id: string;
          patient_id: string;
          diagnosis_id: string | null;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number | null;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          diagnosis_id?: string | null;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size?: number | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          diagnosis_id?: string | null;
          file_name?: string;
          storage_path?: string;
          mime_type?: string;
          file_size?: number | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "patient_files_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          }
        ];
      };
      treatments: {
        Row: {
          id: string;
          patient_id: string;
          session_date: string;
          session_time: string | null;
          notes: string | null;
          summary: string | null;
          tools: string | null;
          next_ideas: string | null;
          duration_min: number | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          session_date: string;
          session_time?: string | null;
          notes?: string | null;
          summary?: string | null;
          tools?: string | null;
          next_ideas?: string | null;
          duration_min?: number | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          session_date?: string;
          session_time?: string | null;
          notes?: string | null;
          summary?: string | null;
          tools?: string | null;
          next_ideas?: string | null;
          duration_min?: number | null;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treatments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          }
        ];
      };
      treatment_files: {
        Row: {
          id: string;
          treatment_id: string;
          patient_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number | null;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          id?: string;
          treatment_id: string;
          patient_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size?: number | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          id?: string;
          treatment_id?: string;
          patient_id?: string;
          file_name?: string;
          storage_path?: string;
          mime_type?: string;
          file_size?: number | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treatment_files_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          }
        ];
      };
      treatment_goals_bank: {
        Row: {
          id: string;
          text: string;
          use_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          use_count?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          text?: string;
          use_count?: number;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          title: string;
          start_time: string;
          end_time: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          start_time: string;
          end_time: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          start_time?: string;
          end_time?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          is_superuser: boolean;
          created_at: string;
          first_name: string | null;
          last_name: string | null;
        };
        Insert: {
          id: string;
          is_superuser?: boolean;
          created_at?: string;
          first_name?: string | null;
          last_name?: string | null;
        };
        Update: {
          is_superuser?: boolean;
          first_name?: string | null;
          last_name?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          start_time: string;
          end_time: string;
          title: string | null;
          status: "scheduled" | "completed" | "cancelled" | "no_show";
          treatment_id: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          start_time: string;
          end_time: string;
          title?: string | null;
          status?: "scheduled" | "completed" | "cancelled" | "no_show";
          treatment_id?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          start_time?: string;
          end_time?: string;
          title?: string | null;
          status?: "scheduled" | "completed" | "cancelled" | "no_show";
          treatment_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      patients_with_stats: {
        Row: {
          id: string;
          full_name: string;
          date_of_birth: string;
          id_number: string;
          phone: string | null;
          email: string | null;
          parent_name: string | null;
          notes: string | null;
          archived_at: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          age: number;
          treatment_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      upsert_goal_bank: {
        Args: { p_text: string };
        Returns: void;
      };
      is_superuser: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
