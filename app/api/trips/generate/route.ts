import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { GenerateInputSchema } from "@/lib/schemas";
import { generateItinerary } from "@/lib/generate-itinerary";
import { supabase } from "@/lib/supabase-server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // 1. 認証確認
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // 2. 入力検証
  const body = await req.json();
  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // 3. AI生成（失敗時はログを残して422）
  let generationResult;
  try {
    generationResult = await generateItinerary(input);
  } catch (e) {
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      input,
      status: "failed",
    });
    return NextResponse.json(
      { error: `AI生成失敗: ${String(e)}` },
      { status: 422 }
    );
  }

  const { itinerary, latencyMs, tokenIn, tokenOut } = generationResult;

  // 4. DBに保存（trips → trip_days → trip_spots）
  // 途中で失敗した場合はtripsごと削除するフォールバック
  let tripId: string | null = null;
  try {
    // trips
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        owner_id: user.id,
        title: itinerary.title,
        destination: input.destination,
        start_date: input.startDate ?? null,
        nights: input.nights,
        party_size: input.partySize,
        budget_jpy: input.budgetJpy ?? null,
        purposes: input.purposes,
        free_memo: input.freeMemo ?? null,
      })
      .select("id")
      .single();

    if (tripError || !trip) throw new Error(`trips: ${tripError?.message}`);
    tripId = trip.id;

    // trip_days
    const daysToInsert = itinerary.days.map((d) => ({
      trip_id: tripId,
      day_index: d.dayIndex,
      title: d.title,
      date:
        input.startDate
          ? new Date(
              new Date(input.startDate).getTime() +
                (d.dayIndex - 1) * 86400000
            )
              .toISOString()
              .split("T")[0]
          : null,
    }));

    const { data: days, error: daysError } = await supabase
      .from("trip_days")
      .insert(daysToInsert)
      .select("id, day_index");

    if (daysError || !days) throw new Error(`trip_days: ${daysError?.message}`);

    // trip_spots
    const spotsToInsert = itinerary.days.flatMap((d) => {
      const day = days.find((row) => row.day_index === d.dayIndex);
      if (!day) return [];
      return d.spots.map((s, i) => ({
        trip_day_id: day.id,
        sort_order: i,
        start_time: s.startTime,
        name: s.name,
        category: s.category,
        memo: s.memo,
        lat: s.lat,
        lng: s.lng,
        move_to_next: s.moveToNext,
      }));
    });

    const { error: spotsError } = await supabase
      .from("trip_spots")
      .insert(spotsToInsert);
    if (spotsError) throw new Error(`trip_spots: ${spotsError.message}`);

    // 5. ai_generationsにログ
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      trip_id: tripId,
      input,
      status: "success",
      latency_ms: latencyMs,
      token_in: tokenIn,
      token_out: tokenOut,
    });

    // 6. 保存したtripをネストして返す
    return NextResponse.json({
      id: tripId,
      title: itinerary.title,
      destination: input.destination,
      nights: input.nights,
      days: itinerary.days,
    });
  } catch (e) {
    // フォールバック: 中途半端なtripを削除
    if (tripId) {
      await supabase.from("trips").delete().eq("id", tripId);
    }
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      input,
      status: "failed",
    });
    return NextResponse.json(
      { error: `保存失敗: ${String(e)}` },
      { status: 500 }
    );
  }
}
