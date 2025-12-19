"use client";

import { useEffect, useMemo, useState } from "react";
import VoiceInput from "@/components/VoiceInput";

type Category = "transport" | "hotel" | "food" | "tickets" | "shopping" | "others";

export type ExpenseItem = {
  id: string;
  amount: number;
  category: Category;
  note: string;
  createdAt: string;
};

function sumBy(items: ExpenseItem[]) {
  const res: Record<Category, number> = {
    transport: 0,
    hotel: 0,
    food: 0,
    tickets: 0,
    shopping: 0,
    others: 0,
  };
  for (const it of items) res[it.category] += it.amount || 0;
  return res;
}

const catLabel: Record<Category, string> = {
  transport: "交通",
  hotel: "住宿",
  food: "餐饮",
  tickets: "门票",
  shopping: "购物",
  others: "其他",
};

export default function ExpensesPanel(props: {
  tripKey: string; // 用来 localStorage 分桶
  budget?: { transport?: number; hotel?: number; food?: number; tickets?: number; others?: number; total?: number };
}) {
  const storageKey = `ai_travel_planner_expenses_${props.tripKey}`;

  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Category>("food");
  const [note, setNote] = useState<string>("");

  const [speechInterim, setSpeechInterim] = useState("");
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const totals = useMemo(() => sumBy(items), [items]);
  const actualTotal = useMemo(() => Object.values(totals).reduce((a, b) => a + b, 0), [totals]);

  const planned = props.budget ?? {};
  const plannedTotal = planned.total ?? 0;

  const addItem = () => {
    const it: ExpenseItem = {
      id: crypto.randomUUID(),
      amount: Number(amount) || 0,
      category,
      note: note.trim() || "（无备注）",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [it, ...prev]);
    setAmount(0);
    setNote("");
    setCategory("food");
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const parseSpeech = async (text: string) => {
    setParsing(true);
    try {
      const resp = await fetch("/api/expense/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(`${data?.error ?? "parse failed"}\n${data?.detail ?? ""}`);

      setAmount(Number(data.amount) || 0);
      setCategory((data.category as Category) || "others");
      setNote(String(data.note ?? "").slice(0, 80));
    } catch (e: any) {
      alert(`语音解析失败：${e.message ?? e}`);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="rounded border p-3 space-y-3">
      <div className="font-medium">费用记录（支持语音）</div>

      <div className="space-y-2">
        <VoiceInput
          onText={(t, isFinal) => {
            if (!isFinal) {
              setSpeechInterim(t);
              return;
            }
            setSpeechInterim("");
            // 只在最终结果时解析
            parseSpeech(t);
          }}
        />
        {speechInterim && <div className="text-sm text-gray-600">识别中：{speechInterim}</div>}
        {parsing && <div className="text-sm text-gray-600">正在解析记账内容…</div>}
        <div className="text-xs text-gray-500">示例：说“午饭 80 元”“打车 35”“门票 120”</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="text-sm text-gray-600">金额（元）</div>
          <input
            className="w-full rounded border p-2"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm text-gray-600">类别</div>
          <select
            className="w-full rounded border p-2"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {Object.keys(catLabel).map((k) => (
              <option key={k} value={k}>
                {catLabel[k as Category]}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 space-y-1">
          <div className="text-sm text-gray-600">备注</div>
          <input className="w-full rounded border p-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <button
        className="rounded bg-black text-white px-4 py-2 w-full disabled:opacity-50"
        onClick={addItem}
        disabled={!amount && !note.trim()}
      >
        添加开销
      </button>

      <div className="rounded border p-2 text-sm space-y-1">
        <div className="font-medium">预算 vs 实际</div>
        <div className="grid grid-cols-2 gap-1">
          <div>预算合计：{plannedTotal}</div>
          <div className="font-medium">实际合计：{actualTotal}</div>
          <div>交通：{totals.transport} / {planned.transport ?? 0}</div>
          <div>住宿：{totals.hotel} / {planned.hotel ?? 0}</div>
          <div>餐饮：{totals.food} / {planned.food ?? 0}</div>
          <div>门票：{totals.tickets} / {planned.tickets ?? 0}</div>
          <div>其他：{totals.others + totals.shopping} / {planned.others ?? 0}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-medium text-sm">记录列表</div>
        {items.length === 0 ? (
          <div className="text-sm text-gray-600">暂无记录</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="rounded border p-2 text-sm flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {catLabel[it.category]} ¥{it.amount}
                  </div>
                  <div className="text-gray-700">{it.note}</div>
                </div>
                <button className="text-red-600 text-sm" onClick={() => removeItem(it.id)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}