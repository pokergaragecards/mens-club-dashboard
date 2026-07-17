import React from "react";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import { AuditBook } from "@/components/pdf/AuditBook";
import { getAuditReport } from "@/lib/auditReportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const report = await getAuditReport();

    const document = React.createElement(AuditBook, {
      report,
    }) as unknown as React.ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(document);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="goodrich-audit-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Audit PDF export failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate the audit PDF.",
      },
      { status: 500 }
    );
  }
}
