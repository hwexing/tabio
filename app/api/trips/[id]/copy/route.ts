import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { verifyShareToken } from "@/lib/share-token";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { data: origTrip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!origTrip) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  // アクセス確認
  let hasAccess = origTrip.owner_id === user.id;

  if (!hasAccess && body.shareToken) {
    hasAccess = await verifyShareToken(body.shareToken, id);
  }
  if (!hasAccess) {
    const { data: membership } = await supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", id)
      .eq("user_id", user.id)
      .single();
    hasAccess = !!membership;
  }

  if (!hasAccess) return NextResponse.json({ error: "アクセス不可" }, { status: 403 });

  // ── コピー開始 ──
  const { data: newTrip, error: tripErr } = await supabase
    .from("trips")
    .insert({
      owner_id: user.id,
      title: origTrip.title,
      destination: origTrip.destination,
      start_date: origTrip.start_date,
      nights: origTrip.nights,
      party_size: origTrip.party_size,
      budget_jpy: origTrip.budget_jpy,
      purposes: origTrip.purposes,
      free_memo: origTrip.free_memo,
      source_trip_id: id,
    })
    .select("id")
    .single();

  if (tripErr || !newTrip)
    return NextResponse.json({ error: "コピー失敗" }, { status: 500 });

  const newTripId = newTrip.id;

  try {
    // trip_days
    const { data: origDays } = await supabase
      .from("trip_days")
      .select("*")
      .eq("trip_id", id)
      .order("day_index");

    if (origDays && origDays.length > 0) {
      const { data: newDays, error: daysErr } = await supabase
        .from("trip_days")
        .insert(
          origDays.map((d) => ({
            trip_id: newTripId,
            day_index: d.day_index,
            title: d.title,
            date: d.date,
          }))
        )
        .select("id, day_index");

      if (daysErr || !newDays) throw new Error("days copy failed");

      // trip_spots
      const allSpots = [];
      for (const origDay of origDays) {
        const newDay = newDays.find((d) => d.day_index === origDay.day_index);
        if (!newDay) continue;
        const { data: spots } = await supabase
          .from("trip_spots")
          .select("*")
          .eq("trip_day_id", origDay.id)
          .order("sort_order");
        if (spots) {
          allSpots.push(
            ...spots.map((s) => ({
              trip_day_id: newDay.id,
              sort_order: s.sort_order,
              start_time: s.start_time,
              name: s.name,
              category: s.category,
              memo: s.memo,
              lat: s.lat,
              lng: s.lng,
              move_to_next: s.move_to_next,
            }))
          );
        }
      }
      if (allSpots.length > 0) {
        const { error: spotsErr } = await supabase.from("trip_spots").insert(allSpots);
        if (spotsErr) throw new Error("spots copy failed");
      }
    }

    // shopping_items（チェックはリセット）
    const { data: origItems } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("trip_id", id);
    if (origItems && origItems.length > 0) {
      const { error: itemsErr } = await supabase.from("shopping_items").insert(
        origItems.map((item) => ({
          trip_id: newTripId,
          created_by: user.id,
          name: item.name,
          category: item.category,
          is_done: false,
          sort_order: item.sort_order,
        }))
      );
      if (itemsErr) throw new Error("shopping copy failed");
    }

    return NextResponse.json({ id: newTripId }, { status: 201 });
  } catch (e) {
    await supabase.from("trips").delete().eq("id", newTripId);
    return NextResponse.json({ error: `コピー失敗: ${String(e)}` }, { status: 500 });
  }
}
