"use client";

import { useEffect, useMemo, useState } from "react";
import VoiceInput from "@/components/VoiceInput";
import { supabase } from "@/lib/supabaseClient";

type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  note: string;
  createdAt: number;
};

export default function ExpensesPanel(props: {
  tripKey: string; // 本地存储 key（draft_xxx 或 tripId）
  tripId: string | null; // 云端 trip id（保存后才有）
  budget?: any; // 可选：用于展示预算/剩余
}) {
  const { tripKey, tripId, budget } = props;

  const storageKey = useMemo(() => `expenses_${tripKey}`, [tripKey]);

  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("餐饮");
  const [note, setNote] = useState<string>("");
  const [interim, setInterim] = useState<string>("");

  const [items, setItems] = useState<ExpenseRow[]>([]);

  // 读取本地记录
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const list = raw ? (JSON.parse(raw) as ExpenseRow[]) : [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  // 写入本地记录
  function persist(next: ExpenseRow[]) {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    [items]
  );

  const budgetTotal = Number(budget?.total ?? 0) || 0;
  const remain = budgetTotal ? Math.max(0, budgetTotal - total) : null;

  async function addExpense() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      alert("请输入正确的金额（>0）");
      return;
    }

    const row: ExpenseRow = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      amount: n,
      category: category || "其他",
      note: note.trim(),
      createdAt: Date.now(),
    };

    const next = [row, ...items];
    persist(next);

    // 如果你后面有做“保存到云端费用表”，可以在这里补 supabase insert
    // 目前保持：本地可用；登录/云端不影响使用
    if (supabase && tripId) {
      // 这里只做“可扩展点”，不强依赖云端表存在
      // 你要云端存费用的话，把下面注释打开并确保有 expenses 表
      /*
      await supabase.from("expenses").insert({
        trip_id: tripId,
        amount: n,
        category: row.category,
        note: row.note,
        created_at: new Date(row.createdAt).toISOString(),
      });
      */
    }

    setAmount("");
    setNote("");
    setInterim("");
  }

  function removeExpense(id: string) {
    const next = items.filter((x) => x.id !== id);
    persist(next);
  }

  return (
    <div className="rounded border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">费用记录（支持语音）</div>
        <div className="text-xs text-gray-500">
          {supabase && tripId ? "已关联云端行程" : "仅本地保存"}
        </div>
      </div>

      {/* 语音输入（费用备注） */}
      <div className="rounded border p-2 space-y-2">
        <div className="text-sm text-gray-700">语音输入（会写入备注）</div>
        <VoiceInput
          onText={(text, isFinal) => {
            if (isFinal) {
              setNote((prev) => {
                const t = text.trim();
                if (!t) return prev;
                return prev ? `${prev} ${t}` : t;
              });
              setInterim("");
            } else {
              setInterim(text);
            }
          }}
        />
        {interim ? (
          <div className="text-xs text-gray-500">
            识别中：{interim}
          </div>
        ) : null}
      </div>

      {/* 金额 + 类别：用 flex 防溢出，类别用 select（可选） */}
      <div className="flex items-center gap-2">
        <input
          className="w-24 shrink-0 rounded border p-2"
          placeholder="金额"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="flex-1 min-w-0">
          <select
            className="w-full rounded border p-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="餐饮">餐饮</option>
            <option value="交通">交通</option>
            <option value="门票">门票</option>
            <option value="住宿">住宿</option>
            <option value="购物">购物</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>

      <input
        className="w-full rounded border p-2"
        placeholder='备注（可选）例如：“午饭 80 元”'
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        className="rounded bg-black text-white px-4 py-2 w-full disabled:opacity-50"
        onClick={addExpense}
        disabled={!amount}
      >
        添加一条
      </button>

      <div className="text-sm">
        <div>合计：{total}</div>
        {budgetTotal ? (
          <div className="text-gray-700">
            参考预算：{budgetTotal}　剩余预算：{remain}
          </div>
        ) : null}
      </div>

      {/* 列表 */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">暂无费用记录</div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="rounded border p-2 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{it.amount}</span>{" "}
                  <span className="text-gray-600">· {it.category}</span>
                </div>
                {it.note ? (
                  <div className="text-xs text-gray-600 break-words">
                    {it.note}
                  </div>
                ) : null}
              </div>

              <button
                className="shrink-0 text-xs underline text-gray-600"
                onClick={() => removeExpense(it.id)}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}