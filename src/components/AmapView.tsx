"use client";

import { useEffect, useRef, useState } from "react";

const LS_AMAP_KEY = "ai_travel_planner_amap_key";
const LS_AMAP_SECURITY = "ai_travel_planner_amap_security_js_code";

type MarkerPoint = {
  lng: number;
  lat: number;
  title?: string;
};

type Props = {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: MarkerPoint[];
};

export default function AmapView({
  center = [116.397428, 39.90923],
  zoom = 11,
  markers = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const AMapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const [err, setErr] = useState<string>("");

  // 只在浏览器初始化地图：动态 import AMapLoader，避免构建期/SSR 执行到 window
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (typeof window === "undefined") return;

        const key = localStorage.getItem(LS_AMAP_KEY) || "";
        const securityJsCode = localStorage.getItem(LS_AMAP_SECURITY) || "";

        if (!key) {
          setErr("未检测到高德 Key：请先到【设置】里填写 Key");
          return;
        }

        // 高德安全密钥（JS API 安全密钥）
        if (securityJsCode) {
          (window as any)._AMapSecurityConfig = { securityJsCode };
        }

        // ✅ 关键：动态导入，避免在 Node/SSR 环境下模块初始化触发 window
        const { default: AMapLoader } = await import("@amap/amap-jsapi-loader");

        const AMap = await AMapLoader.load({
          key,
          version: "2.0",
          plugins: ["AMap.ToolBar", "AMap.Scale"],
        });

        if (cancelled) return;

        AMapRef.current = AMap;

        if (!containerRef.current) return;

        mapRef.current = new AMap.Map(containerRef.current, {
          zoom,
          center,
          viewMode: "2D",
        });

        mapRef.current.addControl(new AMap.ToolBar());
        mapRef.current.addControl(new AMap.Scale());
      } catch (e: any) {
        setErr(e?.message || "地图初始化失败（请检查 Key/安全密钥/绑定域名）");
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        markerRefs.current.forEach((m) => m?.setMap?.(null));
        markerRefs.current = [];
        mapRef.current?.destroy?.();
      } catch {}
      mapRef.current = null;
      AMapRef.current = null;
    };
  }, [center, zoom]);

  // markers 更新
  useEffect(() => {
    const AMap = AMapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    // 清理旧点
    markerRefs.current.forEach((m) => m?.setMap?.(null));
    markerRefs.current = [];

    if (!markers.length) return;

    const ms = markers.map((p) => {
      const marker = new AMap.Marker({
        position: [p.lng, p.lat],
        title: p.title || "",
      });
      marker.setMap(map);
      return marker;
    });

    markerRefs.current = ms;

    try {
      map.setFitView(ms);
    } catch {}
  }, [markers]);

  return (
    <div className="w-full h-full relative">
      {err ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 p-4 text-sm text-red-600">
          {err}
        </div>
      ) : null}
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
    </div>
  );
}