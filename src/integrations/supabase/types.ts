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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      antrag: {
        Row: {
          adresse_elterngeldstelle: string | null
          antrag_timestamp: string | null
          created_at: string | null
          datum: string | null
          expires_at: string | null
          id: string
          ort: string | null
          ort_datum: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adresse_elterngeldstelle?: string | null
          antrag_timestamp?: string | null
          created_at?: string | null
          datum?: string | null
          expires_at?: string | null
          id?: string
          ort?: string | null
          ort_datum?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adresse_elterngeldstelle?: string | null
          antrag_timestamp?: string | null
          created_at?: string | null
          datum?: string | null
          expires_at?: string | null
          id?: string
          ort?: string | null
          ort_datum?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      antrag_2a_alleinerziehende: {
        Row: {
          anderer_unmoeglich_betreuung: boolean | null
          antrag_id: string
          betreuung_gefaehrdet_wohl: boolean | null
          created_at: string | null
          id: string
          ist_alleinerziehend: boolean | null
        }
        Insert: {
          anderer_unmoeglich_betreuung?: boolean | null
          antrag_id: string
          betreuung_gefaehrdet_wohl?: boolean | null
          created_at?: string | null
          id?: string
          ist_alleinerziehend?: boolean | null
        }
        Update: {
          anderer_unmoeglich_betreuung?: boolean | null
          antrag_id?: string
          betreuung_gefaehrdet_wohl?: boolean | null
          created_at?: string | null
          id?: string
          ist_alleinerziehend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2a_alleinerziehende_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2b_elternteil: {
        Row: {
          antrag_id: string
          created_at: string | null
          geburtsdatum: string | null
          geburtsdatum_2: string | null
          geschlecht: Database["public"]["Enums"]["geschlecht_type"] | null
          geschlecht_2: Database["public"]["Enums"]["geschlecht_type"] | null
          id: string
          nachname: string | null
          nachname_2: string | null
          steuer_identifikationsnummer: string | null
          steuer_identifikationsnummer_2: string | null
          vorname: string | null
          vorname_2: string | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          geburtsdatum?: string | null
          geburtsdatum_2?: string | null
          geschlecht?: Database["public"]["Enums"]["geschlecht_type"] | null
          geschlecht_2?: Database["public"]["Enums"]["geschlecht_type"] | null
          id?: string
          nachname?: string | null
          nachname_2?: string | null
          steuer_identifikationsnummer?: string | null
          steuer_identifikationsnummer_2?: string | null
          vorname?: string | null
          vorname_2?: string | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          geburtsdatum?: string | null
          geburtsdatum_2?: string | null
          geschlecht?: Database["public"]["Enums"]["geschlecht_type"] | null
          geschlecht_2?: Database["public"]["Enums"]["geschlecht_type"] | null
          id?: string
          nachname?: string | null
          nachname_2?: string | null
          steuer_identifikationsnummer?: string | null
          steuer_identifikationsnummer_2?: string | null
          vorname?: string | null
          vorname_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2b_elternteil_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2c_wohnsitz: {
        Row: {
          adresszusatz: string | null
          antrag_id: string
          arbeitsvertrag_deutsches_recht_ja: boolean | null
          arbeitsvertrag_deutsches_recht_nein: boolean | null
          aufenthalt_befristet: boolean | null
          aufenthalt_befristet_bis: string | null
          aufenthalt_befristet_von: string | null
          aufenthalt_unbefristet: boolean | null
          aufenthalt_unbefristet_seit: string | null
          ausland_arbeitgeber_sitz_ort: string | null
          ausland_arbeitgeber_sitz_plz: string | null
          ausland_aufenthaltsgrund: string | null
          ausland_staat: string | null
          ausland_strasse: string | null
          created_at: string | null
          hausnr: string | null
          id: string
          ort: string | null
          plz: string | null
          strasse: string | null
          wohnsitz_ausland: boolean | null
        }
        Insert: {
          adresszusatz?: string | null
          antrag_id: string
          arbeitsvertrag_deutsches_recht_ja?: boolean | null
          arbeitsvertrag_deutsches_recht_nein?: boolean | null
          aufenthalt_befristet?: boolean | null
          aufenthalt_befristet_bis?: string | null
          aufenthalt_befristet_von?: string | null
          aufenthalt_unbefristet?: boolean | null
          aufenthalt_unbefristet_seit?: string | null
          ausland_arbeitgeber_sitz_ort?: string | null
          ausland_arbeitgeber_sitz_plz?: string | null
          ausland_aufenthaltsgrund?: string | null
          ausland_staat?: string | null
          ausland_strasse?: string | null
          created_at?: string | null
          hausnr?: string | null
          id?: string
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          wohnsitz_ausland?: boolean | null
        }
        Update: {
          adresszusatz?: string | null
          antrag_id?: string
          arbeitsvertrag_deutsches_recht_ja?: boolean | null
          arbeitsvertrag_deutsches_recht_nein?: boolean | null
          aufenthalt_befristet?: boolean | null
          aufenthalt_befristet_bis?: string | null
          aufenthalt_befristet_von?: string | null
          aufenthalt_unbefristet?: boolean | null
          aufenthalt_unbefristet_seit?: string | null
          ausland_arbeitgeber_sitz_ort?: string | null
          ausland_arbeitgeber_sitz_plz?: string | null
          ausland_aufenthaltsgrund?: string | null
          ausland_staat?: string | null
          ausland_strasse?: string | null
          created_at?: string | null
          hausnr?: string | null
          id?: string
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          wohnsitz_ausland?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2c_wohnsitz_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2c_wohnsitz_aufenthalt: {
        Row: {
          antrag_id: string
          created_at: string | null
          id: string
          seit_datum_deutschland: string | null
          seit_in_deutschland: boolean | null
          seit_meiner_geburt: boolean | null
          wohnsitz_in_deutschland: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          id?: string
          seit_datum_deutschland?: string | null
          seit_in_deutschland?: boolean | null
          seit_meiner_geburt?: boolean | null
          wohnsitz_in_deutschland?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          id?: string
          seit_datum_deutschland?: string | null
          seit_in_deutschland?: boolean | null
          seit_meiner_geburt?: boolean | null
          wohnsitz_in_deutschland?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2c_wohnsitz_aufenthalt_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_logs: {
        Row: {
          antrag_id: string | null
          confidence_score: number | null
          created_at: string | null
          extracted_text: string | null
          field_name: string | null
          field_value: string | null
          id: string
          user_file_id: string
        }
        Insert: {
          antrag_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          extracted_text?: string | null
          field_name?: string | null
          field_value?: string | null
          id?: string
          user_file_id: string
        }
        Update: {
          antrag_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          extracted_text?: string | null
          field_name?: string | null
          field_value?: string | null
          id?: string
          user_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_logs_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_logs_user_file_id_fkey"
            columns: ["user_file_id"]
            isOneToOne: false
            referencedRelation: "user_files"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          mapping_file_path: string | null
          storage_path: string
          template_name: string
          updated_at: string | null
          valid_from: string
          valid_until: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          mapping_file_path?: string | null
          storage_path: string
          template_name: string
          updated_at?: string | null
          valid_from: string
          valid_until?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          mapping_file_path?: string | null
          storage_path?: string
          template_name?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
          version?: string
        }
        Relationships: []
      }
      kind: {
        Row: {
          antrag_id: string
          anzahl_mehrlinge: number | null
          anzahl_weitere_kinder: number | null
          behinderung: boolean | null
          created_at: string | null
          errechneter_geburtsdatum: string | null
          fruehgeboren: boolean | null
          geburtsdatum: string | null
          id: string
          insgesamt: boolean | null
          keine_weitere_kinder: boolean | null
          nachname: string | null
          vorname: string | null
        }
        Insert: {
          antrag_id: string
          anzahl_mehrlinge?: number | null
          anzahl_weitere_kinder?: number | null
          behinderung?: boolean | null
          created_at?: string | null
          errechneter_geburtsdatum?: string | null
          fruehgeboren?: boolean | null
          geburtsdatum?: string | null
          id?: string
          insgesamt?: boolean | null
          keine_weitere_kinder?: boolean | null
          nachname?: string | null
          vorname?: string | null
        }
        Update: {
          antrag_id?: string
          anzahl_mehrlinge?: number | null
          anzahl_weitere_kinder?: number | null
          behinderung?: boolean | null
          created_at?: string | null
          errechneter_geburtsdatum?: string | null
          fruehgeboren?: boolean | null
          geburtsdatum?: string | null
          id?: string
          insgesamt?: boolean | null
          keine_weitere_kinder?: boolean | null
          nachname?: string | null
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kind_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      user_files: {
        Row: {
          antrag_id: string | null
          expires_at: string | null
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["file_status"] | null
          storage_path: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["file_status"] | null
          storage_path?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["file_status"] | null
          storage_path?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_files_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_active_template: {
        Args: { p_template_name: string }
        Returns: {
          display_name: string
          id: string
          mapping_file_path: string
          storage_path: string
          template_name: string
          version: string
        }[]
      }
    }
    Enums: {
      file_status:
        | "uploaded"
        | "processing"
        | "extracted"
        | "completed"
        | "error"
      geschlecht_type: "weiblich" | "maennlich" | "divers" | "ohne_angabe"
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
      file_status: [
        "uploaded",
        "processing",
        "extracted",
        "completed",
        "error",
      ],
      geschlecht_type: ["weiblich", "maennlich", "divers", "ohne_angabe"],
    },
  },
} as const
