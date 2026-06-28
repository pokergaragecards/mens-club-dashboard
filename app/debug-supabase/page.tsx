import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function DebugSupabasePage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("players")
    .select("id")
    .limit(1);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return (
    <pre className="p-8 whitespace-pre-wrap">
      Service key starts with: {serviceKey.substring(0, 25)}
      {"\n"}
      Service key length: {serviceKey.length}
      {"\n"}
      Query error: {error ? error.message : "none"}
      {"\n"}
      Data: {JSON.stringify(data)}
    </pre>
  );
}