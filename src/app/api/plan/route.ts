import { NextResponse } from "next/server";

type PlanRequest = { input: string };

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as PlanRequest;
        const input = (body.input ?? "").trim();
        if (!input) return NextResponse.json({ error: "input is required" }, { status: 400 });

        const apiKey = process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Server missing DASHSCOPE_API_KEY" }, { status: 500 });
        }

        const system = `
你是旅行规划助手。请根据用户输入生成“可执行”的旅行计划，并严格只输出 JSON。
要求：
1) 行程按天输出 days，每天 items 按时间排序
2) 每个 item 需要：time,type,name,address,lng,lat,cost_estimate,tips
3) 必须包含 budget 分项和 total
4) 只输出 JSON，不要出现多余文字，不要 markdown
JSON Schema：
{
  "summary": "string",
  "days": [
    {
      "day": 1,
      "title": "string",
      "items": [
        {
          "time": "09:30",
          "type": "sight|food|hotel|transport",
          "name": "string",
          "address": "string",
          "lng": 139.0,
          "lat": 35.0,
          "cost_estimate": 123,
          "tips": "string"
        }
      ]
    }
  ],
  "budget": { "transport":0, "hotel":0, "food":0, "tickets":0, "others":0, "total":0 }
}
注意：lng/lat 必须是数字（经度lng在前，纬度lat在后）。
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
                    temperature: 0.7,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: input },
                    ],
                }),
            }
        );

        if (!resp.ok) {
            const text = await resp.text();
            return NextResponse.json(
                { error: "LLM request failed", status: resp.status, detail: text.slice(0, 2000) },
                { status: 500 }
            );
        }

        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content || typeof content !== "string") {
            return NextResponse.json({ error: "LLM response missing content", raw: data }, { status: 500 });
        }

        const jsonText = extractJson(content);
        const plan = JSON.parse(jsonText);
        return NextResponse.json(plan);
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