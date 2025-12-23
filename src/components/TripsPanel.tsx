"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";

export type TripRow = {
  id: string;
  title: string | null;
  input_text: string | null;
  plan: any;
  created_at: string;
};

type Props = {
  currentInput: string;
  currentPlan: any;
  onTripIdChange: (id: string | null) => void;
  onLoadTrip: (t: TripRow) => void;
};

export default function TripsPanel({ currentInput, currentPlan, onTripIdChange, onLoadTrip }: Props) {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    if (!supabase) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("id,title,input_text,plan,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips((data ?? []) as TripRow[]);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) return;
    refresh();
  }, []);

  async function saveCurrent() {
    if (!supabase) {
      alert("未配置 Supabase：云端保存不可用。");
      return;
    }
    if (!currentPlan) {
      alert("当前没有可保存的行程（请先生成行程）。");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const title =
        (currentInput || "")
          .trim()
          .slice(0, 20) || `Trip ${new Date().toLocaleString()}`;

      const payload: any = {
        title,
        input_text: currentInput ?? "",
        plan: currentPlan,
      };
      // 如果你的表有 user_id（常见做法），就带上；没有也不会影响（但可能插入失败则提示错误）
      if (userId) payload.user_id = userId;

      const { data, error } = await supabase.from("trips").insert(payload).select().single();
      if (error) throw error;

      const newId = (data as any)?.id ?? null;
      onTripIdChange(newId);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // 未配置 Supabase：给一个提示即可（不影响本地功能）
  if (!isSupabaseEnabled || !supabase) {
    return (
      <div className="rounded border p-3 space-y-2">
        <div className="font-medium">云端行程</div>
        <div className="text-xs text-red-600">未配置 Supabase：云端登录/保存/加载不可用。</div>
        <div className="text-xs text-gray-600">
          你仍然可以本地生成行程与记账；若要开启云端功能，需要在运行环境提供{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> 与 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">云端行程</div>
        <Link className="text-xs underline" href="/login">
          去登录/注册
        </Link>
      </div>

      <button
        className="rounded bg-black text-white px-3 py-2 w-full disabled:opacity-50"
        onClick={saveCurrent}
        disabled={saving || !currentPlan}
        title={!currentPlan ? "先生成行程再保存" : ""}
      >
        {saving ? "保存中…" : "保存当前行程到云端"}
      </button>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">历史行程</div>
        <button className="text-xs underline" onClick={refresh} disabled={loading}>
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>

      {err ? <div className="text-xs text-red-600 break-words">错误：{err}</div> : null}

      {trips.length === 0 ? (
        <div className="text-sm text-gray-600">暂无云端行程。</div>
      ) : (
        <div className="space-y-2">
          {trips.map((t) => (
            <div key={t.id} className="rounded border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.title ?? "(未命名)"}</div>
                  <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <button
                  className="rounded border px-2 py-1 text-sm"
                  onClick={() => {
                    onLoadTrip(t);
                    onTripIdChange(t.id);
                  }}
                >
                  加载
                </button>
              </div>
              {t.input_text ? <div className="text-xs text-gray-600 mt-1 line-clamp-2">{t.input_text}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}