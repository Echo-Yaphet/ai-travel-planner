// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseEnabled = Boolean(url && anon);

// 避免热更新/重复创建 client
const g = globalThis as unknown as { __supabase?: SupabaseClient };

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? (g.__supabase ??
      (g.__supabase = createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })))
  : null;