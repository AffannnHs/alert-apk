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
      alert_responders: {
        Row: {
          acknowledged_at: string | null
          alert_id: string
          arrived_at: string | null
          created_at: string
          en_route_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_id: string
          arrived_at?: string | null
          created_at?: string
          en_route_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_id?: string
          arrived_at?: string | null
          created_at?: string
          en_route_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_responders_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          lat: number
          lng: number
          location: string | null
          reporter_name: string | null
          resolved_at: string | null
          severity: string
          status: string
          trigger_source: string | null
          triggered_by: string | null
          type: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat: number
          lng: number
          location?: string | null
          reporter_name?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          trigger_source?: string | null
          triggered_by?: string | null
          type: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          location?: string | null
          reporter_name?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          trigger_source?: string | null
          triggered_by?: string | null
          type?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          alert_id: string
          id: string
          message: string
          sender_id: string
          sent_at: string
        }
        Insert: {
          alert_id: string
          id?: string
          message: string
          sender_id: string
          sent_at?: string
        }
        Update: {
          alert_id?: string
          id?: string
          message?: string
          sender_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      iot_devices: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          last_ping_at: string | null
          last_triggered_at: string | null
          latitude: number | null
          longitude: number | null
          mqtt_topic: string | null
          name: string
          signal: number | null
          status: string
          triggers_today: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          last_ping_at?: string | null
          last_triggered_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mqtt_topic?: string | null
          name: string
          signal?: number | null
          status?: string
          triggers_today?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          last_ping_at?: string | null
          last_triggered_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mqtt_topic?: string | null
          name?: string
          signal?: number | null
          status?: string
          triggers_today?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      map_settings: {
        Row: {
          map_style: string | null
          preset_area: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          map_style?: string | null
          preset_area?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          map_style?: string | null
          preset_area?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          display_name: string | null
          email: string | null
          group_name: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          name: string | null
          phone: string | null
          rejected_at: string | null
          role: string | null
          status: string | null
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          group_name?: string | null
          id: string
          last_lat?: number | null
          last_lng?: number | null
          last_seen_at?: string | null
          name?: string | null
          phone?: string | null
          rejected_at?: string | null
          role?: string | null
          status?: string | null
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          group_name?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_seen_at?: string | null
          name?: string | null
          phone?: string | null
          rejected_at?: string | null
          role?: string | null
          status?: string | null
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_super_admin: { Args: never; Returns: boolean }
      get_my_group: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_status: { Args: never; Returns: string }
      is_active_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
