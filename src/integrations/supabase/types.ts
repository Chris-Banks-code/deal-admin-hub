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
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          added_by_admin_id: string | null
          address: string | null
          admin_notes: string | null
          assigned_agent_id: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bulk_discount_available: boolean | null
          business_license_url: string | null
          business_registration_number: string | null
          certifications: string | null
          client_type: string | null
          cold_storage_available: boolean | null
          company_email: string | null
          company_name: string
          company_type: string | null
          company_website: string | null
          contact_person: string | null
          created_at: string | null
          credit_period_days: number | null
          credit_references: string | null
          default_commission_rate: number | null
          delivery_coverage_areas: string | null
          delivery_options: string | null
          id: string
          incorporation_certificate_url: string | null
          latitude: number | null
          longitude: number | null
          minimum_order_value: number | null
          notes: string | null
          operating_hours: Json | null
          payment_terms: string | null
          phone: string | null
          photo_urls: string[] | null
          price_list_url: string | null
          product_catalog_url: string | null
          product_categories: Json | null
          secondary_contact_person: string | null
          secondary_contact_phone: string | null
          special_services: string | null
          status: string | null
          storage_facilities_available: boolean | null
          storage_facilities_description: string | null
          tax_certificate_url: string | null
          tax_id: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by_admin_id: string | null
          year_established: number | null
        }
        Insert: {
          added_by_admin_id?: string | null
          address?: string | null
          admin_notes?: string | null
          assigned_agent_id?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bulk_discount_available?: boolean | null
          business_license_url?: string | null
          business_registration_number?: string | null
          certifications?: string | null
          client_type?: string | null
          cold_storage_available?: boolean | null
          company_email?: string | null
          company_name: string
          company_type?: string | null
          company_website?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_period_days?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          delivery_coverage_areas?: string | null
          delivery_options?: string | null
          id?: string
          incorporation_certificate_url?: string | null
          latitude?: number | null
          longitude?: number | null
          minimum_order_value?: number | null
          notes?: string | null
          operating_hours?: Json | null
          payment_terms?: string | null
          phone?: string | null
          photo_urls?: string[] | null
          price_list_url?: string | null
          product_catalog_url?: string | null
          product_categories?: Json | null
          secondary_contact_person?: string | null
          secondary_contact_phone?: string | null
          special_services?: string | null
          status?: string | null
          storage_facilities_available?: boolean | null
          storage_facilities_description?: string | null
          tax_certificate_url?: string | null
          tax_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
          year_established?: number | null
        }
        Update: {
          added_by_admin_id?: string | null
          address?: string | null
          admin_notes?: string | null
          assigned_agent_id?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bulk_discount_available?: boolean | null
          business_license_url?: string | null
          business_registration_number?: string | null
          certifications?: string | null
          client_type?: string | null
          cold_storage_available?: boolean | null
          company_email?: string | null
          company_name?: string
          company_type?: string | null
          company_website?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_period_days?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          delivery_coverage_areas?: string | null
          delivery_options?: string | null
          id?: string
          incorporation_certificate_url?: string | null
          latitude?: number | null
          longitude?: number | null
          minimum_order_value?: number | null
          notes?: string | null
          operating_hours?: Json | null
          payment_terms?: string | null
          phone?: string | null
          photo_urls?: string[] | null
          price_list_url?: string | null
          product_catalog_url?: string | null
          product_categories?: Json | null
          secondary_contact_person?: string | null
          secondary_contact_phone?: string | null
          special_services?: string | null
          status?: string | null
          storage_facilities_available?: boolean | null
          storage_facilities_description?: string | null
          tax_certificate_url?: string | null
          tax_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by_admin_id?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_added_by_admin_id_fkey"
            columns: ["added_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_verified_by_admin_id_fkey"
            columns: ["verified_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number | null
          commission_type: string | null
          created_at: string | null
          deal_id: string | null
          id: string
          paid_at: string | null
          profile_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          commission_type?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          paid_at?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          commission_type?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          paid_at?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          added_by: string | null
          assigned_agent_id: string | null
          created_at: string
          credit_limit: number | null
          default_delivery_address: string | null
          id: string
          party_id: string
          payment_terms: string | null
          retailer_tier: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          added_by?: string | null
          assigned_agent_id?: string | null
          created_at?: string
          credit_limit?: number | null
          default_delivery_address?: string | null
          id?: string
          party_id: string
          payment_terms?: string | null
          retailer_tier?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          added_by?: string | null
          assigned_agent_id?: string | null
          created_at?: string
          credit_limit?: number | null
          default_delivery_address?: string | null
          id?: string
          party_id?: string
          payment_terms?: string | null
          retailer_tier?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: true
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agent_commission: number | null
          agent_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          deal_number: string | null
          deal_value: number | null
          delivery_address: string | null
          delivery_date: string | null
          has_multiple_products: boolean | null
          id: string
          notes: string | null
          operation_manager_commission: number | null
          product_name: string | null
          quantity: number | null
          retailer_id: string | null
          retailer_name: string | null
          status: string | null
          supervisor_commission: number | null
          total_items: number | null
          unit_price: number | null
          wholesaler_name: string | null
        }
        Insert: {
          agent_commission?: number | null
          agent_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          deal_number?: string | null
          deal_value?: number | null
          delivery_address?: string | null
          delivery_date?: string | null
          has_multiple_products?: boolean | null
          id?: string
          notes?: string | null
          operation_manager_commission?: number | null
          product_name?: string | null
          quantity?: number | null
          retailer_id?: string | null
          retailer_name?: string | null
          status?: string | null
          supervisor_commission?: number | null
          total_items?: number | null
          unit_price?: number | null
          wholesaler_name?: string | null
        }
        Update: {
          agent_commission?: number | null
          agent_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          deal_number?: string | null
          deal_value?: number | null
          delivery_address?: string | null
          delivery_date?: string | null
          has_multiple_products?: boolean | null
          id?: string
          notes?: string | null
          operation_manager_commission?: number | null
          product_name?: string | null
          quantity?: number | null
          retailer_id?: string | null
          retailer_name?: string | null
          status?: string | null
          supervisor_commission?: number | null
          total_items?: number | null
          unit_price?: number | null
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
            foreignKeyName: "deals_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          deal_id: string | null
          id: string
          product_id: string | null
          product_name: string | null
          quantity: number | null
          subtotal: number | null
          unit_price: number | null
          wholesaler_id: string | null
          wholesaler_location_id: string | null
          wholesaler_name: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          deal_id?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          subtotal?: number | null
          unit_price?: number | null
          wholesaler_id?: string | null
          wholesaler_location_id?: string | null
          wholesaler_name?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          deal_id?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          subtotal?: number | null
          unit_price?: number | null
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
          {
            foreignKeyName: "order_items_wholesaler_location_id_fkey"
            columns: ["wholesaler_location_id"]
            isOneToOne: false
            referencedRelation: "wholesaler_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          latitude: number | null
          legal_name: string
          longitude: number | null
          notes: string | null
          party_type: Database["public"]["Enums"]["party_type"]
          phone: string | null
          registration_number: string | null
          status: string
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          legal_name: string
          longitude?: number | null
          notes?: string | null
          party_type?: Database["public"]["Enums"]["party_type"]
          phone?: string | null
          registration_number?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          legal_name?: string
          longitude?: number | null
          notes?: string | null
          party_type?: Database["public"]["Enums"]["party_type"]
          phone?: string | null
          registration_number?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          commission_rate: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          stock_quantity: number | null
          unit_price: number | null
          wholesaler_id: string | null
          wholesaler_location_id: string | null
        }
        Insert: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          stock_quantity?: number | null
          unit_price?: number | null
          wholesaler_id?: string | null
          wholesaler_location_id?: string | null
        }
        Update: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          stock_quantity?: number | null
          unit_price?: number | null
          wholesaler_id?: string | null
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
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          push_token: string | null
          role: string | null
          status: string | null
          supervisor_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          push_token?: string | null
          role?: string | null
          status?: string | null
          supervisor_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          push_token?: string | null
          role?: string | null
          status?: string | null
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_module_permissions: {
        Row: {
          can_approve: boolean
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sales_order_id: string
          subtotal: number
          supplier_id: string | null
          supplier_location_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sales_order_id: string
          subtotal?: number
          supplier_id?: string | null
          supplier_location_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sales_order_id?: string
          subtotal?: number
          supplier_id?: string | null
          supplier_location_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_supplier_location_id_fkey"
            columns: ["supplier_location_id"]
            isOneToOne: false
            referencedRelation: "supplier_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          agent_commission_total: number | null
          agent_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_id: string | null
          delivery_address: string | null
          delivery_date: string | null
          id: string
          manager_commission_total: number | null
          notes: string | null
          order_number: string | null
          status: Database["public"]["Enums"]["sales_order_status"]
          subtotal: number | null
          supervisor_commission_total: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          agent_commission_total?: number | null
          agent_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          id?: string
          manager_commission_total?: number | null
          notes?: string | null
          order_number?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          subtotal?: number | null
          supervisor_commission_total?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          agent_commission_total?: number | null
          agent_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          id?: string
          manager_commission_total?: number | null
          notes?: string | null
          order_number?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          subtotal?: number | null
          supervisor_commission_total?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_locations: {
        Row: {
          address: string | null
          branch_manager_name: string | null
          branch_name: string
          branch_phone: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          latitude: number | null
          longitude: number | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_manager_name?: string | null
          branch_name: string
          branch_phone?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_manager_name?: string | null
          branch_name?: string
          branch_phone?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_locations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          added_by: string | null
          admin_notes: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bulk_discount_available: boolean | null
          business_license_url: string | null
          certifications: string[] | null
          cold_storage_available: boolean | null
          company_type: string | null
          created_at: string
          credit_period_days: number | null
          credit_references: string | null
          default_commission_rate: number | null
          delivery_coverage_areas: string | null
          delivery_options: string | null
          id: string
          incorporation_certificate_url: string | null
          minimum_order_value: number | null
          operating_hours: Json | null
          party_id: string
          payment_terms: string | null
          photo_urls: string[] | null
          price_list_url: string | null
          product_catalog_url: string | null
          product_categories: Json | null
          secondary_contact_person: string | null
          secondary_contact_phone: string | null
          special_services: string[] | null
          storage_facilities_available: boolean | null
          storage_facilities_description: string | null
          tax_certificate_url: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          year_established: number | null
        }
        Insert: {
          added_by?: string | null
          admin_notes?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bulk_discount_available?: boolean | null
          business_license_url?: string | null
          certifications?: string[] | null
          cold_storage_available?: boolean | null
          company_type?: string | null
          created_at?: string
          credit_period_days?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          delivery_coverage_areas?: string | null
          delivery_options?: string | null
          id?: string
          incorporation_certificate_url?: string | null
          minimum_order_value?: number | null
          operating_hours?: Json | null
          party_id: string
          payment_terms?: string | null
          photo_urls?: string[] | null
          price_list_url?: string | null
          product_catalog_url?: string | null
          product_categories?: Json | null
          secondary_contact_person?: string | null
          secondary_contact_phone?: string | null
          special_services?: string[] | null
          storage_facilities_available?: boolean | null
          storage_facilities_description?: string | null
          tax_certificate_url?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          year_established?: number | null
        }
        Update: {
          added_by?: string | null
          admin_notes?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bulk_discount_available?: boolean | null
          business_license_url?: string | null
          certifications?: string[] | null
          cold_storage_available?: boolean | null
          company_type?: string | null
          created_at?: string
          credit_period_days?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          delivery_coverage_areas?: string | null
          delivery_options?: string | null
          id?: string
          incorporation_certificate_url?: string | null
          minimum_order_value?: number | null
          operating_hours?: Json | null
          party_id?: string
          payment_terms?: string | null
          photo_urls?: string[] | null
          price_list_url?: string | null
          product_catalog_url?: string | null
          product_categories?: Json | null
          secondary_contact_person?: string | null
          secondary_contact_phone?: string | null
          special_services?: string[] | null
          storage_facilities_available?: boolean | null
          storage_facilities_description?: string | null
          tax_certificate_url?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: true
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wholesaler_locations: {
        Row: {
          address: string | null
          branch_manager_name: string | null
          branch_name: string | null
          branch_phone: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          latitude: number | null
          longitude: number | null
          wholesaler_id: string | null
        }
        Insert: {
          address?: string | null
          branch_manager_name?: string | null
          branch_name?: string | null
          branch_phone?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          wholesaler_id?: string | null
        }
        Update: {
          address?: string | null
          branch_manager_name?: string | null
          branch_name?: string | null
          branch_phone?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          wholesaler_id?: string | null
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
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "ceo"
        | "executive"
        | "admin"
        | "operation_manager"
        | "finance_manager"
        | "warehouse_manager"
        | "procurement_manager"
        | "product_manager"
        | "regional_manager"
        | "customer_service"
        | "internal_auditor"
        | "supervisor"
        | "sales_agent"
      party_type: "customer" | "supplier" | "both"
      sales_order_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "fulfilled"
        | "cancelled"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      app_role: [
        "super_admin",
        "ceo",
        "executive",
        "admin",
        "operation_manager",
        "finance_manager",
        "warehouse_manager",
        "procurement_manager",
        "product_manager",
        "regional_manager",
        "customer_service",
        "internal_auditor",
        "supervisor",
        "sales_agent",
      ],
      party_type: ["customer", "supplier", "both"],
      sales_order_status: [
        "draft",
        "pending_approval",
        "approved",
        "fulfilled",
        "cancelled",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
