"use client";

import { useEffect, useState } from "react";

export const SHOPPING_CATEGORIES = [
  { value: "cosme", label: "コスメ", emoji: "💄" },
  { value: "clothes", label: "洋服", emoji: "👕" },
  { value: "souvenir", label: "お土産", emoji: "🎁" },
  { value: "oshikatsu", label: "推し活", emoji: "💖" },
  { value: "other", label: "その他", emoji: "🛒" },
] as const;

type Category = (typeof SHOPPING_CATEGORIES)[number]["value"];

type ShoppingItem = {
  id: string;
  name: string;
  category: Category;
  is_done: boolean;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; item: ShoppingItem };

export default function ShoppingTab({ tripId }: { tripId: string }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  // モーダルの入力
  const [inputName, setInputName] = useState("");
  const [inputCategory, setInputCategory] = useState<Category>("other");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/shopping`);
      if (!res.ok) throw new Error(await res.text());
      setItems(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setInputName("");
    setInputCategory("other");
    setModal({ mode: "add" });
  };

  const openEdit = (item: ShoppingItem) => {
    setInputName(item.name);
    setInputCategory(item.category);
    setModal({ mode: "edit", item });
  };

  const closeModal = () => setModal({ mode: "closed" });

  const handleSave = async () => {
    if (!inputName.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === "add") {
        const res = await fetch(`/api/trips/${tripId}/shopping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputName.trim(), category: inputCategory }),
        });
        if (!res.ok) throw new Error();
        const newItem: ShoppingItem = await res.json();
        setItems((prev) => [...prev, newItem]);
      } else if (modal.mode === "edit") {
        const res = await fetch(`/api/shopping/${modal.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputName.trim(), category: inputCategory }),
        });
        if (!res.ok) throw new Error();
        const updated: ShoppingItem = await res.json();
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
      closeModal();
    } catch {
      // サイレントに失敗（モーダルは開いたまま）
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: ShoppingItem) => {
    // 楽観的更新
    const newDone = !item.is_done;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_done: newDone } : i))
    );
    const res = await fetch(`/api/shopping/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_done: newDone }),
    });
    // 失敗したら元に戻す
    if (!res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i))
      );
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/shopping/${id}`, { method: "DELETE" });
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-3 items-center">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="h-3 bg-gray-200 rounded flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  const doneCount = items.filter((i) => i.is_done).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  return (
    <div className="pb-32">
      {/* 進捗 */}
      {totalCount > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-semibold text-[#2B2333]">
              買いたいもの
            </span>
            <span className="text-sm text-[#A66BFF] font-bold">
              {doneCount} / {totalCount}
            </span>
          </div>
          <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, #FF6FB5, #7B61FF)",
              }}
            />
          </div>
        </div>
      )}

      {/* リスト or 空状態 */}
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="font-semibold text-[#2B2333] mb-1">
            まだ何もありません
          </p>
          <p className="text-sm text-[#2B2333]/50 mb-6">
            ✨ 欲しいものを追加してみましょう
          </p>
          <button
            onClick={openAdd}
            className="text-white font-bold px-6 py-3 rounded-full text-sm"
            style={{
              background: "linear-gradient(135deg, #FF6FB5 0%, #7B61FF 100%)",
            }}
          >
            ＋ 追加する
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-5">
          {SHOPPING_CATEGORIES.map(({ value, label, emoji }) => {
            const catItems = items.filter((i) => i.category === value);
            if (catItems.length === 0) return null;
            return (
              <div key={value}>
                <h3 className="text-xs font-bold text-[#2B2333]/50 mb-2 flex items-center gap-1">
                  <span>{emoji}</span> {label}
                </h3>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-purple-50 flex items-center gap-3"
                    >
                      {/* チェックボックス */}
                      <button
                        onClick={() => handleToggle(item)}
                        className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                        style={
                          item.is_done
                            ? {
                                background:
                                  "linear-gradient(135deg, #FF6FB5, #7B61FF)",
                                borderColor: "transparent",
                              }
                            : { borderColor: "#D8CAEE" }
                        }
                      >
                        {item.is_done && (
                          <svg
                            width="12"
                            height="10"
                            viewBox="0 0 12 10"
                            fill="none"
                          >
                            <path
                              d="M1 5l3.5 3.5L11 1"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>

                      {/* 名前 */}
                      <span
                        className="flex-1 text-sm font-medium"
                        style={{
                          color: item.is_done ? "#2B233360" : "#2B2333",
                          textDecoration: item.is_done ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </span>

                      {/* 操作ボタン */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="w-8 h-8 flex items-center justify-center text-[#A66BFF] text-base rounded-full hover:bg-purple-50"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-8 h-8 flex items-center justify-center text-red-300 text-base rounded-full hover:bg-red-50"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 固定CTAボタン（アイテムがあるとき） */}
      {totalCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4">
          <button
            onClick={openAdd}
            className="w-full text-white font-bold py-4 rounded-full shadow-lg"
            style={{
              background: "linear-gradient(135deg, #FF6FB5 0%, #7B61FF 100%)",
            }}
          >
            ＋ 追加する
          </button>
        </div>
      )}

      {/* ボトムシートモーダル */}
      {modal.mode !== "closed" && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeModal}
          />
          {/* シート */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 px-5 pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-[#2B2333] text-base mb-4">
              {modal.mode === "add" ? "アイテムを追加" : "アイテムを編集"}
            </h2>

            {/* 名前 */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#2B2333] mb-1.5">
                名前
              </label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="例: イニスフリーのクッションファンデ"
                autoFocus
                className="w-full bg-[#FAF7FF] border border-purple-100 rounded-2xl px-4 py-3 text-[#2B2333] placeholder:text-[#2B2333]/30 focus:outline-none focus:ring-2 focus:ring-[#A66BFF]/40"
              />
            </div>

            {/* カテゴリ */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#2B2333] mb-2">
                カテゴリ
              </label>
              <div className="flex flex-wrap gap-2">
                {SHOPPING_CATEGORIES.map(({ value, label, emoji }) => {
                  const selected = inputCategory === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setInputCategory(value)}
                      className="px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-1"
                      style={
                        selected
                          ? {
                              background:
                                "linear-gradient(135deg, #FF6FB5 0%, #7B61FF 100%)",
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
                      {emoji} {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 保存ボタン */}
            <button
              onClick={handleSave}
              disabled={!inputName.trim() || saving}
              className="w-full text-white font-bold py-4 rounded-full disabled:opacity-40 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #FF6FB5 0%, #7B61FF 100%)",
              }}
            >
              {saving ? "保存中…" : "保存する"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
