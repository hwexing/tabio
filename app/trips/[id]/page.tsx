"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ShoppingTab from "./ShoppingTab";
import MapTab from "./MapTab";
import liff from "@line/liff";

const CATEGORY_EMOJI: Record<string, string> = {
  beauty: "💆",
  shopping: "🛍️",
  cafe: "☕",
  food: "🍜",
  sightseeing: "📸",
  move: "🚇",
  other: "📍",
};

type Spot = {
  id: string;
  sort_order: number;
  start_time: string;
  name: string;
  category: string;
  memo: string;
  lat: number;
  lng: number;
  move_to_next: string;
};

type Day = {
  id: string;
  day_index: number;
  title: string;
  date: string | null;
  trip_spots: Spot[];
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  nights: number;
  party_size: number;
  start_date: string | null;
  days: Day[];
  isOwner: boolean;
  canEdit: boolean;
};

type Tab = "itinerary" | "map" | "shopping";

function buildFlexCard(
  trip: Pick<Trip, "title" | "destination" | "nights" | "party_size">,
  shareUrl: string
) {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "✈️ たびおり", color: "#FFFFFF", size: "sm", weight: "bold" },
      ],
      backgroundColor: "#A66BFF",
      paddingAll: "15px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: trip.title, weight: "bold", size: "md", wrap: true, color: "#2B2333" },
        { type: "text", text: trip.destination, size: "sm", color: "#A66BFF", margin: "sm" },
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: `${trip.nights}泊${trip.nights + 1}日`, size: "sm", color: "#888888" },
            { type: "text", text: `${trip.party_size}人`, size: "sm", color: "#888888", margin: "md" },
          ],
          margin: "md",
        },
      ],
      paddingAll: "20px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "しおりを見る ✨", uri: shareUrl },
          style: "primary",
          color: "#A66BFF",
          height: "sm",
        },
      ],
      paddingAll: "15px",
    },
  };
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("share");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("itinerary");
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // 共有
  const [shareLoading, setShareLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");

  // コピー
  const [copyLoading, setCopyLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const url = shareToken
          ? `/api/trips/${params.id}?share=${encodeURIComponent(shareToken)}`
          : `/api/trips/${params.id}`;
        const res = await fetch(url);
        if (res.status === 401) {
          // 未認証 → ホームに戻して共有URLパラメータを保持
          const redirect = shareToken
            ? `/?share=${encodeURIComponent(shareToken)}&tripId=${params.id}`
            : "/";
          router.push(redirect);
          return;
        }
        if (!res.ok) { setError("しおりが見つかりませんでした"); setLoading(false); return; }
        setTrip(await res.json());
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, shareToken, router]);

  const handleShare = async () => {
    if (!trip) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/trips/${params.id}/share`, { method: "POST" });
      const { shareToken: token } = await res.json();
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID!;
      const shareUrl = `https://liff.line.me/${liffId}/?share=${encodeURIComponent(token)}&tripId=${params.id}`;
      const flexMessage = {
        type: "flex",
        altText: `${trip.title} のしおりが届きました ✈️`,
        contents: buildFlexCard(trip, shareUrl),
      };

      try {
        await liff.init({ liffId });
        if (liff.isApiAvailable("shareTargetPicker")) {
          const result = await liff.shareTargetPicker([flexMessage as any]);
          setShareFeedback(result?.status === "success" ? "送りました！" : "キャンセルしました");
        } else {
          await navigator.clipboard.writeText(shareUrl).catch(() => {});
          setShareFeedback("リンクをコピーしました");
        }
      } catch {
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        setShareFeedback("リンクをコピーしました");
      }
    } catch {
      setShareFeedback("エラーが発生しました");
    } finally {
      setShareLoading(false);
      setTimeout(() => setShareFeedback(""), 3000);
    }
  };

  const handleCopy = async () => {
    setCopyLoading(true);
    try {
      const res = await fetch(`/api/trips/${params.id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/trips/${data.id}`);
    } catch (e) {
      alert(`コピーに失敗しました: ${String(e)}`);
    } finally {
      setCopyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7FF]">
        <div className="h-40" style={{ background: "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)" }} />
        <div className="px-4 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7FF] px-6 text-center">
        <p className="text-red-500 font-semibold mb-2">エラー</p>
        <p className="text-sm text-[#2B2333]/60 mb-6">{error || "不明なエラー"}</p>
        <button onClick={() => router.push("/")} className="text-[#A66BFF] underline text-sm">ホームに戻る</button>
      </div>
    );
  }

  const activeDay = trip.days[activeDayIdx];

  return (
    <div className="min-h-screen bg-[#FAF7FF]">
      {/* ヘッダー */}
      <header
        className="px-5 pt-12 pb-5"
        style={{ background: "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)" }}
      >
        <button onClick={() => router.push("/")} className="text-white/80 text-sm mb-3 flex items-center gap-1">
          ← {trip.isOwner ? "一覧に戻る" : "ホームへ"}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg leading-snug">{trip.title}</h1>
            <p className="text-white/80 text-sm mt-0.5">{trip.destination}</p>
            <div className="flex gap-3 mt-2 text-white/70 text-xs">
              <span>{trip.nights}泊{trip.nights + 1}日</span>
              <span>{trip.party_size}人</span>
              {trip.start_date && <span>{trip.start_date}〜</span>}
            </div>
          </div>

          {/* 所有者: 共有ボタン / 閲覧者: コピーボタン */}
          {trip.isOwner ? (
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className="flex-shrink-0 bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-full border border-white/30 disabled:opacity-50"
            >
              {shareLoading ? "…" : "📤 共有"}
            </button>
          ) : (
            <button
              onClick={handleCopy}
              disabled={copyLoading}
              className="flex-shrink-0 bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-full border border-white/30 disabled:opacity-50"
            >
              {copyLoading ? "…" : "✨ 自分用コピー"}
            </button>
          )}
        </div>

        {/* フィードバック */}
        {shareFeedback && (
          <p className="text-white/90 text-xs mt-2">{shareFeedback}</p>
        )}
        {!trip.isOwner && (
          <p className="text-white/60 text-xs mt-2">
            {trip.canEdit ? "✏️ 共有しおり（編集できます）" : "👁 閲覧モード"}
          </p>
        )}
      </header>

      {/* タブ */}
      <div className="flex border-b border-purple-100 bg-white sticky top-0 z-10">
        {(["itinerary", "map", "shopping"] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = { itinerary: "旅程", map: "地図", shopping: "買い物" };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-semibold relative"
              style={{ color: active ? "#A66BFF" : "#2B233380" }}
            >
              {labels[tab]}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #FF6FB5, #7B61FF)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 旅程タブ */}
      {activeTab === "itinerary" && (
        <div>
          <div className="flex gap-2 px-4 py-3 overflow-x-auto">
            {trip.days.map((day, idx) => {
              const active = idx === activeDayIdx;
              return (
                <button
                  key={day.id}
                  onClick={() => setActiveDayIdx(idx)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
                  style={
                    active
                      ? { background: "linear-gradient(135deg, #FF6FB5 0%, #7B61FF 100%)", color: "white", borderColor: "transparent" }
                      : { background: "white", color: "#2B2333", borderColor: "#E8E0F5" }
                  }
                >
                  Day{day.day_index}
                </button>
              );
            })}
          </div>

          {activeDay && (
            <div className="px-4 mb-3">
              <h2 className="font-bold text-[#2B2333] text-base">{activeDay.title}</h2>
              {activeDay.date && <p className="text-xs text-[#2B2333]/40 mt-0.5">{activeDay.date}</p>}
            </div>
          )}

          <div className="px-4 pb-10">
            {!activeDay || activeDay.trip_spots.length === 0 ? (
              <p className="text-center text-[#2B2333]/40 text-sm py-10">スポットがありません</p>
            ) : (
              <div className="relative">
                <div
                  className="absolute left-5 top-3 bottom-3 w-0.5 rounded-full"
                  style={{ background: "linear-gradient(180deg, #FF6FB5, #7B61FF)" }}
                />
                <div className="space-y-0">
                  {activeDay.trip_spots.map((spot, i) => (
                    <div key={spot.id}>
                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 40 }}>
                          <div
                            className="w-3 h-3 rounded-full border-2 border-white mt-1 z-10 relative"
                            style={{ background: "linear-gradient(135deg, #FF6FB5, #7B61FF)" }}
                          />
                        </div>
                        <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm border border-purple-50 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-[#2B2333]/40 font-mono">{spot.start_time}</span>
                            <span className="text-base leading-none">{CATEGORY_EMOJI[spot.category] ?? "📍"}</span>
                          </div>
                          <p className="font-bold text-[#2B2333] text-sm leading-tight">{spot.name}</p>
                          {spot.memo && <p className="text-xs text-[#2B2333]/60 mt-1 leading-snug">{spot.memo}</p>}
                        </div>
                      </div>
                      {spot.move_to_next && i < activeDay.trip_spots.length - 1 && (
                        <div className="flex gap-4 items-center mb-1">
                          <div style={{ width: 40 }} className="flex-shrink-0" />
                          <p className="text-xs text-[#2B2333]/40 py-1">〜 {spot.move_to_next} 〜</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "map" && <MapTab days={trip.days} />}

      {activeTab === "shopping" && <ShoppingTab tripId={trip.id} isOwner={trip.canEdit} />}
    </div>
  );
}
