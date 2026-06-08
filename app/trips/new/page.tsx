"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PURPOSES = [
  "美容施術",
  "ショッピング",
  "カフェ巡り",
  "デート向け",
  "グルメ",
  "観光",
  "自然",
  "アクティビティ",
];

const LOADING_MESSAGES = [
  "行き先を分析中…",
  "Day1を考え中…",
  "おすすめスポットを選定中…",
  "しおりを仕上げています…",
];

type PageState = "form" | "generating" | "error";

export default function NewTripPage() {
  const router = useRouter();

  // フォーム
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [nights, setNights] = useState(3);
  const [partySize, setPartySize] = useState(1);
  const [budgetJpy, setBudgetJpy] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [freeMemo, setFreeMemo] = useState("");

  // UI状態
  const [pageState, setPageState] = useState<PageState>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pageState === "generating") {
      intervalRef.current = setInterval(() => {
        setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pageState]);

  const togglePurpose = (p: string) => {
    setPurposes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const canSubmit = destination.trim().length > 0 && nights >= 1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPageState("generating");
    setLoadingMsgIdx(0);
    try {
      const res = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          startDate: startDate || undefined,
          nights,
          partySize,
          budgetJpy: budgetJpy ? Number(budgetJpy) : undefined,
          purposes,
          freeMemo: freeMemo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "生成に失敗しました");
        setPageState("error");
        return;
      }
      router.push(`/trips/${data.id}`);
    } catch (e) {
      setErrorMessage(String(e));
      setPageState("error");
    }
  };

  // ---- 生成中UI ----
  if (pageState === "generating") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{
          background: "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
        }}
      >
        <div className="text-center mb-10">
          <p className="text-white text-4xl mb-3 animate-bounce">✨</p>
          <h2 className="text-white font-bold text-xl mb-2">AIが旅程を作成中</h2>
          <p className="text-white/80 text-sm min-h-[1.5rem] transition-all">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </p>
        </div>
        {/* スケルトン */}
        <div className="w-full max-w-sm space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white/20 rounded-2xl p-4 animate-pulse flex gap-3 items-start"
            >
              <div className="w-8 h-8 bg-white/30 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/30 rounded w-2/3" />
                <div className="h-3 bg-white/20 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- エラーUI ----
  if (pageState === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7FF] px-6 text-center">
        <p className="text-3xl mb-4">😓</p>
        <h2 className="font-bold text-[#2B2333] text-lg mb-2">生成に失敗しました</h2>
        <p className="text-sm text-[#2B2333]/60 mb-8">{errorMessage}</p>
        <button
          onClick={() => setPageState("form")}
          className="text-white font-bold px-8 py-3 rounded-full"
          style={{
            background: "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
          }}
        >
          もう一度つくる
        </button>
      </div>
    );
  }

  // ---- フォームUI ----
  return (
    <div className="min-h-screen bg-[#FAF7FF]">
      {/* ヘッダー */}
      <header
        className="px-6 pt-12 pb-6 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="text-white/80 text-xl leading-none"
        >
          ←
        </button>
        <h1 className="text-white font-bold text-lg">新しい旅をつくる</h1>
      </header>

      <div className="px-4 py-6 pb-44 space-y-6">
        {/* 行き先 */}
        <div>
          <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
            行き先 <span className="text-[#A66BFF]">*</span>
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="例: 韓国・ソウル"
            className="w-full bg-white border border-purple-100 rounded-2xl px-4 py-3 text-[#2B2333] placeholder:text-[#2B2333]/30 focus:outline-none focus:ring-2 focus:ring-[#A66BFF]/40"
          />
        </div>

        {/* 日程 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
              出発日（任意）
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-purple-100 rounded-2xl px-4 py-3 text-[#2B2333] focus:outline-none focus:ring-2 focus:ring-[#A66BFF]/40"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
              泊数 <span className="text-[#A66BFF]">*</span>
            </label>
            <div className="flex items-center bg-white border border-purple-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setNights((n) => Math.max(1, n - 1))}
                className="px-3 py-3 text-[#A66BFF] font-bold text-lg leading-none"
              >
                −
              </button>
              <span className="flex-1 text-center text-[#2B2333] font-semibold">
                {nights}
              </span>
              <button
                onClick={() => setNights((n) => Math.min(30, n + 1))}
                className="px-3 py-3 text-[#A66BFF] font-bold text-lg leading-none"
              >
                ＋
              </button>
            </div>
          </div>
        </div>

        {/* 人数 */}
        <div>
          <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
            人数
          </label>
          <div className="flex items-center bg-white border border-purple-100 rounded-2xl w-36 overflow-hidden">
            <button
              onClick={() => setPartySize((n) => Math.max(1, n - 1))}
              className="px-4 py-3 text-[#A66BFF] font-bold text-lg leading-none"
            >
              −
            </button>
            <span className="flex-1 text-center text-[#2B2333] font-semibold">
              {partySize}人
            </span>
            <button
              onClick={() => setPartySize((n) => Math.min(20, n + 1))}
              className="px-4 py-3 text-[#A66BFF] font-bold text-lg leading-none"
            >
              ＋
            </button>
          </div>
        </div>

        {/* 予算 */}
        <div>
          <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
            予算（任意）
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2B2333]/40 font-medium">
              ¥
            </span>
            <input
              type="number"
              value={budgetJpy}
              onChange={(e) => setBudgetJpy(e.target.value)}
              placeholder="80000"
              className="w-full bg-white border border-purple-100 rounded-2xl px-4 pl-8 py-3 text-[#2B2333] placeholder:text-[#2B2333]/30 focus:outline-none focus:ring-2 focus:ring-[#A66BFF]/40"
            />
          </div>
        </div>

        {/* 目的タグ */}
        <div>
          <label className="block text-sm font-semibold text-[#2B2333] mb-2">
            旅行の目的（複数選択可）
          </label>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => {
              const selected = purposes.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePurpose(p)}
                  className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
                  style={
                    selected
                      ? {
                          background:
                            "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
                          color: "white",
                          borderColor: "transparent",
                        }
                      : {
                          background: "white",
                          color: "#2B2333",
                          borderColor: "#E8E0F5",
                        }
                  }
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* 自由メモ */}
        <div>
          <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
            もっと伝える（任意）
          </label>
          <textarea
            value={freeMemo}
            onChange={(e) => setFreeMemo(e.target.value)}
            placeholder="例: 歩きすぎたくない。コスメ多め。"
            maxLength={1000}
            rows={3}
            className="w-full bg-white border border-purple-100 rounded-2xl px-4 py-3 text-[#2B2333] placeholder:text-[#2B2333]/30 focus:outline-none focus:ring-2 focus:ring-[#A66BFF]/40 resize-none"
          />
        </div>
      </div>

      {/* 固定CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-[#FAF7FF] to-transparent">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full text-white font-bold py-4 rounded-full shadow-lg text-base transition-opacity disabled:opacity-40"
          style={{
            background:
              "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
          }}
        >
          ✨ AIでプランをつくる
        </button>
        {!canSubmit && (
          <p className="text-center text-xs text-[#2B2333]/40 mt-2">
            行き先と泊数を入力してください
          </p>
        )}
      </div>
    </div>
  );
}
