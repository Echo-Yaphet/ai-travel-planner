"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
const AmapView = dynamic(() => import("@/components/AmapView"), { ssr: false });
import VoiceInput from "@/components/VoiceInput";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [interim, setInterim] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const markers = useMemo(() => {
    if (!plan?.days) {
      return [
        { name: "故宫(示例)", lng: 116.397428, lat: 39.90923 },
        { name: "南锣鼓巷(示例)", lng: 116.403963, lat: 39.933087 },
      ];
    }
    const list: { name: string; lng: number; lat: number }[] = [];
    for (const d of plan.days) {
      for (const it of d.items ?? []) {
        if (typeof it.lng === "number" && typeof it.lat === "number") {
          list.push({ name: it.name, lng: it.lng, lat: it.lat });
        }
      }
    }
    return list.length ? list : [];
  }, [plan]);

  return (
    <div className="h-screen grid grid-cols-1 md:grid-cols-[420px_1fr]">
      <div className="p-4 border-r overflow-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Travel Planner</h1>
          <Link className="text-sm underline" href="/settings">
            设置
          </Link>
        </div>

        <div className="rounded border p-3 space-y-3">
          <div className="font-medium">需求输入</div>

          <VoiceInput
            onText={(text, isFinal) => {
              if (isFinal) {
                setInputText((prev) => (prev ? prev + text : text));
                setInterim("");
              } else {
                setInterim(text);
              }
            }}
          />

          <textarea
            className="w-full rounded border p-2"
            rows={5}
            placeholder="例如：我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子"
            value={inputText + (interim ? `（${interim}）` : "")}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            className="rounded bg-black text-white px-4 py-2 w-full disabled:opacity-50"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const resp = await fetch("/api/plan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ input: inputText }),
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data?.error ?? "request failed");
                setPlan(data);
              } catch (e: any) {
                alert(`生成失败：${e.message ?? e}`);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "生成中…" : "生成行程"}
          </button>
        </div>

        <div className="rounded border p-3">
          <div className="font-medium mb-2">行程</div>

          {!plan ? (
            <ul className="space-y-2 text-sm">
              <li>Day1：故宫 → 南锣鼓巷（示例）</li>
              <li>Day2：后续由 AI 生成</li>
            </ul>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="text-gray-700">{plan.summary}</div>

              <div className="rounded border p-2">
                <div className="font-medium mb-1">预算估计</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>交通：{plan.budget?.transport ?? 0}</div>
                  <div>住宿：{plan.budget?.hotel ?? 0}</div>
                  <div>餐饮：{plan.budget?.food ?? 0}</div>
                  <div>门票：{plan.budget?.tickets ?? 0}</div>
                  <div>其他：{plan.budget?.others ?? 0}</div>
                  <div className="font-medium">合计：{plan.budget?.total ?? 0}</div>
                </div>
              </div>

              {plan.days?.map((d: any) => (
                <div key={d.day} className="rounded border p-2">
                  <div className="font-medium">
                    Day{d.day}：{d.title}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {(d.items ?? []).map((it: any, idx: number) => (
                      <li key={idx}>
                        <span className="font-medium">{it.time}</span>{" "}
                        [{it.type}] {it.name}（¥{it.cost_estimate}）
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <AmapView markers={markers} />
      </div>
    </div>
  );
}