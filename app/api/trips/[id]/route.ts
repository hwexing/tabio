import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
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
  if (trip.owner_id !== user.id) return NextResponse.json({ error: "アクセス不可" }, { status: 403 });

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

  return NextResponse.json({ ...trip, days: daysWithSortedSpots });
}
