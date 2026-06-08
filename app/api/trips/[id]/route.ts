import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { verifyShareToken } from "@/lib/share-token";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await params;

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !trip) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const isOwner = trip.owner_id === user.id;
  let hasAccess = isOwner;

  if (!hasAccess) {
    const shareToken = req.nextUrl.searchParams.get("share");
    if (shareToken && (await verifyShareToken(shareToken, id))) {
      hasAccess = true;
      // viewerとして登録（以降はトークン不要）
      await supabase
        .from("trip_members")
        .upsert(
          { trip_id: id, user_id: user.id, role: "viewer" },
          { onConflict: "trip_id,user_id" }
        );
    }
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

  const { data: days, error: daysError } = await supabase
    .from("trip_days")
    .select(
      "id, day_index, title, date, trip_spots(id, sort_order, start_time, name, category, memo, lat, lng, move_to_next)"
    )
    .eq("trip_id", id)
    .order("day_index");

  if (daysError) return NextResponse.json({ error: daysError.message }, { status: 500 });

  const daysWithSortedSpots = (days ?? []).map((day) => ({
    ...day,
    trip_spots: ((day.trip_spots as unknown[]) ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    ),
  }));

  return NextResponse.json({ ...trip, days: daysWithSortedSpots, isOwner });
}
