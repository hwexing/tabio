"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import liff from "@line/liff";

type LiffStatus = "loading" | "ready" | "error";

type User = {
  display_name: string | null;
  picture_url: string | null;
  plan: string;
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  nights: number;
  party_size: number;
  start_date: string | null;
};

export default function Home() {
  const router = useRouter();
  const [liffStatus, setLiffStatus] = useState<LiffStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setErrorMessage("LIFF IDが設定されていません（NEXT_PUBLIC_LIFF_ID）。");
          setLiffStatus("error");
          return;
        }

        await liff.init({ liffId });

        if (!liff.isInClient()) {
          setErrorMessage("このアプリはLINEアプリ内で開いてください。");
          setLiffStatus("error");
          return;
        }

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("idTokenが取得できませんでした");

        const authRes = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!authRes.ok) {
          const err = await authRes.json().catch(() => ({}));
          throw new Error(err.error ?? "ログインに失敗しました");
        }

        const meRes = await fetch("/api/me");
        if (!meRes.ok) throw new Error("ユーザー情報の取得に失敗しました");
        const me: User = await meRes.json();
        setUser(me);

        // 共有リンク経由のアクセス（?share=TOKEN&tripId=ID）
        const urlParams = new URLSearchParams(window.location.search);
        const shareParam = urlParams.get("share");
        const tripIdParam = urlParams.get("tripId");
        if (shareParam && tripIdParam) {
          router.push(`/trips/${tripIdParam}?share=${encodeURIComponent(shareParam)}`);
          return;
        }

        setLiffStatus("ready");
        setTripsLoading(true);
        const tripsRes = await fetch("/api/trips");
        if (tripsRes.ok) setTrips(await tripsRes.json());
        setTripsLoading(false);
      } catch (e) {
        setErrorMessage(`エラー: ${String(e)}`);
        setLiffStatus("error");
      }
    })();
  }, []);

  if (liffStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBFE]">
        <p className="text-[#2B2333]/50 text-sm">読み込み中…</p>
      </div>
    );
  }

  if (liffStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBFE] px-6">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">開けませんでした</p>
          <p className="text-sm text-[#2B2333]/70">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7FF]">
      {/* ヘッダー */}
      <header
        className="px-6 pt-12 pb-8"
        style={{
          background: "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">
              たびおり ✨
            </h1>
            <p className="text-white/80 text-sm mt-0.5">
              {user?.display_name} さんのしおり
            </p>
          </div>
          {user?.picture_url && (
            <img
              src={user.picture_url}
              alt=""
              className="w-10 h-10 rounded-full border-2 border-white/50 object-cover"
            />
          )}
        </div>
      </header>

      {/* コンテンツ */}
      <main className="px-4 py-6 pb-32">
        {tripsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-[#2B2333] font-bold text-lg mb-2">
              しおりがまだありません
            </h2>
            <p className="text-[#2B2333]/50 text-sm mb-8">
              AIがあなただけの旅程を作ります
            </p>
            <Link
              href="/trips/new"
              className="text-white font-bold px-8 py-4 rounded-full shadow-md text-base"
              style={{
                background:
                  "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
              }}
            >
              ✨ 新しい旅をつくる
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-50 active:scale-[0.98] transition-transform">
                  <h3 className="font-bold text-[#2B2333] text-base leading-tight mb-1">
                    {trip.title}
                  </h3>
                  <p className="text-[#A66BFF] text-sm font-medium">
                    {trip.destination}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-[#2B2333]/40">
                    <span>
                      {trip.nights}泊{trip.nights + 1}日
                    </span>
                    <span>{trip.party_size}人</span>
                    {trip.start_date && <span>{trip.start_date}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 固定CTA */}
      {trips.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-6">
          <Link
            href="/trips/new"
            className="block text-white font-bold text-center py-4 rounded-full shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #FF6FB5 0%, #A66BFF 50%, #7B61FF 100%)",
            }}
          >
            ＋ 新しい旅をつくる
          </Link>
        </div>
      )}
    </div>
  );
}
