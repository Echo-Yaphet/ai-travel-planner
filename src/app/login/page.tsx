"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [pwd, setPwd] = useState("");
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function submit() {
        setLoading(true);
        try {
            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({ email, password: pwd });
                if (error) throw error;
                alert("注册成功：请检查邮箱验证（如开启了验证）。");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
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
            <h1 className="text-2xl font-bold">{mode === "login" ? "登录" : "注册"}</h1>

            <input className="w-full rounded border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full rounded border p-2" placeholder="Password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />

            <button className="w-full rounded bg-black text-white px-4 py-2 disabled:opacity-50" onClick={submit} disabled={loading}>
                {loading ? "处理中…" : mode === "login" ? "登录" : "注册"}
            </button>

            <button className="w-full rounded border px-4 py-2" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                切换到：{mode === "login" ? "注册" : "登录"}
            </button>
        </div>
    );
}