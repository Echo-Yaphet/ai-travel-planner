"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
    onText: (text: string, isFinal: boolean) => void;
};

export default function VoiceInput({ onText }: Props) {
    const [supported, setSupported] = useState(true);
    const [listening, setListening] = useState(false);

    const recRef = useRef<any>(null);
    const isRecordingRef = useRef(false);
    const restartTimerRef = useRef<number | null>(null);

    // 避免父组件每次 render 导致 effect 重建
    const onTextRef = useRef(onText);
    useEffect(() => {
        onTextRef.current = onText;
    }, [onText]);

    const SpeechRecognitionCtor = useMemo(() => {
        if (typeof window === "undefined") return null;
        return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
    }, []);

    useEffect(() => {
        if (!SpeechRecognitionCtor) {
            setSupported(false);
            return;
        }

        const rec = new SpeechRecognitionCtor();
        rec.lang = "zh-CN";
        rec.continuous = true;
        rec.interimResults = true;

        rec.onstart = () => {
            setListening(true);
        };

        rec.onresult = (event: any) => {
            let interim = "";
            let finalText = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                const txt = res[0]?.transcript ?? "";
                if (res.isFinal) finalText += txt;
                else interim += txt;
            }

            if (interim) onTextRef.current(interim, false);
            if (finalText) onTextRef.current(finalText, true);
        };

        rec.onerror = (e: any) => {
            console.error("SpeechRecognition error:", e);

            // 权限相关错误：不要再自动重启
            if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
                isRecordingRef.current = false;
                setListening(false);
                return;
            }

            // 其它错误：稍后尝试重启（用户仍处于录音状态才重启）
            if (isRecordingRef.current) {
                if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
                restartTimerRef.current = window.setTimeout(() => {
                    try {
                        rec.start();
                    } catch { }
                }, 300);
            }
        };

        rec.onend = () => {
            // Web Speech 可能因为停顿就 end；如果用户还在录音，就自动续听
            if (isRecordingRef.current) {
                if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
                restartTimerRef.current = window.setTimeout(() => {
                    try {
                        rec.start();
                    } catch { }
                }, 200);
            } else {
                setListening(false);
            }
        };

        recRef.current = rec;

        return () => {
            if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;

            try {
                rec.abort?.();
            } catch { }
            try {
                rec.stop?.();
            } catch { }
            recRef.current = null;
        };
    }, [SpeechRecognitionCtor]);

    const start = () => {
        const rec = recRef.current;
        if (!rec) return;

        isRecordingRef.current = true;
        setListening(true);

        try {
            rec.start();
        } catch (e) {
            // 重复 start 会 InvalidStateError，忽略即可
            // 但为了“续听”，这里不把 listening 置回 false
            console.warn(e);
        }
    };

    const stop = () => {
        const rec = recRef.current;
        isRecordingRef.current = false;
        setListening(false);

        if (!rec) return;
        try {
            rec.stop();
        } catch { }
    };

    if (!supported) {
        return <div className="text-sm text-gray-600">当前浏览器不支持语音识别（建议用 Chrome）。</div>;
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
                {listening ? "正在识别…（若无反应请检查麦克风权限）" : "点击开始，用语音输入需求或记账"}
            </div>
        </div>
    );
}