"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type TripRow = {
  id: string;
  title?: string | null;
  input_text?: string | null;
  plan: any;
  created_at?: string | null;
};

export type TripsPanelProps = {
  currentInput: string;
  currentPlan: any;
  onTripIdChange: (id: string | null) => void;
  onLoadTrip: (t: TripRow) => void;
};

export default function TripsPanel(props: TripsPanelProps) {
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [errMsg, setErrMsg] = useState<string>("");

  async function refresh() {
    setErrMsg("");
    if (!supabase) {
      setUserEmail(null);
      setTrips([]);
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const email = auth?.user?.email ?? null;
    setUserEmail(email);

    if (!auth?.user) {
      setTrips([]);
      props.onTripIdChange(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("id,title,input_text,plan,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips((data as any) ?? []);
    } catch (e: any) {
      setErrMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveCurrentToCloud() {
    setErrMsg("");
    if (!supabase) {
      alert("未配置 Supabase（.env.local），只能本地使用");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      alert("请先登录后再保存到云端");
      return;
    }
    if (!props.currentPlan) {
      alert("当前没有可保存的行程（请先生成行程）");
      return;
    }

    setLoading(true);
    try {
      const title =
        props.currentPlan?.summary?.slice?.(0, 30) ||
        props.currentPlan?.title ||
        "AI 行程";

      const payload: any = {
        title,
        input_text: props.currentInput ?? "",
        plan: props.currentPlan,
        // 如果你表里有 user_id，这个字段很常见；没有也不会影响（Supabase 会报 column 不存在）
        user_id: auth.user.id,
      };

      // 兼容：如果 trips 表没有 user_id，就删掉再插一次
      let insert = await supabase.from("trips").insert(payload).select("id,title,input_text,plan,created_at").single();
      if ((insert as any).error?.message?.includes("user_id")) {
        delete payload.user_id;
        insert = await supabase.from("trips").insert(payload).select("id,title,input_text,plan,created_at").single();
      }

      const { data, error } = insert as any;
      if (error) throw error;

      props.onTripIdChange(data.id);
      await refresh();
      alert("已保存到云端");
    } catch (e: any) {
      setErrMsg(e?.message ?? String(e));
      alert(`保存失败：${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    if (!supabase) return;

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">云端计划</div>
        <div className="text-sm">
          {userEmail ? (
            <span className="text-gray-700">已登录：{userEmail}</span>
          ) : (
            <span className="text-gray-500">未登录：只能本地使用</span>
          )}
          <span className="ml-3">
            <Link className="underline" href="/login">
              登录/注册
            </Link>
          </span>
        </div>
      </div>

      <button
        className="rounded bg-gray-800 text-white px-3 py-2 w-full disabled:opacity-50"
        onClick={saveCurrentToCloud}
        disabled={loading}
      >
        {loading ? "处理中…" : "保存当前计划到云端"}
      </button>

      {errMsg ? <div className="text-sm text-red-600">{errMsg}</div> : null}

      <div className="text-sm text-gray-600">
        {loading ? "加载中…" : `历史计划：${trips.length} 条`}
      </div>

      <div className="space-y-2">
        {trips.map((t) => (
          <button
            key={t.id}
            className="w-full text-left rounded border px-3 py-2 hover:bg-gray-50"
            onClick={() => props.onLoadTrip(t)}
          >
            <div className="font-medium">{t.title ?? "未命名行程"}</div>
            <div className="text-xs text-gray-600 line-clamp-1">
              {t.input_text ?? ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}