// src/app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  async function logout() {
    if (!supabase) {
      alert("未配置 Supabase：无需登出（云端功能不可用）。");
      return;
    }
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: "0 16px" }}>
      <h2 style={{ margin: 0 }}>设置</h2>

      {!supabase ? (
        <div style={{ marginTop: 12, color: "#c00", fontSize: 12 }}>
          未配置 Supabase：云端账号功能不可用。
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 14 }}>当前账号：{email ?? "未登录"}</div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button
          onClick={() => router.push("/")}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}
        >
          返回首页
        </button>

        <button
          onClick={logout}
          disabled={!supabase || loading}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            opacity: !supabase || loading ? 0.6 : 1,
          }}
        >
          {loading ? "处理中..." : "退出登录"}
        </button>
      </div>
    </div>
  );
}