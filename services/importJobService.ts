import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function createImportJob(params: {
  importType: string;
  fileName: string;
}) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      import_type: params.importType,
      file_name: params.fileName,
      status: "running",
      progress: 1,
      stage: "Starting import",
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id as string;
}

export async function updateImportJob(
  jobId: string | null | undefined,
  updates: {
    status?: string;
    progress?: number;
    stage?: string;
    rowsTotal?: number;
    rowsProcessed?: number;
    result?: unknown;
    error?: string;
  }
) {
  if (!jobId) return;

  const supabase = createSupabaseServerClient();

  await supabase
    .from("import_jobs")
    .update({
      status: updates.status,
      progress: updates.progress,
      stage: updates.stage,
      rows_total: updates.rowsTotal,
      rows_processed: updates.rowsProcessed,
      result: updates.result,
      error: updates.error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}