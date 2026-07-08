import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type ImportJobStatus = "pending" | "running" | "processing" | "complete" | "failed";

export type ImportJobResult = {
  parsedRows?: unknown[];
  summary?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function createImportJob(params: {
  importType: string;
  fileName: string;
  rowsTotal?: number;
  result?: ImportJobResult;
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
      rows_total: params.rowsTotal ?? 0,
      rows_processed: 0,
      result: params.result ?? {},
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .limit(1);

  if (error) throw error;

  const job = data?.[0];

  if (!job) {
    throw new Error("Import job insert returned no rows.");
  }

  return job.id as string;
}

export async function getImportJob(jobId: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .limit(1);

  if (error) throw error;

  return data?.[0] ?? null;
}

export async function updateImportJob(
  jobId: string | null | undefined,
  updates: {
    status?: ImportJobStatus;
    progress?: number;
    stage?: string;
    rowsTotal?: number;
    rowsProcessed?: number;
    result?: ImportJobResult;
    error?: string | null;
  }
) {
  if (!jobId) return;

  const supabase = createSupabaseServerClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.progress !== undefined) payload.progress = updates.progress;
  if (updates.stage !== undefined) payload.stage = updates.stage;
  if (updates.rowsTotal !== undefined) payload.rows_total = updates.rowsTotal;
  if (updates.rowsProcessed !== undefined)
    payload.rows_processed = updates.rowsProcessed;
  if (updates.result !== undefined) payload.result = updates.result;
  if (updates.error !== undefined) payload.error = updates.error;

  const { error } = await supabase
    .from("import_jobs")
    .update(payload)
    .eq("id", jobId);

  if (error) throw error;
}

export async function markImportJobFailed(
  jobId: string | null | undefined,
  message: string
) {
  if (!jobId) return;

  await updateImportJob(jobId, {
    status: "failed",
    progress: 100,
    stage: "Import failed",
    error: message,
  });
}