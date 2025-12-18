import AmapView from "@/components/AmapView";
import Link from "next/link";

export default function Home() {
  const markers = [
    { name: "故宫(示例)", lng: 116.397428, lat: 39.90923 },
    { name: "南锣鼓巷(示例)", lng: 116.403963, lat: 39.933087 },
  ];

  return (
    <div className="h-screen grid grid-cols-1 md:grid-cols-[420px_1fr]">
      <div className="p-4 border-r overflow-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Travel Planner</h1>
          <Link className="text-sm underline" href="/settings">
            设置
          </Link>"use client";

import { useMemo, useState } from "react";
import AmapView from "@/components/AmapView";
import Link from "next/link";
import VoiceInput from "@/components/VoiceInput";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [interim, setInterim] = useState("");

  // 暂时仍然用示例点，下一步我们会用“AI生成的行程点”替换
  const markers = useMemo(
    () => [
      { name: "故宫(示例)", lng: 116.397428, lat: 39.90923 },
      { name: "南锣鼓巷(示例)", lng: 116.403963, lat: 39.933087 },
    ],
    []
  );

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

          <button className="rounded bg-black text-white px-4 py-2 w-full">
            生成行程（下一步接入大模型）
          </button>
        </div>

        <div className="rounded border p-3">
          <div className="font-medium mb-2">行程（示例数据）</div>
          <ul className="space-y-2 text-sm">
            <li>Day1：故宫 → 南锣鼓巷</li>
            <li>Day2：后续由 AI 生成</li>
          </ul>
        </div>
      </div>

      <div className="p-3">
        <AmapView markers={markers} />
      </div>
    </div>
  );
}
        </div>

        <div className="rounded border p-3 space-y-2">
          <div className="font-medium">需求输入（先占位）</div>
          <textarea
            className="w-full rounded border p-2"
            rows={4}
            placeholder="例如：我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子"
          />
          <button className="rounded bg-black text-white px-4 py-2 w-full">
            生成行程（下一步接入大模型）
          </button>
        </div>

        <div className="rounded border p-3">
          <div className="font-medium mb-2">行程（示例数据）</div>
          <ul className="space-y-2 text-sm">
            <li>Day1：故宫 → 南锣鼓巷</li>
            <li>Day2：后续由 AI 生成</li>
          </ul>
        </div>
      </div>

      <div className="p-3">
        <AmapView markers={markers} />
      </div>
    </div>
  );
}