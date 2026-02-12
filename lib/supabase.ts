import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// Your Supabase credentials
const supabaseUrl = 'https://bdcxphwibxyoqxtssoqu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY3hwaHdpYnh5b3F4dHNzb3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDQ3NjksImV4cCI6MjA4NjQyMDc2OX0.s656BP5vt4rVSCUrUSB6jUo_c7GlWrjkKojNKrQRbg4'

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For use in Client Components with Next.js App Router
export function createSupabaseClient() {
  return createClientComponentClient()
}

// Database types
export interface DBRun {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  auto: boolean
  // Section 1
  bm_elev: number | null
  rod_bm: number | null
  hi: number | null
  hi_locked: boolean
  // Section 2
  rod_hub: number | null
  cf_mode: 'cut' | 'fill'
  cf_value: number | null
  hub_elev: number | null
  start_invert: number | null
  start_locked: boolean
  // Section 3
  rod_a: number | null
  rod_b: number | null
  distance: number | null
  inv_a: number | null
  inv_b: number | null
  slope_percent: number | null
  slope_locked: boolean
  // Section 4
  struct_enabled: boolean
  struct_invert: number | null
  pipe_wall: number
  basin_floor: number
  stone_depth: number
  box_height: number
  // Meta
  notes: string | null
  project_name: string | null
}
