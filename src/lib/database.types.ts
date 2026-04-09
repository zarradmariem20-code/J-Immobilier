export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: number
          is_read: boolean
          message: string
          recipient_email: string
          title: string
          type: string
          visit_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_read?: boolean
          message: string
          recipient_email: string
          title: string
          type?: string
          visit_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          is_read?: boolean
          message?: string
          recipient_email?: string
          title?: string
          type?: string
          visit_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          area: number
          bathrooms: number
          bedrooms: number
          created_at: string | null
          description: string | null
          featured: boolean | null
          features: string[] | null
          gallery: string[]
          id: number
          image: string
          video_url: string | null
          location: string
          map_location_query: string | null
          nearby_commodities: string[] | null
          price: number
          status: string
          tags: string[] | null
          title: string
          transaction_type: string
          type: string
          updated_at: string | null
        }
        Insert: {
          area: number
          bathrooms: number
          bedrooms: number
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          features?: string[] | null
          gallery?: string[]
          id?: number
          image: string
          video_url?: string | null
          location: string
          map_location_query?: string | null
          nearby_commodities?: string[] | null
          price: number
          status?: string
          tags?: string[] | null
          title: string
          transaction_type: string
          type: string
          updated_at?: string | null
        }
        Update: {
          area?: number
          bathrooms?: number
          bedrooms?: number
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          features?: string[] | null
          gallery?: string[]
          id?: number
          image?: string
          video_url?: string | null
          location?: string
          map_location_query?: string | null
          nearby_commodities?: string[] | null
          price?: number
          status?: string
          tags?: string[] | null
          title?: string
          transaction_type?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string | null
          id: number
          inquiry_id: number
          notes: string | null
          property_id: number
          property_title: string
          requested_date: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          updated_at: string | null
          visit_status: string
          visitor_email: string
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          inquiry_id: number
          notes?: string | null
          property_id: number
          property_title: string
          requested_date?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          updated_at?: string | null
          visit_status?: string
          visitor_email: string
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          created_at?: string | null
          id?: number
          inquiry_id?: number
          notes?: string | null
          property_id?: number
          property_title?: string
          requested_date?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          updated_at?: string | null
          visit_status?: string
          visitor_email?: string
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Property = Database["public"]["Tables"]["properties"]["Row"]
export type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"]
export type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"]

export type Visit = Database["public"]["Tables"]["visits"]["Row"]
export type VisitInsert = Database["public"]["Tables"]["visits"]["Insert"]
export type VisitUpdate = Database["public"]["Tables"]["visits"]["Update"]
