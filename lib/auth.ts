import "server-only";
import { verifySession } from "./session";
import { supabase } from "./supabase-server";

export type CurrentUser = {
  id: string;
  display_name: string | null;
  picture_url: string | null;
  plan: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await verifySession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, picture_url, plan")
    .eq("id", session.userId)
    .single();

  if (error || !data) return null;
  return data as CurrentUser;
}
