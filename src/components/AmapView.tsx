"use client";

import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

const LS_AMAP_KEY = "ai_travel_planner_amap_key";
const LS_AMAP_SECURITY = "ai_travel_planner_amap_security_js_code";

type MarkerItem = { name: string; lng: number; lat: number };

export default function AmapView(props: { markers?: MarkerItem[] }) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const key = localStorage.getItem(LS_AMAP_KEY) ?? "";
    const securityJsCode = localStorage.getItem(LS_AMAP_SECURITY) ?? "";

    if (!key || !securityJsCode) {
      setErr("未设置高德 Key/安全密钥：请先去 /settings 填写后刷新本页。");
      return;
    }

    (window as any)._AMapSecurityConfig = { securityJsCode };

    let destroyed = false;

    AMapLoader.load({
      key,
      version: "2.0",
      plugins: ["AMap.Scale", "AMap.ToolBar"],
    })
      .then((AMap) => {
        if (destroyed || !mapEl.current) return;

        const map = new AMap.Map(mapEl.current, {
          zoom: 11,
          center: [116.397428, 39.90923],
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar());

        mapRef.current = map;

        const list =
          props.markers ?? [
            { name: "示例点A", lng: 116.397428, lat: 39.90923 },
            { name: "示例点B", lng: 116.384, lat: 39.925 },
          ];

        const amapMarkers = list.map(
          (m) =>
            new AMap.Marker({
              position: [m.lng, m.lat],
              title: m.name,
            })
        );

        map.add(amapMarkers);
        map.setFitView(amapMarkers);
      })
      .catch((e) => {
        console.error(e);
        setErr("高德地图加载失败：请检查 Key/安全密钥是否正确。");
      });

    return () => {
      destroyed = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  }, [props.markers]);

  return (
    <div className="w-full h-full">
      {err ? (
        <div className="h-full w-full flex items-center justify-center p-4 text-red-600">
          {err}
        </div>
      ) : (
        <div ref={mapEl} className="w-full h-full rounded-lg border" />
      )}
    </div>
  );
}