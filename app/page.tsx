"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type Status = "loading" | "ready" | "error";

type User = {
  display_name: string | null;
  picture_url: string | null;
  plan: string;
};

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setStatus("error");
          setMessage("LIFF IDが設定されていません（NEXT_PUBLIC_LIFF_ID）。");
          return;
        }

        await liff.init({ liffId });

        if (!liff.isInClient()) {
          setStatus("error");
          setMessage("このアプリはLINEアプリ内で開いてください。");
          return;
        }

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // idTokenを取得してバックエンドでログイン成立
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

        // セッションCookieが発行されたのでユーザー情報を取得
        const meRes = await fetch("/api/me");
        if (!meRes.ok) throw new Error("ユーザー情報の取得に失敗しました");

        const me: User = await meRes.json();
        setUser(me);
        setStatus("ready");
      } catch (e) {
        setStatus("error");
        setMessage(`エラー: ${String(e)}`);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      {status === "loading" && <p className="text-gray-500">読み込み中…</p>}

      {status === "ready" && user && (
        <>
          {user.picture_url && (
            <img
              src={user.picture_url}
              alt=""
              className="w-20 h-20 rounded-full object-cover"
            />
          )}
          <h1 className="text-xl font-bold">
            ようこそ、{user.display_name} さん 👋
          </h1>
          <p className="text-sm text-gray-500">
            たびおり へのログインに成功しました。
          </p>
          <p className="text-xs text-gray-400">プラン: {user.plan}</p>
        </>
      )}

      {status === "error" && (
        <div className="text-sm text-gray-600">
          <p className="font-medium text-red-500 mb-1">開けませんでした</p>
          <p>{message}</p>
        </div>
      )}
    </main>
  );
}
