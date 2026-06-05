import "server-only";
import { anthropic } from "./anthropic";
import { ItinerarySchema, type GenerateInput, type Itinerary } from "./schemas";

export type GenerationResult = {
  itinerary: Itinerary;
  latencyMs: number;
  tokenIn: number;
  tokenOut: number;
};

async function callAI(
  input: GenerateInput
): Promise<{ raw: unknown; tokenIn: number; tokenOut: number }> {
  const model = process.env.GENERATION_MODEL ?? "claude-haiku-4-5";

  const userPrompt = [
    `以下の条件で旅程を作成してください。`,
    `- 目的地: ${input.destination}`,
    `- 泊数: ${input.nights}泊${input.nights + 1}日`,
    `- 人数: ${input.partySize}人`,
    input.startDate ? `- 出発日: ${input.startDate}` : null,
    input.budgetJpy ? `- 予算: 約${input.budgetJpy.toLocaleString()}円` : null,
    input.purposes.length > 0 ? `- 目的: ${input.purposes.join("、")}` : null,
    input.freeMemo ? `- 備考: ${input.freeMemo}` : null,
    ``,
    `Day 1 〜 Day ${input.nights + 1} の合計${input.nights + 1}日分のプランを作成してください。`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: `あなたは日本人旅行者向けの旅程プランナーです。
入力条件（行き先/日数/人数/予算/目的/メモ）に合った実在しそうなスポットで旅程を構成してください。
1日4〜6スポット。詰め込みすぎず、移動の現実性を考慮してください。
purposesを最優先で反映してください（例: 美容施術なら皮膚科・エステ、ショッピングなら該当エリア）。
lat/lngは実在スポットの概算でよいです。正確を装って嘘の座標を作り込みすぎないでください。
moveToNextは徒歩/地下鉄など現実的な手段と所要時間の目安を記載してください（最後のスポットは空文字）。
出力はsave_itineraryツールの呼び出しのみ。自然文の説明は一切出さないでください。`,
    tools: [
      {
        name: "save_itinerary",
        description: "生成した旅程データを保存する",
        input_schema: {
          type: "object" as const,
          properties: {
            title: {
              type: "string",
              description:
                "旅程タイトル（例: 韓国・ソウル 3泊4日 美容&ショッピング）",
            },
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dayIndex: {
                    type: "integer",
                    description: "1始まりの日番号",
                  },
                  title: { type: "string", description: "その日のテーマ" },
                  spots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: {
                          type: "string",
                          description: "開始時間（例: 10:00）",
                        },
                        name: { type: "string", description: "スポット名" },
                        category: {
                          type: "string",
                          enum: [
                            "beauty",
                            "shopping",
                            "cafe",
                            "food",
                            "sightseeing",
                            "move",
                            "other",
                          ],
                        },
                        memo: { type: "string", description: "メモ・説明" },
                        lat: { type: "number", description: "緯度（概算）" },
                        lng: { type: "number", description: "経度（概算）" },
                        moveToNext: {
                          type: "string",
                          description:
                            "次のスポットへの移動方法（最後のスポットは空文字）",
                        },
                      },
                      required: [
                        "startTime",
                        "name",
                        "category",
                        "memo",
                        "lat",
                        "lng",
                        "moveToNext",
                      ],
                    },
                  },
                },
                required: ["dayIndex", "title", "spots"],
              },
            },
          },
          required: ["title", "days"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_itinerary" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUseBlock = message.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("ツールが呼ばれませんでした");
  }

  return {
    raw: toolUseBlock.input,
    tokenIn: message.usage.input_tokens,
    tokenOut: message.usage.output_tokens,
  };
}

export async function generateItinerary(
  input: GenerateInput
): Promise<GenerationResult> {
  const start = Date.now();
  let totalTokenIn = 0;
  let totalTokenOut = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { raw, tokenIn, tokenOut } = await callAI(input);
    totalTokenIn += tokenIn;
    totalTokenOut += tokenOut;

    const parsed = ItinerarySchema.safeParse(raw);
    const daysOk = parsed.success && parsed.data.days.length === input.nights + 1;

    if (daysOk && parsed.success) {
      return {
        itinerary: parsed.data,
        latencyMs: Date.now() - start,
        tokenIn: totalTokenIn,
        tokenOut: totalTokenOut,
      };
    }

    if (attempt === 1) {
      if (!parsed.success) {
        throw new Error(`スキーマ検証失敗: ${parsed.error.message}`);
      }
      throw new Error(
        `days数が不正（期待: ${input.nights + 1}, 実際: ${parsed.data.days.length}）`
      );
    }
  }

  throw new Error("生成失敗"); // ここには到達しない
}
