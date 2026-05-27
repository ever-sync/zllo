import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/cliente/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) redirect("/admin");

  const { data: profile } = await supabase.rpc("get_my_profile");
  redirect(profile?.role === "assistencia" ? "/operacao" : "/cliente");
}
