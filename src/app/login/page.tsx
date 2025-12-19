"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

function isValidEmail(email: string) {
  // 足够用的基础校验（不用太复杂）
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    const emailTrim = email.trim();
    const pwdTrim = pwd.trim();

    if (!isValidEmail(emailTrim)) {
      alert("邮箱格式不正确，请输入类似 abc@qq.com 的格式（注意不要有空格/全角符号）。");
      return;
    }
    if (pwdTrim.length < 6) {
      alert("密码至少 6 位。");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailTrim,
          password: pwdTrim,
        });
        if (error) throw error;
        alert("注册成功 ✅（如果你开启了邮箱验证，请先去邮箱确认）");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailTrim,
          password: pwdTrim,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{mode === "login" ? "登录" : "注册"}</h1>
        <Link className="text-sm underline" href="/">
          返回首页
        </Link>
      </div>

      <input
        className="w-full rounded border p-2"
        placeholder="Email（例如 abc@qq.com）"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        inputMode="email"
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Password（至少6位）"
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />

      <button
        className="w-full rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "处理中…" : mode === "login" ? "登录" : "注册"}
      </button>

      <button
        className="w-full rounded border px-4 py-2"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        disabled={loading}
      >
        切换到：{mode === "login" ? "注册" : "登录"}
      </button>

      <div className="text-xs text-gray-500">
        如果你不想邮箱验证：Supabase 控制台 Authentication → Settings 里可以关闭 Email confirmations（开发阶段用）。
      </div>
    </div>
  );
}