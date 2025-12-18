"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  onText: (text: string, isFinal: boolean) => void;
};

export default function VoiceInput({ onText }: Props) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const SpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += txt;
        else interim += txt;
      }

      if (interim) onText(interim, false);
      if (finalText) onText(finalText, true);
    };

    rec.onerror = (e: any) => {
      console.error("SpeechRecognition error:", e);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
      recRef.current = null;
    };
  }, [SpeechRecognition, onText]);

  const start = () => {
    if (!recRef.current) return;
    try {
      recRef.current.start();
      setListening(true);
    } catch (e) {
      // 某些情况下重复 start 会抛异常，忽略即可
      console.warn(e);
    }
  };

  const stop = () => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {}
    setListening(false);
  };

  if (!supported) {
    return (
      <div className="text-sm text-gray-600">
        当前浏览器不支持语音识别（建议用 Chrome）。
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {!listening ? (
        <button className="rounded bg-black text-white px-3 py-2" onClick={start}>
          🎤 开始说话
        </button>
      ) : (
        <button className="rounded bg-red-600 text-white px-3 py-2" onClick={stop}>
          ⏹ 停止
        </button>
      )}
      <div className="text-sm text-gray-600 flex items-center">
        {listening ? "正在识别…（请允许麦克风权限）" : "点击开始，用语音输入需求或记账"}
      </div>
    </div>
  );
}