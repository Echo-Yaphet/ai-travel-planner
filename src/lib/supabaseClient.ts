// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/**
 * 懒加载：只有在 env 存在时才创建 client；否则返回 null（本地功能照样可用）。
 * 这样 CI / Docker build 没配 supabase 也不会直接炸。
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (!url || !anon) return null;
  _client = createClient(url, anon);
  return _client;
}

/**
 * 兼容你现有代码：仍然提供 supabase 变量给页面/组件 import
 * 注意：这里不会 throw；没配置就为 null
 */
export const supabase: SupabaseClient | null = getSupabaseClient();