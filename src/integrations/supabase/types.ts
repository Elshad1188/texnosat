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
      balance_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link: string | null
          position: string
          sort_order: number
          starts_at: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link?: string | null
          position?: string
          sort_order?: number
          starts_at?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link?: string | null
          position?: string
          sort_order?: number
          starts_at?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_fields: {
        Row: {
          category_slug: string
          created_at: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          options: Json | null
          sort_order: number
        }
        Insert: {
          category_slug: string
          created_at?: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          sort_order?: number
        }
        Update: {
          category_slug?: string
          created_at?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          sort_order?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          listing_id: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          condition: string
          created_at: string
          currency: string
          custom_fields: Json | null
          description: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean
          is_buyable: boolean
          is_premium: boolean
          is_urgent: boolean
          location: string
          premium_until: string | null
          price: number
          rejection_reason: string | null
          status: string
          stock: number
          store_id: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          is_buyable?: boolean
          is_premium?: boolean
          is_urgent?: boolean
          location?: string
          premium_until?: string | null
          price: number
          rejection_reason?: string | null
          status?: string
          stock?: number
          store_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          is_buyable?: boolean
          is_premium?: boolean
          is_urgent?: boolean
          location?: string
          premium_until?: string | null
          price?: number
          rejection_reason?: string | null
          status?: string
          stock?: number
          store_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_note: string | null
          cancelled_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          delivered_at: string | null
          id: string
          listing_id: string | null
          order_number: string
          paid_at: string | null
          payment_method: string
          quantity: number
          seller_id: string
          seller_note: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_method_id: string | null
          shipping_price: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_note?: string | null
          cancelled_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          listing_id?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string
          quantity?: number
          seller_id: string
          seller_note?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_method_id?: string | null
          shipping_price?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_note?: string | null
          cancelled_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          listing_id?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string
          quantity?: number
          seller_id?: string
          seller_note?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_method_id?: string | null
          shipping_price?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_account: string | null
          bank_name: string | null
          card_number: string | null
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          seller_id: string
          status: Database["public"]["Enums"]["payout_status"]
          store_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_account?: string | null
          bank_name?: string | null
          card_number?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["payout_status"]
          store_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_account?: string | null
          bank_name?: string | null
          card_number?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          city: string | null
          created_at: string
          email_notifications: boolean
          full_name: string | null
          id: string
          last_spin_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          city?: string | null
          created_at?: string
          email_notifications?: boolean
          full_name?: string | null
          id?: string
          last_spin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          city?: string | null
          created_at?: string
          email_notifications?: boolean
          full_name?: string | null
          id?: string
          last_spin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_amount: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          listing_id: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_schedules: {
        Row: {
          category_url: string
          created_at: string
          cron_expression: string
          cron_job_id: number | null
          fetch_details: boolean
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_result: Json | null
          scrape_limit: number
          source: string
          target_category: string
          target_location: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_url: string
          created_at?: string
          cron_expression?: string
          cron_job_id?: number | null
          fetch_details?: boolean
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_result?: Json | null
          scrape_limit?: number
          source: string
          target_category: string
          target_location?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_url?: string
          created_at?: string
          cron_expression?: string
          cron_job_id?: number | null
          fetch_details?: boolean
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_result?: Json | null
          scrape_limit?: number
          source?: string
          target_category?: string
          target_location?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_methods: {
        Row: {
          created_at: string
          description: string | null
          estimated_days: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          store_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          store_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_methods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      spin_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          prize_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          prize_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          prize_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spin_history_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "spin_prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spin_history_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      spin_prizes: {
        Row: {
          amount: number
          chance: number
          color: string
          created_at: string
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          amount?: number
          chance?: number
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          amount?: number
          chance?: number
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      store_followers: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_followers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          logo_url: string | null
          name: string
          phone: string | null
          premium_until: string | null
          status: string
          updated_at: string
          user_id: string
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          premium_until?: string | null
          status?: string
          updated_at?: string
          user_id: string
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          premium_until?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      user_followers: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_conversation_for_user: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      delete_own_message: { Args: { _message_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admins: {
        Args: {
          _event_type: string
          _link?: string
          _message: string
          _title: string
        }
        Returns: undefined
      }
      process_referral: {
        Args: { _new_user_id: string; _referral_code: string }
        Returns: boolean
      }
      process_spin_win: { Args: { _prize_id: string }; Returns: Json }
      reset_user_spin_cooldown: { Args: { _user_id: string }; Returns: Json }
      spend_balance: {
        Args: {
          _amount: number
          _description: string
          _reference_id?: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payout_status: "pending" | "approved" | "rejected" | "completed"
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
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payout_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
