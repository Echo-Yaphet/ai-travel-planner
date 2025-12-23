// src/lib/supabaseClient.ts
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** 是否配置了 Supabase（没配就认为云端功能关闭） */
export const isSupabaseEnabled = Boolean(url && anon);

/** 避免热更新/重复创建 client */
const g = globalThis as unknown as { __supabase?: SupabaseClient };

/**
 * 客户端 Supabase 实例（未配置时为 null）
 * 注意：这是给 Client Components 用的
 */
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

/**
 * 兼容旧代码：有些地方可能还在 import getSupabaseClient
 * 直接返回 supabase（或 null）
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}