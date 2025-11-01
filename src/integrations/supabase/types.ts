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
      antraege: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      antrag_geburtsurkunden: {
        Row: {
          antrag_id: string
          created_at: string
          geburtsurkunde_id: string
          id: string
        }
        Insert: {
          antrag_id: string
          created_at?: string
          geburtsurkunde_id: string
          id?: string
        }
        Update: {
          antrag_id?: string
          created_at?: string
          geburtsurkunde_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "antrag_geburtsurkunden_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antrag_geburtsurkunden_geburtsurkunde_id_fkey"
            columns: ["geburtsurkunde_id"]
            isOneToOne: false
            referencedRelation: "geburtsurkunden"
            referencedColumns: ["id"]
          },
        ]
      }
      eltern_dokumente: {
        Row: {
          ausstelldatum: string | null
          ausstellende_behoerde: string | null
          ausweisnummer: string | null
          created_at: string
          document_type: string
          file_path: string | null
          geburtsdatum: string | null
          geburtsname: string | null
          geburtsort: string | null
          gueltig_bis: string | null
          id: string
          nachname: string | null
          person_type: string
          staatsangehoerigkeit: string | null
          updated_at: string
          user_id: string
          vorname: string | null
        }
        Insert: {
          ausstelldatum?: string | null
          ausstellende_behoerde?: string | null
          ausweisnummer?: string | null
          created_at?: string
          document_type: string
          file_path?: string | null
          geburtsdatum?: string | null
          geburtsname?: string | null
          geburtsort?: string | null
          gueltig_bis?: string | null
          id?: string
          nachname?: string | null
          person_type: string
          staatsangehoerigkeit?: string | null
          updated_at?: string
          user_id: string
          vorname?: string | null
        }
        Update: {
          ausstelldatum?: string | null
          ausstellende_behoerde?: string | null
          ausweisnummer?: string | null
          created_at?: string
          document_type?: string
          file_path?: string | null
          geburtsdatum?: string | null
          geburtsname?: string | null
          geburtsort?: string | null
          gueltig_bis?: string | null
          id?: string
          nachname?: string | null
          person_type?: string
          staatsangehoerigkeit?: string | null
          updated_at?: string
          user_id?: string
          vorname?: string | null
        }
        Relationships: []
      }
      geburtsurkunden: {
        Row: {
          ausstelldatum: string | null
          behoerde_name: string | null
          created_at: string
          file_path: string | null
          id: string
          kind_geburtsdatum: string | null
          kind_geburtsnummer: string | null
          kind_geburtsort: string | null
          kind_nachname: string | null
          kind_vorname: string | null
          mutter_geburtsname: string | null
          mutter_nachname: string | null
          mutter_vorname: string | null
          updated_at: string
          urkundennummer: string | null
          user_id: string
          vater_nachname: string | null
          vater_vorname: string | null
          verwendungszweck: string | null
        }
        Insert: {
          ausstelldatum?: string | null
          behoerde_name?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind_geburtsdatum?: string | null
          kind_geburtsnummer?: string | null
          kind_geburtsort?: string | null
          kind_nachname?: string | null
          kind_vorname?: string | null
          mutter_geburtsname?: string | null
          mutter_nachname?: string | null
          mutter_vorname?: string | null
          updated_at?: string
          urkundennummer?: string | null
          user_id: string
          vater_nachname?: string | null
          vater_vorname?: string | null
          verwendungszweck?: string | null
        }
        Update: {
          ausstelldatum?: string | null
          behoerde_name?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind_geburtsdatum?: string | null
          kind_geburtsnummer?: string | null
          kind_geburtsort?: string | null
          kind_nachname?: string | null
          kind_vorname?: string | null
          mutter_geburtsname?: string | null
          mutter_nachname?: string | null
          mutter_vorname?: string | null
          updated_at?: string
          urkundennummer?: string | null
          user_id?: string
          vater_nachname?: string | null
          vater_vorname?: string | null
          verwendungszweck?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      geschlecht_type: ["weiblich", "maennlich", "divers", "ohne_angabe"],
    },
  },
} as const
