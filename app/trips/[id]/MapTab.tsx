"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Phase2: AI生成の概算座標のズレはMVPで許容。将来はジオコーディングAPIで精度向上予定。

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

type Props = {
  days: Day[];
};

// 地図コンポーネントをSSR無効で動的インポート
const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function MapTab({ days }: Props) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const activeDay = days[activeDayIdx];
  const spotsWithLocation = activeDay?.trip_spots.filter(
    (s) => s.lat != null && s.lng != null && s.lat !== 0 && s.lng !== 0
  ) ?? [];
  const selectedSpot = spotsWithLocation.find((s) => s.id === selectedSpotId) ?? spotsWithLocation[0] ?? null;

  const handlePinClick = (spotId: string) => setSelectedSpotId(spotId);

  const googleMapsUrl = selectedSpot
    ? `https://www.google.com/maps/search/?api=1&query=${selectedSpot.lat},${selectedSpot.lng}`
    : null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* Day切り替え */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white">
        {days.map((day, idx) => {
          const active = idx === activeDayIdx;
          return (
            <button
              key={day.id}
              onClick={() => { setActiveDayIdx(idx); setSelectedSpotId(null); }}
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

      {spotsWithLocation.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-4xl mb-3">📍</p>
          <p className="font-semibold text-[#2B2333] mb-1">位置情報がありません</p>
          <p className="text-sm text-[#2B2333]/50">この日のスポットには位置情報が設定されていません</p>
        </div>
      ) : (
        <>
          {/* 地図エリア */}
          <div className="flex-1 relative" style={{ minHeight: 0 }}>
            <MapView
              spots={spotsWithLocation}
              selectedSpotId={selectedSpotId ?? spotsWithLocation[0]?.id ?? null}
              onPinClick={handlePinClick}
            />
          </div>

          {/* スポット情報カード */}
          {selectedSpot && (
            <div className="bg-white border-t border-purple-100 px-4 py-3 shadow-lg">
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #FF6FB5, #7B61FF)" }}
                >
                  {spotsWithLocation.findIndex((s) => s.id === selectedSpot.id) + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-[#2B2333]/40 font-mono">{selectedSpot.start_time}</span>
                  </div>
                  <p className="font-bold text-[#2B2333] text-sm leading-tight">{selectedSpot.name}</p>
                  {selectedSpot.memo && (
                    <p className="text-xs text-[#2B2333]/60 mt-1 leading-snug line-clamp-2">{selectedSpot.memo}</p>
                  )}
                </div>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-full text-white"
                    style={{ background: "linear-gradient(135deg, #FF6FB5, #7B61FF)" }}
                    onClick={(e) => {
                      // LINE内ブラウザ対応: liff.openWindowが使えない場合はそのまま開く
                      e.stopPropagation();
                    }}
                  >
                    地図で開く
                  </a>
                )}
              </div>

              {/* 横スクロールのスポットリスト */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {spotsWithLocation.map((spot, i) => {
                  const isSelected = spot.id === selectedSpot.id;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => setSelectedSpotId(spot.id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                      style={
                        isSelected
                          ? { background: "linear-gradient(135deg, #FF6FB5 0%, #7B61FF 100%)", color: "white", borderColor: "transparent" }
                          : { background: "white", color: "#2B2333", borderColor: "#E8E0F5" }
                      }
                    >
                      <span>{i + 1}</span>
                      <span className="max-w-[80px] truncate">{spot.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
