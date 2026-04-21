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
          parent_name: string | null;
          notes: string | null;
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
          parent_name?: string | null;
          notes?: string | null;
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
          parent_name?: string | null;
          notes?: string | null;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      diagnoses: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          description: string | null;
          diagnosed_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          description?: string | null;
          diagnosed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
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
          parent_name: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          age: number;
          treatment_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
