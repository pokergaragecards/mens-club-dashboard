import {
  estimateTeamEvent,
  TeamEventRequestError,
} from "@/services/teamEventEstimatorService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const result = await estimateTeamEvent(await request.json());
    return Response.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to estimate this event.";
    return Response.json(
      { error: message },
      { status: error instanceof TeamEventRequestError ? 400 : 500 }
    );
  }
}
