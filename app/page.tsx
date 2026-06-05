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
  const [debugLines, setDebugLines] = useState<string[]>([]);

  const addDebug = (line: string) => {
    console.log("step:", line);
    setDebugLines((prev) => [...prev, line]);
  };

  useEffect(() => {
    (async () => {
      try {
        addDebug("1. start");

        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setStatus("error");
          setMessage("LIFF IDが設定されていません（NEXT_PUBLIC_LIFF_ID）。");
          return;
        }
        addDebug("2. liffId OK");

        await liff.init({ liffId });
        addDebug("3. liff.init 完了");

        if (!liff.isInClient()) {
          setStatus("error");
          setMessage("このアプリはLINEアプリ内で開いてください。");
          return;
        }
        addDebug("4. isInClient OK");

        const loggedIn = liff.isLoggedIn();
        addDebug(`5. isLoggedIn: ${loggedIn}`);

        if (!loggedIn) {
          addDebug("6. login() を呼びます");
          liff.login();
          return;
        }

        addDebug("7. getIDToken 呼び出し前");
        const idToken = liff.getIDToken();
        addDebug(
          `8. idToken: ${idToken === null ? "null" : `取得OK(長さ${idToken.length})`}`
        );

        if (!idToken) throw new Error("idTokenが取得できませんでした");

        addDebug("9. POST /api/auth/line 送信前");
        const authRes = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        addDebug(`10. /api/auth/line レスポンス: ${authRes.status}`);

        if (!authRes.ok) {
          const err = await authRes.json().catch(() => ({}));
          throw new Error(err.error ?? "ログインに失敗しました");
        }

        addDebug("11. GET /api/me 送信前");
        const meRes = await fetch("/api/me");
        addDebug(`12. /api/me レスポンス: ${meRes.status}`);

        if (!meRes.ok) throw new Error("ユーザー情報の取得に失敗しました");

        const me: User = await meRes.json();
        setUser(me);
        setStatus("ready");
        addDebug("13. 完了");
      } catch (e) {
        const msg = String(e);
        addDebug(`ERROR: ${msg}`);
        setStatus("error");
        setMessage(`エラー: ${msg}`);
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

      {/* デバッグパネル（常に表示） */}
      <div className="mt-6 w-full max-w-sm text-left bg-gray-100 rounded p-3">
        <p className="text-xs font-bold text-gray-500 mb-1">DEBUG</p>
        {debugLines.map((line, i) => (
          <p key={i} className="text-xs text-gray-700 font-mono">
            {line}
          </p>
        ))}
      </div>
    </main>
  );
}
