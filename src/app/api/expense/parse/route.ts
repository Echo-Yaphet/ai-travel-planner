import { NextResponse } from "next/server";

type Req = { text: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Req;
    const text = (body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing DASHSCOPE_API_KEY" }, { status: 500 });
    }

    const system = `
你是记账助手。用户输入可能来自语音识别。请把输入解析为严格 JSON。
只输出 JSON，不要多余文字。
字段：
{
  "amount": number,            // 金额，单位元
  "category": "transport|hotel|food|tickets|shopping|others",
  "note": string               // 简短备注
}
规则：
- 识别“元/块/¥/RMB”等金额表达
- 类别映射示例：打车/地铁/公交/高铁/飞机=transport；酒店/住宿=hotel；吃/餐厅/咖啡=food；门票/景点票=tickets；买/购物=shopping；其他=others
- 金额缺失时 amount=0
`.trim();

    const resp = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-plus",
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: text },
          ],
        }),
      }
    );

    if (!resp.ok) {
      const detail = await resp.text();
      return NextResponse.json(
        { error: "LLM request failed", status: resp.status, detail: detail.slice(0, 2000) },
        { status: 500 }
      );
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "LLM response missing content", raw: data }, { status: 500 });
    }

    const jsonText = extractJson(content);
    const parsed = JSON.parse(jsonText);

    // 轻度兜底
    if (typeof parsed.amount !== "number") parsed.amount = Number(parsed.amount) || 0;
    if (!parsed.category) parsed.category = "others";
    if (!parsed.note) parsed.note = text;

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}

function extractJson(s: string) {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return s.slice(start, end + 1);
  return s;
}