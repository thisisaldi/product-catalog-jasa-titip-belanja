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
      admin_access_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          label: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          label: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string | null
          product_id: string
          quantity: number
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          cached_stock: number
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_manually_unavailable: boolean
          name: string
          price: number
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          cached_stock?: number
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_manually_unavailable?: boolean
          name: string
          price: number
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          cached_stock?: number
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_manually_unavailable?: boolean
          name?: string
          price?: number
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          invoice_number: string
          note: string | null
          paid_at: string | null
          paid_by: string | null
          payment_status: string
          sale_status: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          invoice_number?: string
          note?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          sale_status?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          invoice_number?: string
          note?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          sale_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "admin_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          availability_message_template: string
          id: number
          invoice_message_template: string
          order_message_template: string
          updated_at: string
          updated_by: string | null
          whatsapp_number: string
        }
        Insert: {
          availability_message_template: string
          id?: number
          invoice_message_template: string
          order_message_template: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_number: string
        }
        Update: {
          availability_message_template?: string
          id?: number
          invoice_message_template?: string
          order_message_template?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_available: boolean | null
          name: string | null
          price: number | null
          slug: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_available?: never
          name?: string | null
          price?: number | null
          slug?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_available?: never
          name?: string | null
          price?: number | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_created_by: string
          p_note: string
          p_product_id: string
          p_quantity: number
          p_type: string
        }
        Returns: undefined
      }
      cancel_sale: {
        Args: { p_cancelled_by: string; p_sale_id: string }
        Returns: undefined
      }
      create_sale: {
        Args: {
          p_created_by: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_note: string
        }
        Returns: {
          id: string
          invoice_number: string
        }[]
      }
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
    Enums: {},
  },
} as const
