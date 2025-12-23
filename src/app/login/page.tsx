// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    if (!supabase) {
      alert("未配置 Supabase：无法登录/注册（云端功能不可用）。");
      return;
    }

    try {
      setLoading(true);
      setMsg(null);

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("注册成功：若开启邮箱确认，请先去邮箱完成验证后再登录。");
      }
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 420, maxWidth: "90vw", border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{mode === "login" ? "登录" : "注册"}</div>

        {!isSupabaseEnabled ? (
          <div style={{ marginTop: 10, color: "#c00", fontSize: 12 }}>
            未配置 Supabase：本项目仍可本地使用，但无法进行云端登录/保存。
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            type="password"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={loading || !email || !password || !isSupabaseEnabled}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            opacity: loading || !isSupabaseEnabled ? 0.6 : 1,
            cursor: loading || !isSupabaseEnabled ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>

        <button
          onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
          }}
        >
          切换到：{mode === "login" ? "注册" : "登录"}
        </button>

        <button
          onClick={() => router.replace("/")}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
          }}
        >
          返回首页（离线模式也可用）
        </button>

        {msg ? <div style={{ marginTop: 10, fontSize: 12, color: "#333" }}>{msg}</div> : null}
      </div>
    </div>
  );
}