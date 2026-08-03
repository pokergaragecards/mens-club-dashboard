import { NextResponse } from "next/server";
import { getImportJob } from "@/services/importJobService";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const job = await getImportJob(id);

    if (!job) {
      return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load import job.",
      },
      { status: 500 }
    );
  }
}
