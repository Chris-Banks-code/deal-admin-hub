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
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          kind: string
          ledger_account_id: string | null
          name: string
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          kind?: string
          ledger_account_id?: string | null
          name: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          kind?: string
          ledger_account_id?: string | null
          name?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_ledger_account_id_fkey"
            columns: ["ledger_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          subtype: string | null
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          subtype?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          subtype?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          client_type: string
          cold_storage_available: boolean | null
          company_email: string | null
          company_name: string
          company_type: string | null
          company_website: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          credit_period_days: number | null
          credit_references: string | null
          default_commission_rate: number | null
          default_delivery_address: string | null
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
          retailer_tier: string | null
          secondary_contact_person: string | null
          secondary_contact_phone: string | null
          special_services: string | null
          status: string | null
          storage_facilities_available: boolean | null
          storage_facilities_description: string | null
          tax_certificate_url: string | null
          tax_id: string | null
          updated_at: string
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
          client_type?: string
          cold_storage_available?: boolean | null
          company_email?: string | null
          company_name: string
          company_type?: string | null
          company_website?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          credit_period_days?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          default_delivery_address?: string | null
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
          retailer_tier?: string | null
          secondary_contact_person?: string | null
          secondary_contact_phone?: string | null
          special_services?: string | null
          status?: string | null
          storage_facilities_available?: boolean | null
          storage_facilities_description?: string | null
          tax_certificate_url?: string | null
          tax_id?: string | null
          updated_at?: string
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
          client_type?: string
          cold_storage_available?: boolean | null
          company_email?: string | null
          company_name?: string
          company_type?: string | null
          company_website?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          credit_period_days?: number | null
          credit_references?: string | null
          default_commission_rate?: number | null
          default_delivery_address?: string | null
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
          retailer_tier?: string | null
          secondary_contact_person?: string | null
          secondary_contact_phone?: string | null
          special_services?: string | null
          status?: string | null
          storage_facilities_available?: boolean | null
          storage_facilities_description?: string | null
          tax_certificate_url?: string | null
          tax_id?: string | null
          updated_at?: string
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
      commission_payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_id: string | null
          period: string | null
          profile_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          period?: string | null
          profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          period?: string | null
          profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_profile_id_fkey"
            columns: ["profile_id"]
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
      deals: {
        Row: {
          agent_commission: number | null
          agent_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          deal_number: string | null
          deal_value: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_date: string | null
          has_multiple_products: boolean | null
          id: string
          notes: string | null
          operation_manager_commission: number | null
          operation_manager_id: string | null
          product_commission_rate: number | null
          product_name: string | null
          quantity: number | null
          retailer_id: string | null
          retailer_name: string | null
          status: string | null
          supervisor_commission: number | null
          supervisor_id: string | null
          total_items: number | null
          unit_price: number | null
          wholesaler_id: string | null
          wholesaler_name: string | null
        }
        Insert: {
          agent_commission?: number | null
          agent_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          deal_number?: string | null
          deal_value?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          has_multiple_products?: boolean | null
          id?: string
          notes?: string | null
          operation_manager_commission?: number | null
          operation_manager_id?: string | null
          product_commission_rate?: number | null
          product_name?: string | null
          quantity?: number | null
          retailer_id?: string | null
          retailer_name?: string | null
          status?: string | null
          supervisor_commission?: number | null
          supervisor_id?: string | null
          total_items?: number | null
          unit_price?: number | null
          wholesaler_id?: string | null
          wholesaler_name?: string | null
        }
        Update: {
          agent_commission?: number | null
          agent_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          deal_number?: string | null
          deal_value?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          has_multiple_products?: boolean | null
          id?: string
          notes?: string | null
          operation_manager_commission?: number | null
          operation_manager_id?: string | null
          product_commission_rate?: number | null
          product_name?: string | null
          quantity?: number | null
          retailer_id?: string | null
          retailer_name?: string | null
          status?: string | null
          supervisor_commission?: number | null
          supervisor_id?: string | null
          total_items?: number | null
          unit_price?: number | null
          wholesaler_id?: string | null
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
        ]
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expense_account_id: string | null
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          status: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_account_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_account_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          entry_date: string
          entry_number: string | null
          id: string
          memo: string | null
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          entry_number?: string | null
          id?: string
          memo?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          entry_number?: string | null
          id?: string
          memo?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_targets: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          id: string
          month: string
          notes: string | null
          onboarding_target: number | null
          target_amount: number | null
          target_currency: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          notes?: string | null
          onboarding_target?: number | null
          target_amount?: number | null
          target_currency?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          notes?: string | null
          onboarding_target?: number | null
          target_amount?: number | null
          target_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_targets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          direction: string
          id: string
          method: string
          notes: string | null
          payment_date: string
          profile_id: string | null
          reference: string | null
          sales_order_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          direction: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          profile_id?: string | null
          reference?: string | null
          sales_order_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          direction?: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          profile_id?: string | null
          reference?: string | null
          sales_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          commission_rate: number | null
          created_at: string | null
          currency: string
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
          currency?: string
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
          currency?: string
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_supplier_location_id_fkey"
            columns: ["supplier_location_id"]
            isOneToOne: false
            referencedRelation: "wholesaler_locations"
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
