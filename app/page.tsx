"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type Status = "loading" | "ready" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [name, setName] = useState<string>("");
  const [picture, setPicture] = useState<string>("");
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

        // LINE外（PCブラウザ等）ではミニアプリは正しく動かない
        if (!liff.isInClient()) {
          setStatus("error");
          setMessage("このアプリはLINEアプリ内で開いてください。");
          return;
        }

        if (!liff.isLoggedIn()) {
          liff.login(); // ログイン後、自動でこのページに戻る
          return;
        }

        const profile = await liff.getProfile();
        setName(profile.displayName);
        setPicture(profile.pictureUrl ?? "");
        setStatus("ready");
      } catch (e) {
        setStatus("error");
        setMessage(`初期化に失敗しました: ${String(e)}`);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      {status === "loading" && <p className="text-gray-500">読み込み中…</p>}

      {status === "ready" && (
        <>
          {picture && (
            <img
              src={picture}
              alt=""
              className="w-20 h-20 rounded-full object-cover"
            />
          )}
          <h1 className="text-xl font-bold">ようこそ、{name} さん 👋</h1>
          <p className="text-sm text-gray-500">
            たびおり へのログインに成功しました。
          </p>
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
