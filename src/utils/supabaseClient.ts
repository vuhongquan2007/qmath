import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://jxvjtpwcdkgtxwoeviyo.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dmp0cHdjZGtndHh3b2V2aXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODA3ODUsImV4cCI6MjEwMDE1Njc4NX0.pV8cbQlx8gMpZtcabobjcDjjmvv-DGNdODD_QtAECkY"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)