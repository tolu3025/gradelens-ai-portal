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
      predictions: {
        Row: {
          id: string
          matric_no: string
          current_cgpa: number
          predicted_gpa: number
          predicted_cgpa: number
          risk_level: string
          risk_probability: number
          trend_direction: string
          trend_slope: number
          recommendations: Json
          failed_courses_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          matric_no: string
          current_cgpa?: number
          predicted_gpa?: number
          predicted_cgpa?: number
          risk_level: string
          risk_probability?: number
          trend_direction: string
          trend_slope?: number
          recommendations?: Json
          failed_courses_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          matric_no?: string
          current_cgpa?: number
          predicted_gpa?: number
          predicted_cgpa?: number
          risk_level?: string
          risk_probability?: number
          trend_direction?: string
          trend_slope?: number
          recommendations?: Json
          failed_courses_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_matric_no_fkey"
            columns: ["matric_no"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["matric_no"]
          },
        ]
      }
      cgpa_summary: {
        Row: {
          cgpa: number
          classification: Database["public"]["Enums"]["classification_type"]
          last_updated: string
          level: number
          matric_no: string
          status: Database["public"]["Enums"]["status_type"]
          student_name: string | null
          total_credit_units: number
          total_weighted_points: number
        }
        Insert: {
          cgpa: number
          classification: Database["public"]["Enums"]["classification_type"]
          last_updated?: string
          level: number
          matric_no: string
          status: Database["public"]["Enums"]["status_type"]
          student_name?: string | null
          total_credit_units: number
          total_weighted_points: number
        }
        Update: {
          cgpa?: number
          classification?: Database["public"]["Enums"]["classification_type"]
          last_updated?: string
          level?: number
          matric_no?: string
          status?: Database["public"]["Enums"]["status_type"]
          student_name?: string | null
          total_credit_units?: number
          total_weighted_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "cgpa_summary_matric_no_fkey"
            columns: ["matric_no"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["matric_no"]
          },
        ]
      }
      counselor_referrals: {
        Row: {
          cgpa_at_referral: number
          counselor_id: number | null
          email_sent: boolean
          id: number
          matric_no: string
          meeting_deadline: string | null
          referral_reason: Database["public"]["Enums"]["referral_reason"]
          referred_at: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          cgpa_at_referral: number
          counselor_id?: number | null
          email_sent?: boolean
          id?: number
          matric_no: string
          meeting_deadline?: string | null
          referral_reason: Database["public"]["Enums"]["referral_reason"]
          referred_at?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          cgpa_at_referral?: number
          counselor_id?: number | null
          email_sent?: boolean
          id?: number
          matric_no?: string
          meeting_deadline?: string | null
          referral_reason?: Database["public"]["Enums"]["referral_reason"]
          referred_at?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "counselor_referrals_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counselor_referrals_matric_no_fkey"
            columns: ["matric_no"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["matric_no"]
          },
        ]
      }
      counselors: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: number
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: number
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: number
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          course_code: string
          course_title: string
          created_at: string
          credit_units: number
          grade: string
          grade_point: number
          id: number
          level: number
          matric_no: string
          score: number
          semester: number
          student_name: string | null
          weighted_point: number
        }
        Insert: {
          course_code: string
          course_title: string
          created_at?: string
          credit_units: number
          grade: string
          grade_point: number
          id?: number
          level: number
          matric_no: string
          score: number
          semester: number
          student_name?: string | null
          weighted_point: number
        }
        Update: {
          course_code?: string
          course_title?: string
          created_at?: string
          credit_units?: number
          grade?: string
          grade_point?: number
          id?: number
          level?: number
          matric_no?: string
          score?: number
          semester?: number
          student_name?: string | null
          weighted_point?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_matric_no_fkey"
            columns: ["matric_no"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["matric_no"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          matric_no: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          matric_no?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          matric_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_matric_no_fkey"
            columns: ["matric_no"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["matric_no"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          department: string
          level: number
          matric_no: string
          programme: string
          student_name: string
        }
        Insert: {
          created_at?: string
          department?: string
          level: number
          matric_no: string
          programme?: string
          student_name: string
        }
        Update: {
          created_at?: string
          department?: string
          level?: number
          matric_no?: string
          programme?: string
          student_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      result_submissions: {
        Row: {
          id: number
          student_id: string | null
          matric_no: string
          student_name: string | null
          level: number
          semester: number
          courses_json: Json
          status: string
          submitted_at: string | null
          reviewed_at: string | null
          admin_notes: string | null
          screenshot_base64: string | null
        }
        Insert: {
          id?: number
          student_id?: string | null
          matric_no: string
          student_name?: string | null
          level: number
          semester: number
          courses_json: Json
          status?: string
          submitted_at?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          screenshot_base64?: string | null
        }
        Update: {
          id?: number
          student_id?: string | null
          matric_no?: string
          student_name?: string | null
          level?: number
          semester?: number
          courses_json?: Json
          status?: string
          submitted_at?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          screenshot_base64?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "counselor"
      classification_type:
        | "First Class"
        | "Second Class Upper"
        | "Second Class Lower"
        | "Third Class"
        | "Fail"
      referral_reason: "AVERAGE" | "BELOW AVERAGE"
      referral_status: "PENDING" | "COMPLETED" | "MISSED"
      status_type: "ABOVE AVERAGE" | "AVERAGE" | "BELOW AVERAGE"
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
      app_role: ["admin", "student", "counselor"],
      classification_type: [
        "First Class",
        "Second Class Upper",
        "Second Class Lower",
        "Third Class",
        "Fail",
      ],
      referral_reason: ["AVERAGE", "BELOW AVERAGE"],
      referral_status: ["PENDING", "COMPLETED", "MISSED"],
      status_type: ["ABOVE AVERAGE", "AVERAGE", "BELOW AVERAGE"],
    },
  },
} as const
