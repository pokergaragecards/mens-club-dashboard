export default function TestPage() {
  return (
    <pre>
      URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
      {"\n"}
      Has Anon: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Yes" : "No"}
      {"\n"}
      Has Service Role: {process.env.SUPABASE_SERVICE_ROLE_KEY ? "Yes" : "No"}
    </pre>
  );
}