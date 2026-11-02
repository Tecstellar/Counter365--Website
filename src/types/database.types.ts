export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      shops: {
        Row: {
          id: string;
          name: string;
          shop_type: string;
          phone: string;
          email: string | null;
          address: string;
          city: string;
          state: string;
          country: string;
          pincode: string;
          latitude: number | null;
          longitude: number | null;
          logo_url: string | null;
          currency_code: string;
          timezone: string;
          gst_enabled: boolean;
          gst_rate: number;
          gst_number: string | null;
          round_off_enabled: boolean;
          daily_backup_enabled: boolean;
          printer_enabled: boolean;
          printer_name: string | null;
          table_management_enabled: boolean;
          table_count: number;
          owner_name: string | null;
          invoice_prefix: string | null;
          invoice_reset_cycle: string | null;
          total_bills_created: number | null;
          upi_id: string | null;
          max_staff_limit: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          shop_type: string;
          phone: string;
          email?: string | null;
          address: string;
          city: string;
          state?: string;
          country?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          logo_url?: string | null;
          currency_code?: string;
          timezone?: string;
          gst_enabled?: boolean;
          gst_rate?: number;
          gst_number?: string | null;
          round_off_enabled?: boolean;
          daily_backup_enabled?: boolean;
          printer_enabled?: boolean;
          printer_name?: string | null;
          table_management_enabled?: boolean;
          table_count?: number;
          owner_name?: string | null;
          invoice_prefix?: string | null;
          invoice_reset_cycle?: string | null;
          total_bills_created?: number;
          upi_id?: string | null;
          max_staff_limit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          shop_type?: string;
          phone?: string;
          email?: string | null;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          logo_url?: string | null;
          currency_code?: string;
          timezone?: string;
          gst_enabled?: boolean;
          gst_rate?: number;
          gst_number?: string | null;
          round_off_enabled?: boolean;
          daily_backup_enabled?: boolean;
          printer_enabled?: boolean;
          printer_name?: string | null;
          table_management_enabled?: boolean;
          table_count?: number;
          owner_name?: string | null;
          invoice_prefix?: string | null;
          invoice_reset_cycle?: string | null;
          total_bills_created?: number;
          upi_id?: string | null;
          max_staff_limit?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      shop_members: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string | null;
          role: string;
          full_name: string | null;
          phone: string | null;
          is_active: boolean;
          permissions_override: Json | null;
          deactivated_at: string | null;
          deactivated_by: string | null;
          deactivation_reason: string | null;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id?: string | null;
          role?: string;
          full_name?: string | null;
          phone?: string | null;
          is_active?: boolean;
          permissions_override?: Json | null;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          deactivation_reason?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string | null;
          role?: string;
          full_name?: string | null;
          phone?: string | null;
          is_active?: boolean;
          permissions_override?: Json | null;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          deactivation_reason?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          module: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          module: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          module?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role: string;
          permission_code: string;
          is_allowed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          role: string;
          permission_code: string;
          is_allowed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          permission_code?: string;
          is_allowed?: boolean;
        };
      };
      user_permission_overrides: {
        Row: {
          id: string;
          shop_member_id: string;
          permission_code: string;
          is_allowed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_member_id: string;
          permission_code: string;
          is_allowed: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_member_id?: string;
          permission_code?: string;
          is_allowed?: boolean;
          updated_at?: string;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string;
          name: string;
          price: number;
          half_price: number | null;
          has_half: boolean;
          is_favorite: boolean;
          is_available: boolean;
          image_url: string | null;
          image_prompt: string | null;
          image_status: string | null;
          cost_price: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id: string;
          name: string;
          price: number;
          half_price?: number | null;
          has_half?: boolean;
          is_favorite?: boolean;
          is_available?: boolean;
          image_url?: string | null;
          image_prompt?: string | null;
          image_status?: string | null;
          cost_price?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          category_id?: string;
          name?: string;
          price?: number;
          half_price?: number | null;
          has_half?: boolean;
          is_favorite?: boolean;
          is_available?: boolean;
          image_url?: string | null;
          image_prompt?: string | null;
          image_status?: string | null;
          cost_price?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          shop_id: string;
          bill_number: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          status: string;
          subtotal: number;
          discount_amount: number | null;
          discount_type: string | null;
          discount_value: number | null;
          discount_applied_by: string | null;
          gst_rate: number;
          gst_amount: number;
          total_amount: number;
          paid_amount: number;
          pending_amount: number;
          payment_mode: string;
          cash_amount: number | null;
          gpay_amount: number | null;
          table_number: string | null;
          notes: string | null;
          client_operation_id: string | null;
          created_by: string | null;
          created_by_name: string | null;
          created_by_role: string | null;
          is_edited: boolean | null;
          edited_at: string | null;
          edited_by_name: string | null;
          is_cancelled: boolean | null;
          cancellation_reason: string | null;
          created_at: string;
          completed_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          bill_number: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number | null;
          discount_type?: string | null;
          discount_value?: number | null;
          discount_applied_by?: string | null;
          gst_rate?: number;
          gst_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          pending_amount?: number;
          payment_mode?: string;
          cash_amount?: number | null;
          gpay_amount?: number | null;
          table_number?: string | null;
          notes?: string | null;
          client_operation_id?: string | null;
          created_by?: string | null;
          created_by_name?: string | null;
          created_by_role?: string | null;
          is_edited?: boolean | null;
          edited_at?: string | null;
          edited_by_name?: string | null;
          is_cancelled?: boolean | null;
          cancellation_reason?: string | null;
          created_at?: string;
          completed_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          bill_number?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number | null;
          discount_type?: string | null;
          discount_value?: number | null;
          discount_applied_by?: string | null;
          gst_rate?: number;
          gst_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          pending_amount?: number;
          payment_mode?: string;
          cash_amount?: number | null;
          gpay_amount?: number | null;
          table_number?: string | null;
          notes?: string | null;
          client_operation_id?: string | null;
          is_edited?: boolean | null;
          edited_at?: string | null;
          edited_by_name?: string | null;
          is_cancelled?: boolean | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
      };
      bill_items: {
        Row: {
          id: string;
          shop_id: string;
          bill_id: string;
          menu_item_id: string | null;
          item_name: string;
          is_half: boolean;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          bill_id: string;
          menu_item_id?: string | null;
          item_name: string;
          is_half?: boolean;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          bill_id?: string;
          menu_item_id?: string | null;
          item_name?: string;
          is_half?: boolean;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
        };
      };
      payments: {
        Row: {
          id: string;
          shop_id: string;
          bill_id: string;
          payment_mode: string;
          amount: number;
          status: string;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          bill_id: string;
          payment_mode: string;
          amount: number;
          status?: string;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          bill_id?: string;
          payment_mode?: string;
          amount?: number;
          status?: string;
          paid_at?: string;
        };
      };
      pending_payments: {
        Row: {
          id: string;
          shop_id: string;
          bill_id: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          amount_due: number;
          amount_paid: number;
          status: string;
          notes: string | null;
          settled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          bill_id: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          amount_due: number;
          amount_paid?: number;
          status?: string;
          notes?: string | null;
          settled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          bill_id?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          amount_due?: number;
          amount_paid?: number;
          status?: string;
          notes?: string | null;
          settled_at?: string | null;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string | null;
          total_bills: number;
          total_spent: number;
          pending_balance: number;
          location: string | null;
          status_tag: string | null;
          is_vip: boolean;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone?: string | null;
          total_bills?: number;
          total_spent?: number;
          pending_balance?: number;
          location?: string | null;
          status_tag?: string | null;
          is_vip?: boolean;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          phone?: string | null;
          total_bills?: number;
          total_spent?: number;
          pending_balance?: number;
          location?: string | null;
          status_tag?: string | null;
          is_vip?: boolean;
          notes?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string | null;
          supply_type: string;
          schedule: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone?: string | null;
          supply_type: string;
          schedule?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          phone?: string | null;
          supply_type?: string;
          schedule?: string | null;
          notes?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          shop_id: string;
          category: string | null;
          title: string;
          description: string | null;
          amount: number;
          payment_mode: string | null;
          expense_date: string;
          vendor_id: string | null;
          created_by_name: string | null;
          created_by_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category?: string | null;
          title: string;
          description?: string | null;
          amount: number;
          payment_mode?: string | null;
          expense_date?: string;
          vendor_id?: string | null;
          created_by_name?: string | null;
          created_by_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          category?: string | null;
          title?: string;
          description?: string | null;
          amount?: number;
          payment_mode?: string | null;
          expense_date?: string;
          vendor_id?: string | null;
          updated_at?: string;
        };
      };
      cash_sessions: {
        Row: {
          id: string;
          shop_id: string;
          opening_float: number;
          closing_cash: number;
          actual_cash: number;
          difference: number;
          total_sales: number;
          total_expenses: number;
          status: string;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          opening_float?: number;
          closing_cash?: number;
          actual_cash?: number;
          difference?: number;
          total_sales?: number;
          total_expenses?: number;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          opening_float?: number;
          closing_cash?: number;
          actual_cash?: number;
          difference?: number;
          total_sales?: number;
          total_expenses?: number;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          shop_id: string;
          plan: string;
          plan_name: string | null;
          status: string;
          amount: number;
          interval: string;
          duration_months: number | null;
          trial_start_at: string | null;
          trial_end_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          payment_reference: string | null;
          cashfree_order_id: string | null;
          payment_method: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          plan: string;
          plan_name?: string | null;
          status?: string;
          amount?: number;
          interval?: string;
          duration_months?: number | null;
          trial_start_at?: string | null;
          trial_end_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          payment_reference?: string | null;
          cashfree_order_id?: string | null;
          payment_method?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          plan?: string;
          plan_name?: string | null;
          status?: string;
          amount?: number;
          interval?: string;
          duration_months?: number | null;
          trial_start_at?: string | null;
          trial_end_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          payment_reference?: string | null;
          cashfree_order_id?: string | null;
          payment_method?: string | null;
          updated_at?: string;
        };
      };
      account_deletions: {
        Row: {
          id: string;
          user_id: string | null;
          shop_id: string | null;
          shop_name: string | null;
          owner_name: string | null;
          phone: string | null;
          reason: string;
          feedback: string | null;
          deleted_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          shop_id?: string | null;
          shop_name?: string | null;
          owner_name?: string | null;
          phone?: string | null;
          reason: string;
          feedback?: string | null;
          deleted_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          shop_id?: string | null;
          shop_name?: string | null;
          owner_name?: string | null;
          phone?: string | null;
          reason?: string;
          feedback?: string | null;
          deleted_at?: string;
          metadata?: Json | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
        };
      };
    };
  };
}
