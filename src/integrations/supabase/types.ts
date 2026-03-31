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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          account_name: string | null
          account_number: string | null
          added_by_admin_id: string | null
          address: string | null
          assigned_agent_id: string | null
          bank_branch: string | null
          bank_name: string | null
          bulk_discount_available: boolean | null
          business_license_url: string | null
          business_registration_number: string | null
          certifications: string | null
          client_type: string
          cold_storage: boolean | null
          company_email: string | null
          company_name: string
          company_type: string | null
          company_website: string | null
          contact_person: string
          created_at: string | null
          credit_period: number | null
          credit_references: string | null
          default_commission_rate: number | null
          delivery_coverage_areas: string | null
          delivery_options: string | null
          id: string
          incorporation_cert_url: string | null
          latitude: number | null
          longitude: number | null
          minimum_order_value: number | null
          no_mov: boolean | null
          notes: string | null
          operating_hours: Json | null
          payment_terms: string | null
          phone: string
          price_list_url: string | null
          product_catalog_url: string | null
          product_categories: string[] | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          special_services: string | null
          status: string | null
          storage_description: string | null
          storage_facilities: boolean | null
          tax_certificate_url: string | null
          tax_id: string | null
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by_admin_id: string | null
          year_established: number | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          added_by_admin_id?: string | null
          address?: string | null
          assigned_agent_id?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bulk_discount_available?: boolean | null
          business_license_url?: string | null
          business_registration_number?: string | null
          certifications?: string | null
          client_type: string
          cold_storage?: boolean | null
          company_email?: string | null
          company_name: string
          company_type?: string | null
          company_website?: string | null
          contact_person: string
          created_at?: string | null
          credit_period?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          delivery_coverage_areas?: string | null
          delivery_options?: string | null
          id?: string
          incorporation_cert_url?: string | null
          latitude?: number | null
          longitude?: number | null
          minimum_order_value?: number | null
          no_mov?: boolean | null
          notes?: string | null
          operating_hours?: Json | null
          payment_terms?: string | null
          phone: string
          price_list_url?: string | null
          product_catalog_url?: string | null
          product_categories?: string[] | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          special_services?: string | null
          status?: string | null
          storage_description?: string | null
          storage_facilities?: boolean | null
          tax_certificate_url?: string | null
          tax_id?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
          year_established?: number | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          added_by_admin_id?: string | null
          address?: string | null
          assigned_agent_id?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bulk_discount_available?: boolean | null
          business_license_url?: string | null
          business_registration_number?: string | null
          certifications?: string | null
          client_type?: string
          cold_storage?: boolean | null
          company_email?: string | null
          company_name?: string
          company_type?: string | null
          company_website?: string | null
          contact_person?: string
          created_at?: string | null
          credit_period?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          delivery_coverage_areas?: string | null
          delivery_options?: string | null
          id?: string
          incorporation_cert_url?: string | null
          latitude?: number | null
          longitude?: number | null
          minimum_order_value?: number | null
          no_mov?: boolean | null
          notes?: string | null
          operating_hours?: Json | null
          payment_terms?: string | null
          phone?: string
          price_list_url?: string | null
          product_catalog_url?: string | null
          product_categories?: string[] | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          special_services?: string | null
          status?: string | null
          storage_description?: string | null
          storage_facilities?: boolean | null
          tax_certificate_url?: string | null
          tax_id?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          deal_id: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string | null
          deal_id: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          deal_id?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          admin_notes: string | null
          agent_commission: number
          agent_id: string
          agent_notes: string | null
          commission_amount: number | null
          commission_rate: number | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          deal_number: string
          deal_value: number
          delivered_at: string | null
          delivery_address: string | null
          delivery_date: string | null
          has_multiple_products: boolean | null
          id: string
          notes: string | null
          operation_manager_commission: number | null
          operation_manager_id: string | null
          product_commission_rate: number | null
          product_name: string
          quantity: string | null
          rejection_reason: string | null
          retailer_id: string
          retailer_name: string | null
          status: string | null
          supervisor_commission: number | null
          supervisor_id: string | null
          total_items: number | null
          unit_price: number | null
          updated_at: string | null
          wholesaler_id: string
          wholesaler_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          agent_commission: number
          agent_id: string
          agent_notes?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deal_number: string
          deal_value: number
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          has_multiple_products?: boolean | null
          id?: string
          notes?: string | null
          operation_manager_commission?: number | null
          operation_manager_id?: string | null
          product_commission_rate?: number | null
          product_name: string
          quantity?: string | null
          rejection_reason?: string | null
          retailer_id: string
          retailer_name?: string | null
          status?: string | null
          supervisor_commission?: number | null
          supervisor_id?: string | null
          total_items?: number | null
          unit_price?: number | null
          updated_at?: string | null
          wholesaler_id: string
          wholesaler_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          agent_commission?: number
          agent_id?: string
          agent_notes?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deal_number?: string
          deal_value?: number
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          has_multiple_products?: boolean | null
          id?: string
          notes?: string | null
          operation_manager_commission?: number | null
          operation_manager_id?: string | null
          product_commission_rate?: number | null
          product_name?: string
          quantity?: string | null
          rejection_reason?: string | null
          retailer_id?: string
          retailer_name?: string | null
          status?: string | null
          supervisor_commission?: number | null
          supervisor_id?: string | null
          total_items?: number | null
          unit_price?: number | null
          updated_at?: string | null
          wholesaler_id?: string
          wholesaler_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_operation_manager_id_fkey"
            columns: ["operation_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          deal_id: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          wholesaler_id: string | null
          wholesaler_location_id: string | null
          wholesaler_name: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          deal_id: string
          id?: string
          product_id: string
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          wholesaler_id?: string | null
          wholesaler_location_id?: string | null
          wholesaler_name?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          deal_id?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          wholesaler_id?: string | null
          wholesaler_location_id?: string | null
          wholesaler_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          commission_rate: number | null
          created_at: string | null
          description: string | null
          distance_from_retailer: number | null
          id: string
          minimum_order: number | null
          product_name: string
          status: string | null
          stock_available: number | null
          stock_quantity: number | null
          unit_price: number
          unit_type: string
          updated_at: string | null
          wholesaler_id: string
          wholesaler_location_id: string | null
        }
        Insert: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          distance_from_retailer?: number | null
          id?: string
          minimum_order?: number | null
          product_name: string
          status?: string | null
          stock_available?: number | null
          stock_quantity?: number | null
          unit_price: number
          unit_type: string
          updated_at?: string | null
          wholesaler_id: string
          wholesaler_location_id?: string | null
        }
        Update: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          distance_from_retailer?: number | null
          id?: string
          minimum_order?: number | null
          product_name?: string
          status?: string | null
          stock_available?: number | null
          stock_quantity?: number | null
          unit_price?: number
          unit_type?: string
          updated_at?: string | null
          wholesaler_id?: string
          wholesaler_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_wholesaler_location_id_fkey"
            columns: ["wholesaler_location_id"]
            isOneToOne: false
            referencedRelation: "wholesaler_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          operation_manager_id: string | null
          phone: string
          push_token: string | null
          role: string
          status: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          operation_manager_id?: string | null
          phone: string
          push_token?: string | null
          role: string
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          operation_manager_id?: string | null
          phone?: string
          push_token?: string | null
          role?: string
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_operation_manager_id_fkey"
            columns: ["operation_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesaler_locations: {
        Row: {
          address: string
          branch_name: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          latitude: number
          longitude: number
          status: string | null
          updated_at: string | null
          wholesaler_id: string
        }
        Insert: {
          address: string
          branch_name: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          latitude: number
          longitude: number
          status?: string | null
          updated_at?: string | null
          wholesaler_id: string
        }
        Update: {
          address?: string
          branch_name?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          latitude?: number
          longitude?: number
          status?: string | null
          updated_at?: string | null
          wholesaler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesaler_locations_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_deal_commissions: {
        Args: { p_deal_id: string }
        Returns: undefined
      }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_manager: { Args: never; Returns: boolean }
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
