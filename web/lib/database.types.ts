export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          id: string
          imei: string | null
          model: string | null
          nickname: string | null
          owner_id: string
          photo_url: string | null
          storage: string | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          imei?: string | null
          model?: string | null
          nickname?: string | null
          owner_id: string
          photo_url?: string | null
          storage?: string | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          imei?: string | null
          model?: string | null
          nickname?: string | null
          owner_id?: string
          photo_url?: string | null
          storage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          kind: string
          opened_by: string
          product_order_id: string | null
          reason: string
          resolution: string | null
          resolved_by: string | null
          service_order_id: string | null
          shop_id: string
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          kind: string
          opened_by: string
          product_order_id?: string | null
          reason: string
          resolution?: string | null
          resolved_by?: string | null
          service_order_id?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          kind?: string
          opened_by?: string
          product_order_id?: string | null
          reason?: string
          resolution?: string | null
          resolved_by?: string | null
          service_order_id?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_product_order_id_fkey"
            columns: ["product_order_id"]
            isOneToOne: false
            referencedRelation: "product_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          model: string | null
          photos: string[]
          price: number
          seller_id: string | null
          title: string
        }
        Insert: {
          brand?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          photos?: string[]
          price: number
          seller_id?: string | null
          title: string
        }
        Update: {
          brand?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          photos?: string[]
          price?: number
          seller_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string | null
          request_id: string | null
          sender_id: string
          shop_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id?: string | null
          request_id?: string | null
          sender_id: string
          shop_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string | null
          request_id?: string | null
          sender_id?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          commission: number
          created_at: string
          id: string
          method: string
          order_id: string
          paid_at: string | null
          pix_payload: string | null
          pix_qr: string | null
          provider: string
          provider_payment_id: string | null
          shop_amount: number
          shop_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          commission: number
          created_at?: string
          id?: string
          method?: string
          order_id: string
          paid_at?: string | null
          pix_payload?: string | null
          pix_qr?: string | null
          provider?: string
          provider_payment_id?: string | null
          shop_amount: number
          shop_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          commission?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          paid_at?: string | null
          pix_payload?: string | null
          pix_qr?: string | null
          provider?: string
          provider_payment_id?: string | null
          shop_amount?: number
          shop_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_order_items: {
        Row: {
          id: string
          name: string
          order_id: string
          product_id: string | null
          qty: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          id?: string
          name: string
          order_id: string
          product_id?: string | null
          qty: number
          subtotal: number
          unit_price: number
        }
        Update: {
          id?: string
          name?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "product_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_orders: {
        Row: {
          address: string | null
          client_id: string
          commission: number | null
          created_at: string
          id: string
          paid_at: string | null
          pix_payload: string | null
          pix_qr: string | null
          provider_payment_id: string | null
          shipping_type: Database["public"]["Enums"]["product_shipping"]
          shop_amount: number | null
          shop_id: string
          status: Database["public"]["Enums"]["product_order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id: string
          commission?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          pix_payload?: string | null
          pix_qr?: string | null
          provider_payment_id?: string | null
          shipping_type?: Database["public"]["Enums"]["product_shipping"]
          shop_amount?: number | null
          shop_id: string
          status?: Database["public"]["Enums"]["product_order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string
          commission?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          pix_payload?: string | null
          pix_qr?: string | null
          provider_payment_id?: string | null
          shipping_type?: Database["public"]["Enums"]["product_shipping"]
          shop_amount?: number | null
          shop_id?: string
          status?: Database["public"]["Enums"]["product_order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          photos: string[]
          price: number
          shop_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          photos?: string[]
          price: number
          shop_id: string
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photos?: string[]
          price?: number
          shop_id?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          asaas_customer_id: string | null
          avatar_url: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          lgpd_accepted_at: string | null
          lgpd_version: string | null
          location: unknown
          neighborhood: string | null
          number: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          street: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          lgpd_accepted_at?: string | null
          lgpd_version?: string | null
          location?: unknown
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          street?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          lgpd_accepted_at?: string | null
          lgpd_version?: string | null
          location?: unknown
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          street?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          request_id: string
          shop_id: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          request_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          request_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_requests: {
        Row: {
          address: string | null
          chosen_quote_id: string | null
          client_id: string
          created_at: string
          description: string
          device_id: string | null
          expires_at: string
          id: string
          location: unknown
          photos: string[]
          shipping_type: Database["public"]["Enums"]["shipping_type"]
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          chosen_quote_id?: string | null
          client_id: string
          created_at?: string
          description: string
          device_id?: string | null
          expires_at?: string
          id?: string
          location?: unknown
          photos?: string[]
          shipping_type: Database["public"]["Enums"]["shipping_type"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          chosen_quote_id?: string | null
          client_id?: string
          created_at?: string
          description?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          location?: unknown
          photos?: string[]
          shipping_type?: Database["public"]["Enums"]["shipping_type"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_chosen_quote_fk"
            columns: ["chosen_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      request_targets: {
        Row: {
          distance_m: number | null
          id: string
          notified_at: string
          request_id: string
          responds_by: string
          shop_id: string
          status: Database["public"]["Enums"]["target_status"]
        }
        Insert: {
          distance_m?: number | null
          id?: string
          notified_at?: string
          request_id: string
          responds_by?: string
          shop_id: string
          status?: Database["public"]["Enums"]["target_status"]
        }
        Update: {
          distance_m?: number | null
          id?: string
          notified_at?: string
          request_id?: string
          responds_by?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["target_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_targets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_targets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          shop_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          shop_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["service_order_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["service_order_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["service_order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_order_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          client_id: string
          created_at: string
          device_id: string | null
          id: string
          quote_id: string
          request_id: string
          shop_id: string
          status: Database["public"]["Enums"]["service_order_status"]
          updated_at: string
          value: number
        }
        Insert: {
          client_id: string
          created_at?: string
          device_id?: string | null
          id?: string
          quote_id: string
          request_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["service_order_status"]
          updated_at?: string
          value: number
        }
        Update: {
          client_id?: string
          created_at?: string
          device_id?: string | null
          id?: string
          quote_id?: string
          request_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["service_order_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          asaas_wallet_id: string | null
          brands: string[]
          cnpj: string | null
          created_at: string
          id: string
          is_online: boolean
          location: unknown
          name: string
          owner_id: string
          rating: number
          reviews_count: number
          service_radius_km: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          asaas_wallet_id?: string | null
          brands?: string[]
          cnpj?: string | null
          created_at?: string
          id?: string
          is_online?: boolean
          location?: unknown
          name: string
          owner_id: string
          rating?: number
          reviews_count?: number
          service_radius_km?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          asaas_wallet_id?: string | null
          brands?: string[]
          cnpj?: string | null
          created_at?: string
          id?: string
          is_online?: boolean
          location?: unknown
          name?: string
          owner_id?: string
          rating?: number
          reviews_count?: number
          service_radius_km?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_quote: { Args: { p_quote_id: string }; Returns: string }
      admin_disputes: { Args: never; Returns: Json }
      admin_metrics: { Args: never; Returns: Json }
      admin_orders: { Args: never; Returns: Json }
      admin_products: { Args: never; Returns: Json }
      admin_resolve_dispute: {
        Args: {
          p_id: string
          p_resolution: string
          p_status: Database["public"]["Enums"]["dispute_status"]
        }
        Returns: undefined
      }
      admin_set_product_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      admin_shops: { Args: never; Returns: Json }
      advance_product_order: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["product_order_status"]
        }
        Returns: undefined
      }
      advance_service_order: {
        Args: {
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["service_order_status"]
        }
        Returns: undefined
      }
      browse_products: {
        Args: {
          p_category?: string
          p_lat?: number
          p_lng?: number
          p_search?: string
        }
        Returns: {
          category: string
          description: string
          distance_m: number
          id: string
          name: string
          photos: string[]
          price: number
          shop_id: string
          shop_name: string
          stock: number
        }[]
      }
      cancel_product_order: { Args: { p_order_id: string }; Returns: undefined }
      create_product_order: {
        Args: {
          p_address?: string
          p_items: Json
          p_shipping_type: string
          p_shop_id: string
        }
        Returns: string
      }
      create_repair_request: {
        Args: {
          p_address?: string
          p_description: string
          p_device_id: string
          p_lat: number
          p_lng: number
          p_photos: string[]
          p_shipping_type: Database["public"]["Enums"]["shipping_type"]
        }
        Returns: string
      }
      get_my_profile: {
        Args: never
        Returns: {
          asaas_customer_id: string | null
          avatar_url: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          lgpd_accepted_at: string | null
          lgpd_version: string | null
          location: unknown
          neighborhood: string | null
          number: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          street: string | null
          uf: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_shop: {
        Args: never
        Returns: {
          address: string | null
          asaas_wallet_id: string | null
          brands: string[]
          cnpj: string | null
          created_at: string
          id: string
          is_online: boolean
          location: unknown
          name: string
          owner_id: string
          rating: number
          reviews_count: number
          service_radius_km: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      open_dispute: {
        Args: { p_kind: string; p_order_id: string; p_reason: string }
        Returns: string
      }
      register_push_token: {
        Args: { p_platform?: string; p_token: string }
        Returns: undefined
      }
      set_my_location: {
        Args: { p_lat: number; p_lng: number }
        Returns: undefined
      }
      set_my_wallet: { Args: { p_wallet_id: string }; Returns: undefined }
      upsert_my_shop: {
        Args: {
          p_address: string
          p_brands: string[]
          p_is_online?: boolean
          p_lat: number
          p_lng: number
          p_name: string
          p_radius: number
        }
        Returns: string
      }
    }
    Enums: {
      dispute_status:
        | "aberta"
        | "em_analise"
        | "resolvida"
        | "recusada"
        | "cancelada"
      payment_status: "pendente" | "pago" | "cancelado" | "estornado"
      product_order_status:
        | "aguardando_pagamento"
        | "pago"
        | "separando"
        | "pronto"
        | "concluido"
        | "cancelado"
      product_shipping: "retirada" | "entrega"
      quote_status: "enviado" | "aceito" | "recusado" | "expirado"
      request_status: "aberta" | "fechada" | "cancelada" | "expirada"
      service_order_status:
        | "aguardando_coleta"
        | "coletado"
        | "em_analise"
        | "aprovado"
        | "em_manutencao"
        | "pronto"
        | "em_devolucao"
        | "concluida"
        | "cancelada"
      shipping_type: "levar_local" | "frete"
      target_status:
        | "pendente"
        | "visualizado"
        | "orcou"
        | "recusou"
        | "expirou"
      user_role: "cliente" | "assistencia"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dispute_status: [
        "aberta",
        "em_analise",
        "resolvida",
        "recusada",
        "cancelada",
      ],
      payment_status: ["pendente", "pago", "cancelado", "estornado"],
      product_order_status: [
        "aguardando_pagamento",
        "pago",
        "separando",
        "pronto",
        "concluido",
        "cancelado",
      ],
      product_shipping: ["retirada", "entrega"],
      quote_status: ["enviado", "aceito", "recusado", "expirado"],
      request_status: ["aberta", "fechada", "cancelada", "expirada"],
      service_order_status: [
        "aguardando_coleta",
        "coletado",
        "em_analise",
        "aprovado",
        "em_manutencao",
        "pronto",
        "em_devolucao",
        "concluida",
        "cancelada",
      ],
      shipping_type: ["levar_local", "frete"],
      target_status: ["pendente", "visualizado", "orcou", "recusou", "expirou"],
      user_role: ["cliente", "assistencia"],
    },
  },
} as const

