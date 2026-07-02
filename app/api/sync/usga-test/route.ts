import { NextResponse } from "next/server";
import { connectToExistingChrome } from "@/services/usga/browser";

export async function POST() {
  try {
    const session = await connectToExistingChrome();

    await session.page.goto("https://adminportal.usga.org/", {
      waitUntil: "domcontentloaded",
    });

    return NextResponse.json({
      success: true,
      message: "Connected to existing Chrome.",
      currentUrl: session.page.url(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown Chrome connection error.",
      },
      { status: 500 }
    );
  }
}