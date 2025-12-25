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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          marked_by: string | null
          note: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_no: string
          conduct: string | null
          created_at: string | null
          id: string
          is_duplicate: boolean | null
          issue_date: string | null
          issued_by: string | null
          reason: string | null
          student_id: string
          type: Database["public"]["Enums"]["certificate_type"]
        }
        Insert: {
          certificate_no: string
          conduct?: string | null
          created_at?: string | null
          id?: string
          is_duplicate?: boolean | null
          issue_date?: string | null
          issued_by?: string | null
          reason?: string | null
          student_id: string
          type: Database["public"]["Enums"]["certificate_type"]
        }
        Update: {
          certificate_no?: string
          conduct?: string | null
          created_at?: string | null
          id?: string
          is_duplicate?: boolean | null
          issue_date?: string | null
          issued_by?: string | null
          reason?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["certificate_type"]
        }
        Relationships: [
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          name: string
          name_bn: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          name: string
          name_bn?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          name?: string
          name_bn?: string | null
        }
        Relationships: []
      }
      exam_subjects: {
        Row: {
          created_at: string | null
          exam_date: string | null
          exam_id: string
          exam_time: string | null
          full_marks: number | null
          id: string
          mcq_marks: number | null
          pass_marks: number | null
          practical_marks: number | null
          subject_id: string | null
          subject_name: string
          written_marks: number | null
        }
        Insert: {
          created_at?: string | null
          exam_date?: string | null
          exam_id: string
          exam_time?: string | null
          full_marks?: number | null
          id?: string
          mcq_marks?: number | null
          pass_marks?: number | null
          practical_marks?: number | null
          subject_id?: string | null
          subject_name: string
          written_marks?: number | null
        }
        Update: {
          created_at?: string | null
          exam_date?: string | null
          exam_id?: string
          exam_time?: string | null
          full_marks?: number | null
          id?: string
          mcq_marks?: number | null
          pass_marks?: number | null
          practical_marks?: number | null
          subject_id?: string | null
          subject_name?: string
          written_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string | null
          class_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          type: Database["public"]["Enums"]["exam_type"] | null
        }
        Insert: {
          academic_year?: string | null
          class_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          type?: Database["public"]["Enums"]["exam_type"] | null
        }
        Update: {
          academic_year?: string | null
          class_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          type?: Database["public"]["Enums"]["exam_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_heads: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      fee_plans: {
        Row: {
          amount: number
          class_id: string
          created_at: string | null
          fee_head_id: string
          id: string
          shift: Database["public"]["Enums"]["shift_type"] | null
        }
        Insert: {
          amount?: number
          class_id: string
          created_at?: string | null
          fee_head_id: string
          id?: string
          shift?: Database["public"]["Enums"]["shift_type"] | null
        }
        Update: {
          amount?: number
          class_id?: string
          created_at?: string | null
          fee_head_id?: string
          id?: string
          shift?: Database["public"]["Enums"]["shift_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_fee_head_id_fkey"
            columns: ["fee_head_id"]
            isOneToOne: false
            referencedRelation: "fee_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string | null
          emergency_contact_mobile: string | null
          emergency_contact_name: string | null
          father_mobile: string
          father_name: string
          father_nid: string | null
          father_occupation: string | null
          id: string
          local_guardian_mobile: string | null
          local_guardian_name: string | null
          local_guardian_relation: string | null
          mother_mobile: string | null
          mother_name: string | null
          mother_nid: string | null
          mother_occupation: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          father_mobile: string
          father_name: string
          father_nid?: string | null
          father_occupation?: string | null
          id?: string
          local_guardian_mobile?: string | null
          local_guardian_name?: string | null
          local_guardian_relation?: string | null
          mother_mobile?: string | null
          mother_name?: string | null
          mother_nid?: string | null
          mother_occupation?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          father_mobile?: string
          father_name?: string
          father_nid?: string | null
          father_occupation?: string | null
          id?: string
          local_guardian_mobile?: string | null
          local_guardian_name?: string | null
          local_guardian_relation?: string | null
          mother_mobile?: string | null
          mother_name?: string | null
          mother_nid?: string | null
          mother_occupation?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          fee_head_id: string | null
          fee_head_name: string | null
          id: string
          invoice_id: string
        }
        Insert: {
          amount?: number
          fee_head_id?: string | null
          fee_head_name?: string | null
          id?: string
          invoice_id: string
        }
        Update: {
          amount?: number
          fee_head_id?: string | null
          fee_head_name?: string | null
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_fee_head_id_fkey"
            columns: ["fee_head_id"]
            isOneToOne: false
            referencedRelation: "fee_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount: number | null
          due_date: string | null
          fine: number | null
          id: string
          invoice_date: string | null
          invoice_no: string
          month: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          student_id: string
          subtotal: number | null
          total: number | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          due_date?: string | null
          fine?: number | null
          id?: string
          invoice_date?: string | null
          invoice_no: string
          month?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          student_id: string
          subtotal?: number | null
          total?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          due_date?: string | null
          fine?: number | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string
          month?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          student_id?: string
          subtotal?: number | null
          total?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          created_at: string | null
          exam_id: string
          exam_subject_id: string
          grade_point: number | null
          id: string
          letter_grade: string | null
          mcq: number | null
          practical: number | null
          student_id: string
          total: number | null
          written: number | null
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          exam_subject_id: string
          grade_point?: number | null
          id?: string
          letter_grade?: string | null
          mcq?: number | null
          practical?: number | null
          student_id: string
          total?: number | null
          written?: number | null
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          exam_subject_id?: string
          grade_point?: number | null
          id?: string
          letter_grade?: string | null
          mcq?: number | null
          practical?: number | null
          student_id?: string
          total?: number | null
          written?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_exam_subject_id_fkey"
            columns: ["exam_subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          received_by: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          received_by?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          received_by?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          academic_year: string | null
          address: string | null
          board: Database["public"]["Enums"]["board_type"] | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          name_bn: string | null
          phone: string | null
          session_year: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          name_bn?: string | null
          phone?: string | null
          session_year?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          name_bn?: string | null
          phone?: string | null
          session_year?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_credits: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          last_recharged: string | null
          total_purchased: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          last_recharged?: string | null
          total_purchased?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          last_recharged?: string | null
          total_purchased?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          message: string
          recipient: string
          sent_by: string | null
          status: Database["public"]["Enums"]["sms_status"] | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          message: string
          recipient: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["sms_status"] | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          message?: string
          recipient?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["sms_status"] | null
        }
        Relationships: []
      }
      sms_orders: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          package_size: number
          payment_method: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          package_size: number
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          package_size?: number
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          address_permanent: string | null
          address_present: string | null
          admission_date: string | null
          blood_group: string | null
          class_id: string | null
          created_at: string | null
          dob: string | null
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          name_bn: string | null
          name_en: string
          photo_url: string | null
          religion: string | null
          roll: number | null
          section_id: string | null
          shift: Database["public"]["Enums"]["shift_type"] | null
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          address_permanent?: string | null
          address_present?: string | null
          admission_date?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string | null
          dob?: string | null
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          name_bn?: string | null
          name_en: string
          photo_url?: string | null
          religion?: string | null
          roll?: number | null
          section_id?: string | null
          shift?: Database["public"]["Enums"]["shift_type"] | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          address_permanent?: string | null
          address_present?: string | null
          admission_date?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string | null
          dob?: string | null
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          name_bn?: string | null
          name_en?: string
          photo_url?: string | null
          religion?: string | null
          roll?: number | null
          section_id?: string | null
          shift?: Database["public"]["Enums"]["shift_type"] | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          created_at: string | null
          full_marks: number | null
          id: string
          is_optional: boolean | null
          name: string
          name_bn: string | null
          pass_marks: number | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          full_marks?: number | null
          id?: string
          is_optional?: boolean | null
          name: string
          name_bn?: string | null
          pass_marks?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          full_marks?: number | null
          id?: string
          is_optional?: boolean | null
          name?: string
          name_bn?: string | null
          pass_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          section_id: string | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          section_id?: string | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          section_id?: string | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "teacher" | "accountant"
      attendance_status: "present" | "absent" | "late" | "leave"
      board_type: "nctb" | "madrasah" | "cambridge"
      certificate_type: "transfer" | "character" | "hifz"
      exam_type: "class-test" | "mid-term" | "final" | "annual"
      gender_type: "male" | "female"
      invoice_status: "paid" | "partial" | "unpaid"
      payment_method: "cash" | "bkash" | "nagad" | "bank" | "card"
      shift_type: "morning" | "day" | "evening"
      sms_status: "sent" | "failed" | "pending"
      student_status: "active" | "inactive" | "transferred"
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
      app_role: ["admin", "teacher", "accountant"],
      attendance_status: ["present", "absent", "late", "leave"],
      board_type: ["nctb", "madrasah", "cambridge"],
      certificate_type: ["transfer", "character", "hifz"],
      exam_type: ["class-test", "mid-term", "final", "annual"],
      gender_type: ["male", "female"],
      invoice_status: ["paid", "partial", "unpaid"],
      payment_method: ["cash", "bkash", "nagad", "bank", "card"],
      shift_type: ["morning", "day", "evening"],
      sms_status: ["sent", "failed", "pending"],
      student_status: ["active", "inactive", "transferred"],
    },
  },
} as const
