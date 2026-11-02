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
          is_active: boolean;
          total_bills_created: number | null;
          upi_id: string | null;
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
          is_active?: boolean;
          total_bills_created?: number;
          upi_id?: string | null;
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
          is_active?: boolean;
          total_bills_created?: number;
          upi_id?: string | null;
          updated_at?: string;
        };
      };
      shop_members: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          phone: string | null;
          full_name: string | null;
          role: string;
          is_active: boolean;
          permissions_override: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          phone?: string | null;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          permissions_override?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string;
          phone?: string | null;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          permissions_override?: any | null;
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
          table_number: string | null;
          status: string;
          subtotal: number;
          discount_type: string | null;
          discount_value: number | null;
          discount_amount: number | null;
          gst_rate: number;
          gst_amount: number;
          total_amount: number;
          paid_amount: number;
          pending_amount: number;
          cash_amount: number | null;
          gpay_amount: number | null;
          payment_mode: string;
          client_operation_id: string | null;
          created_by: string | null;
          created_by_name: string | null;
          created_by_role: string | null;
          is_edited: boolean | null;
          edited_at: string | null;
          is_cancelled: boolean | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          bill_number: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          table_number?: string | null;
          status?: string;
          subtotal?: number;
          discount_type?: string | null;
          discount_value?: number | null;
          discount_amount?: number | null;
          gst_rate?: number;
          gst_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          pending_amount?: number;
          cash_amount?: number | null;
          gpay_amount?: number | null;
          payment_mode?: string;
          client_operation_id?: string | null;
          created_by?: string | null;
          created_by_name?: string | null;
          created_by_role?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          bill_number?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          table_number?: string | null;
          status?: string;
          subtotal?: number;
          discount_type?: string | null;
          discount_value?: number | null;
          discount_amount?: number | null;
          gst_rate?: number;
          gst_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          pending_amount?: number;
          cash_amount?: number | null;
          gpay_amount?: number | null;
          payment_mode?: string;
          client_operation_id?: string | null;
          is_edited?: boolean | null;
          edited_at?: string | null;
          is_cancelled?: boolean | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
      };
      bill_items: {
        Row: {
          id: string;
          bill_id: string;
          menu_item_id: string | null;
          item_name: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          is_half: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          bill_id: string;
          menu_item_id?: string | null;
          item_name: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          is_half?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          bill_id?: string;
          menu_item_id?: string | null;
          item_name?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          is_half?: boolean;
        };
      };
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string | null;
          location: string | null;
          notes: string | null;
          total_bills: number;
          pending_balance: number;
          status_tag: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone?: string | null;
          location?: string | null;
          notes?: string | null;
          total_bills?: number;
          pending_balance?: number;
          status_tag?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          phone?: string | null;
          location?: string | null;
          notes?: string | null;
          total_bills?: number;
          pending_balance?: number;
          status_tag?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          shop_id: string;
          description: string;
          amount: number;
          category: string | null;
          payment_mode: string | null;
          expense_date: string;
          created_by: string | null;
          created_by_name: string | null;
          created_by_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          description: string;
          amount: number;
          category?: string | null;
          payment_mode?: string | null;
          expense_date?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          created_by_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          description?: string;
          amount?: number;
          category?: string | null;
          payment_mode?: string | null;
          expense_date?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          shop_id: string;
          plan: string;
          status: string;
          amount: number;
          interval: string;
          trial_start_at: string | null;
          trial_end_at: string | null;
          subscription_start_at: string | null;
          subscription_end_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          payment_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          plan: string;
          status?: string;
          amount?: number;
          interval?: string;
          trial_start_at?: string | null;
          trial_end_at?: string | null;
          subscription_start_at?: string | null;
          subscription_end_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          plan?: string;
          status?: string;
          amount?: number;
          interval?: string;
          trial_start_at?: string | null;
          trial_end_at?: string | null;
          subscription_start_at?: string | null;
          subscription_end_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          payment_reference?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
