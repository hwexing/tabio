"use client";

import { useState } from "react";

const SAMPLE_INPUT = {
  destination: "韓国・ソウル",
  startDate: "2026-07-10",
  nights: 3,
  partySize: 1,
  budgetJpy: 80000,
  purposes: ["美容施術", "ショッピング", "カフェ巡り"],
  freeMemo: "25歳女性。コスメ多め。歩きすぎたくない。",
};

export default function DevPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleGenerate = async () => {
    setLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SAMPLE_INPUT),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`${res.status}: ${JSON.stringify(data)}`);
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-4">AI生成テスト（開発用）</h1>

      <div className="mb-4 bg-gray-100 rounded p-3 text-xs font-mono whitespace-pre-wrap">
        {JSON.stringify(SAMPLE_INPUT, null, 2)}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "生成中…（数秒かかります）" : "旅程を生成する"}
      </button>

      {error && (
        <div className="mt-4 text-red-600 text-sm bg-red-50 rounded p-3">
          {error}
        </div>
      )}

      {result && (
        <pre className="mt-4 text-xs bg-gray-100 rounded p-3 overflow-auto whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </main>
  );
}
