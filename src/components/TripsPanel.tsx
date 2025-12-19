"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export type TripRow = {
  id: string;
  title: string;
  input_text: string | null;
  plan: any;
  created_at: string;
};

export default function TripsPanel(props: {
  currentInput: string;
  currentPlan: any;
  onLoadTrip: (trip: TripRow) => void;
  onTripIdChange: (tripId: string | null) => void;
}) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErrMsg(null);

    try {
      // 1) 获取登录态（这里如果抛错，之前你的代码会永远卡 loading）
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const user = sessionData.session?.user;
      setUserEmail(user?.email ?? null);

      // 未登录：直接结束
      if (!user) {
        setTrips([]);
        props.onTripIdChange(null);
        return;
      }

      // 2) 拉取 trips
      const { data, error } = await supabase
        .from("trips")
        .select("id,title,input_text,plan,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrips((data as any) ?? []);
    } catch (e: any) {
      console.error("[TripsPanel refresh error]", e);
      setTrips([]);
      setUserEmail(null);
      props.onTripIdChange(null);
      setErrMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  async function saveCurrent() {
    if (!userEmail) return alert("请先登录");
    if (!props.currentPlan) return alert("请先生成行程再保存");

    const title = prompt("给这份计划起个标题：", "我的旅行计划");
    if (!title) return;

    try {
      const { data: userData, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      const uid = userData.user?.id;
      if (!uid) return alert("登录状态异常，请重新登录");

      const { data, error } = await supabase
        .from("trips")
        .insert([
          {
            user_id: uid,
            title,
            input_text: props.currentInput,
            plan: props.currentPlan,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      props.onTripIdChange(data.id);
      await refresh();
      alert("已保存到云端 ✅");
    } catch (e: any) {
      console.error("[saveCurrent error]", e);
      alert(e?.message ?? String(e));
    }
  }

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">云端计划</div>
        {userEmail ? (
          <button className="text-sm underline" onClick={logout}>
            退出
          </button>
        ) : (
          <Link className="text-sm underline" href="/login">
            登录
          </Link>
        )}
      </div>

      {userEmail ? (
        <div className="text-sm text-gray-600">当前用户：{userEmail}</div>
      ) : (
        <div className="text-sm text-gray-600">未登录：只能本地使用</div>
      )}

      <button
        className="w-full rounded bg-black text-white px-3 py-2 disabled:opacity-50"
        onClick={saveCurrent}
        disabled={!userEmail || !props.currentPlan}
      >
        保存当前计划到云端
      </button>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>{loading ? "加载中…" : `计划数：${trips.length}`}</div>
        <button className="text-sm underline" onClick={refresh}>
          刷新
        </button>
      </div>

      {errMsg && <div className="text-sm text-red-600">加载失败：{errMsg}</div>}

      <div className="space-y-2 max-h-40 overflow-auto">
        {trips.map((t) => (
          <button
            key={t.id}
            className="w-full text-left rounded border p-2 hover:bg-gray-50"
            onClick={() => {
              props.onLoadTrip(t);
              props.onTripIdChange(t.id);
            }}
          >
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-gray-600">{new Date(t.created_at).toLocaleString()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}