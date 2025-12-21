"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const LS_AMAP_KEY = "ai_travel_planner_amap_key";
const LS_AMAP_SECURITY = "ai_travel_planner_amap_security_js_code";

export type MarkerPoint = {
  name: string;
  lng: number;
  lat: number;
};

export default function AmapView(props: {
  center?: [number, number];
  zoom?: number;
  markers?: MarkerPoint[];
}) {
  const { center = [116.397428, 39.90923], zoom = 11, markers = [] } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<any>(null);
  const AMapRef = useRef<any>(null);
  const drivingRef = useRef<any>(null);

  const markerObjsRef = useRef<any[]>([]);
  const myPosMarkerRef = useRef<any>(null);

  const [err, setErr] = useState<string>("");
  const [locating, setLocating] = useState(false);

  const [myPos, setMyPos] = useState<{ lng: number; lat: number } | null>(null);
  const [dest, setDest] = useState<MarkerPoint | null>(null);

  const navUrl = useMemo(() => {
    if (!myPos || !dest) return "";
    // 高德“URI导航”链接：网页打开，可唤起高德 App（若安装）
    const from = `${myPos.lng},${myPos.lat},我的位置`;
    const to = `${dest.lng},${dest.lat},${encodeURIComponent(dest.name || "目的地")}`;
    return `https://uri.amap.com/navigation?from=${from}&to=${to}&mode=car&policy=1&src=ai_travel_planner&coordinate=gaode&callnative=1`;
  }, [myPos, dest]);

  // 初始化地图
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

        if (securityJsCode) {
          (window as any)._AMapSecurityConfig = { securityJsCode };
        }

        const { default: AMapLoader } = await import("@amap/amap-jsapi-loader");

        const AMap = await AMapLoader.load({
          key,
          version: "2.0",
          plugins: [
            "AMap.ToolBar",
            "AMap.Scale",
            "AMap.Geolocation",
            "AMap.Driving",
          ],
        });

        if (cancelled) return;

        AMapRef.current = AMap;

        if (!containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom,
          center,
          viewMode: "2D",
        });
        mapRef.current = map;

        map.addControl(new AMap.ToolBar());
        map.addControl(new AMap.Scale());

        // 路线规划实例（驾车）
        drivingRef.current = new AMap.Driving({
          map,
          panel: panelRef.current || undefined,
          // policy 可选策略（速度优先/费用优先等），默认即可
        });

        // 自动定位（同时也是“地理位置服务”要求）
        locate();

        // 画 markers
        renderMarkers(markers);
      } catch (e: any) {
        setErr(e?.message || "地图初始化失败（请检查 Key/安全密钥/绑定域名）");
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        markerObjsRef.current.forEach((m) => m?.setMap?.(null));
        markerObjsRef.current = [];
        myPosMarkerRef.current?.setMap?.(null);
        myPosMarkerRef.current = null;

        mapRef.current?.destroy?.();
      } catch {}
      mapRef.current = null;
      AMapRef.current = null;
      drivingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers 更新时重画
  useEffect(() => {
    if (!AMapRef.current || !mapRef.current) return;
    renderMarkers(markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  function renderMarkers(list: MarkerPoint[]) {
    const AMap = AMapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    // 清空旧 markers
    markerObjsRef.current.forEach((m) => m?.setMap?.(null));
    markerObjsRef.current = [];

    if (!list?.length) return;

    const ms = list.map((p) => {
      const m = new AMap.Marker({
        position: [p.lng, p.lat],
        title: p.name,
      });
      m.on("click", () => {
        setDest(p);
        planRouteTo(p);
      });
      m.setMap(map);
      return m;
    });

    markerObjsRef.current = ms;

    try {
      map.setFitView(ms);
    } catch {}
  }

  function locate() {
    const AMap = AMapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    setLocating(true);
    setErr("");

    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 8000,
      position: "RB",
      zoomToAccuracy: true,
    });

    // 控件显示在地图上（可选）
    map.addControl(geolocation);

    geolocation.getCurrentPosition((status: string, result: any) => {
      setLocating(false);

      if (status === "complete") {
        const pos = result?.position;
        if (!pos) return;

        const lng = pos.lng;
        const lat = pos.lat;
        setMyPos({ lng, lat });

        // 显示“我的位置”marker
        try {
          myPosMarkerRef.current?.setMap?.(null);
          myPosMarkerRef.current = new AMap.Marker({
            position: [lng, lat],
            title: "我的位置",
          });
          myPosMarkerRef.current.setMap(map);
        } catch {}
      } else {
        setErr("定位失败：请检查浏览器麦克风/定位权限，或在 HTTPS/localhost 下访问。");
      }
    });
  }

  function planRouteTo(p: MarkerPoint) {
    const AMap = AMapRef.current;
    const map = mapRef.current;
    const driving = drivingRef.current;
    if (!AMap || !map || !driving) return;

    if (!myPos) {
      setErr("尚未获取到当前位置：请先点击“重新定位”后再规划路线。");
      return;
    }

    setErr("");

    const origin = new AMap.LngLat(myPos.lng, myPos.lat);
    const destination = new AMap.LngLat(p.lng, p.lat);

    driving.search(origin, destination, (status: string, result: any) => {
      if (status !== "complete") {
        setErr("路线规划失败：请稍后重试或检查 Key/配额。");
      }
    });
  }

  return (
    <div className="w-full h-full relative">
      {/* 顶部浮层控制条 */}
      <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-2">
        <button
          className="rounded bg-white border px-3 py-2 text-sm shadow"
          onClick={locate}
          disabled={locating}
        >
          {locating ? "定位中…" : "重新定位"}
        </button>

        {dest && myPos ? (
          <a
            className="rounded bg-black text-white px-3 py-2 text-sm shadow"
            href={navUrl}
            target="_blank"
            rel="noreferrer"
          >
            打开高德导航
          </a>
        ) : (
          <span className="rounded bg-white/80 border px-3 py-2 text-sm">
            点击地图上的点位可规划路线
          </span>
        )}
      </div>

      {/* 错误提示 */}
      {err ? (
        <div className="absolute bottom-2 left-2 right-2 z-20 rounded bg-white/90 border p-2 text-sm text-red-600">
          {err}
        </div>
      ) : null}

      {/* 地图与路线面板：右侧路线结果（可滚动） */}
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2">
        <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
        <div className="hidden lg:block rounded-xl border overflow-auto bg-white">
          <div className="p-2 text-sm font-medium border-b">路线详情</div>
          <div ref={panelRef} className="p-2 text-sm" />
          {!dest ? (
            <div className="p-2 text-sm text-gray-500">
              提示：点击地图上的景点 Marker，即可从“我的位置”规划驾车路线并显示详情。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}