import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kgufceeudnsrgfamzeuj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndWZjZWV1ZG5zcmdmYW16ZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNTUzNDIsImV4cCI6MjA3MzczMTM0Mn0.tBxN-v7MPLx87kXaDLNDEh8WZhEKBQb0LmmWCRFejS0'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          date: string
          name: string
          room: string
          start_time: string
          end_time: string
          description: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          date: string
          name: string
          room: string
          start_time: string
          end_time: string
          description?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          date?: string
          name?: string
          room?: string
          start_time?: string
          end_time?: string
          description?: string | null
          created_at?: string
          user_id?: string
        }
      }
      users: {
        Row: {
          id: string
          username: string
          password: string
          role: 'admin' | 'user' | 'bidang' | 'ob'
          is_ob?: boolean
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          role: 'admin' | 'user' | 'bidang' | 'ob'
          is_ob?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          role?: 'admin' | 'user' | 'bidang' | 'ob'
          is_ob?: boolean
          created_at?: string
        }
      }
      cleanliness_reports: {
        Row: {
          id: string
          date: string
          time: string
          inspector_name: string
          floor: string
          description: string | null
          photos: string[]
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          time: string
          inspector_name: string
          floor: string
          description?: string | null
          photos?: string[]
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          time?: string
          inspector_name?: string
          floor?: string
          description?: string | null
          photos?: string[]
          user_id?: string
        }
      }
      cleanliness_complaints: {
        Row: {
          id: string
          date: string
          time: string
          reporter_name: string
          bidang: string
          floor: string
          description: string
          photos: string[]
          status: 'pending' | 'in_progress' | 'resolved'
          handler_name: string | null
          handler_notes: string | null
          resolution_photos: string[]
          resolved_at: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          time: string
          reporter_name: string
          bidang: string
          floor: string
          description: string
          photos?: string[]
          status?: 'pending' | 'in_progress' | 'resolved'
          handler_name?: string | null
          handler_notes?: string | null
          resolution_photos?: string[]
          resolved_at?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          time?: string
          reporter_name?: string
          bidang?: string
          floor?: string
          description?: string
          photos?: string[]
          status?: 'pending' | 'in_progress' | 'resolved'
          handler_name?: string | null
          handler_notes?: string | null
          resolution_photos?: string[]
          resolved_at?: string | null
          user_id?: string
          updated_at?: string
        }
      }
      car_bookings: {
        Row: {
          id: string
          name: string
          seksi: string
          date: string
          start_time: string
          end_time: string
          keperluan: string
          status: 'pending' | 'approved' | 'rejected' | string
          admin_note: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          seksi: string
          date: string
          start_time: string
          end_time: string
          keperluan: string
          status?: 'pending' | 'approved' | 'rejected' | string
          admin_note?: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          seksi?: string
          date?: string
          start_time?: string
          end_time?: string
          keperluan?: string
          status?: 'pending' | 'approved' | 'rejected' | string
          admin_note?: string
          updated_at?: string
        }
      }
    }
  }
}
