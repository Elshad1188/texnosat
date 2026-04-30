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
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_minutes: number | null
          slug: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      call_ice_candidates: {
        Row: {
          call_id: string
          candidate: Json
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          call_id: string
          candidate: Json
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          call_id?: string
          candidate?: Json
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_ice_candidates_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          answer: Json | null
          answered_at: string | null
          call_type: string
          callee_id: string
          caller_id: string
          conversation_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          offer: Json | null
          started_at: string
          status: string
        }
        Insert: {
          answer?: Json | null
          answered_at?: string | null
          call_type?: string
          callee_id: string
          caller_id: string
          conversation_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          offer?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          answer?: Json | null
          answered_at?: string | null
          call_type?: string
          callee_id?: string
          caller_id?: string
          conversation_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          offer?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ru: string | null
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
          name_ru?: string | null
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
          name_ru?: string | null
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
          field_label_ru: string | null
          field_name: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          options: Json | null
          options_ru: Json | null
          sort_order: number
        }
        Insert: {
          category_slug: string
          created_at?: string
          field_label: string
          field_label_ru?: string | null
          field_name: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          options_ru?: Json | null
          sort_order?: number
        }
        Update: {
          category_slug?: string
          created_at?: string
          field_label?: string
          field_label_ru?: string | null
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          options_ru?: Json | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          listing_id: string
          movement_type: string
          new_stock: number
          note: string | null
          previous_stock: number
          quantity: number
          store_id: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          listing_id: string
          movement_type?: string
          new_stock?: number
          note?: string | null
          previous_stock?: number
          quantity?: number
          store_id: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          movement_type?: string
          new_stock?: number
          note?: string | null
          previous_stock?: number
          quantity?: number
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          barcode: string | null
          category: string
          condition: string
          cost_price: number | null
          created_at: string
          currency: string
          custom_fields: Json | null
          deal_type: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean
          is_buyable: boolean
          is_premium: boolean
          is_urgent: boolean
          latitude: number | null
          location: string
          longitude: number | null
          premium_until: string | null
          price: number
          rejection_reason: string | null
          status: string
          stock: number
          store_id: string | null
          telegram_media_group_id: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          barcode?: string | null
          category: string
          condition?: string
          cost_price?: number | null
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          deal_type?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          is_buyable?: boolean
          is_premium?: boolean
          is_urgent?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          premium_until?: string | null
          price: number
          rejection_reason?: string | null
          status?: string
          stock?: number
          store_id?: string | null
          telegram_media_group_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          barcode?: string | null
          category?: string
          condition?: string
          cost_price?: number | null
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          deal_type?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          is_buyable?: boolean
          is_premium?: boolean
          is_urgent?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          premium_until?: string | null
          price?: number
          rejection_reason?: string | null
          status?: string
          stock?: number
          store_id?: string | null
          telegram_media_group_id?: string | null
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
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          is_delivered: boolean | null
          is_read: boolean | null
          sender_id: string
          sender_store_id: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_delivered?: boolean | null
          is_read?: boolean | null
          sender_id: string
          sender_store_id?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_delivered?: boolean | null
          is_read?: boolean | null
          sender_id?: string
          sender_store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_store_id_fkey"
            columns: ["sender_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
          last_seen: string | null
          last_spin_at: string | null
          phone: string | null
          presence_state: string
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
          last_seen?: string | null
          last_spin_at?: string | null
          phone?: string | null
          presence_state?: string
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
          last_seen?: string | null
          last_spin_at?: string | null
          phone?: string | null
          presence_state?: string
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
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
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
      saved_searches: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string
          id: string
          is_active: boolean
          last_notified_at: string | null
          price_max: number | null
          price_min: number | null
          query: string | null
          region: string | null
          subcategory: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          price_max?: number | null
          price_min?: number | null
          query?: string | null
          region?: string | null
          subcategory?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          price_max?: number | null
          price_min?: number | null
          query?: string | null
          region?: string | null
          subcategory?: string | null
          user_id?: string
        }
        Relationships: []
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
      sms_campaigns: {
        Row: {
          category_filter: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          failed_count: number
          id: string
          message: string
          region_filter: string | null
          sent_count: number
          source_filter: string
          status: string
          title: string
          total_recipients: number
        }
        Insert: {
          category_filter?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          failed_count?: number
          id?: string
          message: string
          region_filter?: string | null
          sent_count?: number
          source_filter?: string
          status?: string
          title: string
          total_recipients?: number
        }
        Update: {
          category_filter?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          failed_count?: number
          id?: string
          message?: string
          region_filter?: string | null
          sent_count?: number
          source_filter?: string
          status?: string
          title?: string
          total_recipients?: number
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_message: string | null
          id: string
          phone: string
          provider_message_id: string | null
          sent_at: string | null
          source: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          phone: string
          provider_message_id?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          phone?: string
          provider_message_id?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_settings: {
        Row: {
          api_login: string | null
          api_password_secret_hint: string | null
          id: number
          is_enabled: boolean
          provider: string
          rate_limit_per_minute: number
          sender_name: string
          updated_at: string
        }
        Insert: {
          api_login?: string | null
          api_password_secret_hint?: string | null
          id?: number
          is_enabled?: boolean
          provider?: string
          rate_limit_per_minute?: number
          sender_name?: string
          updated_at?: string
        }
        Update: {
          api_login?: string | null
          api_password_secret_hint?: string | null
          id?: number
          is_enabled?: boolean
          provider?: string
          rate_limit_per_minute?: number
          sender_name?: string
          updated_at?: string
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
      store_change_requests: {
        Row: {
          admin_note: string | null
          changes: Json | null
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          request_type: string
          status: string
          store_id: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          status?: string
          store_id: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          status?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_change_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          agent_count: number | null
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          established_year: number | null
          id: string
          instagram_url: string | null
          is_premium: boolean
          license_number: string | null
          logo_url: string | null
          name: string
          phone: string | null
          premium_until: string | null
          specialization: string | null
          status: string
          updated_at: string
          user_id: string
          website_url: string | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          agent_count?: number | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          id?: string
          instagram_url?: string | null
          is_premium?: boolean
          license_number?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          premium_until?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website_url?: string | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          agent_count?: number | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          id?: string
          instagram_url?: string | null
          is_premium?: boolean
          license_number?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          premium_until?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_bot_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          markup_type: string
          markup_value: number
          store_id: string | null
          target_category: string
          target_location: string
          telegram_chat_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          markup_type?: string
          markup_value?: number
          store_id?: string | null
          target_category?: string
          target_location?: string
          telegram_chat_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          markup_type?: string
          markup_value?: number
          store_id?: string | null
          target_category?: string
          target_location?: string
          telegram_chat_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bot_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_media_buffer: {
        Row: {
          caption: string | null
          chat_id: number
          created_at: string | null
          id: string
          image_url: string
          media_group_id: string
        }
        Insert: {
          caption?: string | null
          chat_id: number
          created_at?: string | null
          id?: string
          image_url: string
          media_group_id: string
        }
        Update: {
          caption?: string | null
          chat_id?: number
          created_at?: string | null
          id?: string
          image_url?: string
          media_group_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_admin: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          az: string
          category: string
          created_at: string
          id: string
          key: string
          ru: string
          updated_at: string
        }
        Insert: {
          az?: string
          category?: string
          created_at?: string
          id?: string
          key: string
          ru?: string
          updated_at?: string
        }
        Update: {
          az?: string
          category?: string
          created_at?: string
          id?: string
          key?: string
          ru?: string
          updated_at?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_own_message: { Args: { _message_id: string }; Returns: boolean }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
