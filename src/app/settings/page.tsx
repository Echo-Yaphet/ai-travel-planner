"use client";

import { useEffect, useState } from "react";

const LS_AMAP_KEY = "ai_travel_planner_amap_key";
const LS_AMAP_SECURITY = "ai_travel_planner_amap_security_js_code";

export default function SettingsPage() {
  const [amapKey, setAmapKey] = useState("");
  const [securityJsCode, setSecurityJsCode] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAmapKey(localStorage.getItem(LS_AMAP_KEY) ?? "");
    setSecurityJsCode(localStorage.getItem(LS_AMAP_SECURITY) ?? "");
  }, []);

  function save() {
    localStorage.setItem(LS_AMAP_KEY, amapKey.trim());
    localStorage.setItem(LS_AMAP_SECURITY, securityJsCode.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      <div className="space-y-2">
        <div className="font-medium">高德 Web Key</div>
        <input
          className="w-full rounded border p-2"
          placeholder="在高德控制台创建 Web(JSAPI) Key"
          value={amapKey}
          onChange={(e) => setAmapKey(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="font-medium">安全密钥（securityJsCode）</div>
        <input
          className="w-full rounded border p-2"
          placeholder="在高德控制台里找到 securityJsCode"
          value={securityJsCode}
          onChange={(e) => setSecurityJsCode(e.target.value)}
        />
      </div>

      <button className="rounded bg-black text-white px-4 py-2" onClick={save}>
        保存
      </button>

      {saved && <div className="text-green-600">已保存 ✅</div>}

      <div className="text-sm text-gray-600">
        Key 只保存在浏览器 localStorage，不会写进代码仓库。
      </div>
    </div>
  );
}