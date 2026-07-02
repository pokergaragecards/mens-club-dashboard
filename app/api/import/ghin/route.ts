import { NextResponse } from "next/server";
import { parseGhinExport } from "@/utils/ghinParser";
import { importGhinRounds } from "@/services/ghinImportService";

function playerNameFromFileName(fileName: string) {
  const base = fileName.replace(/\.(xlsx|xls|csv)$/i, "");
  const beforeScores = base.split("Scores_")[0];

  return beforeScores.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function getUploadedFiles(formData: FormData) {
  const files: File[] = [];

  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    }
  }

  return files;
}

async function processFile(file: File) {
  const playerName = playerNameFromFileName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseGhinExport(file.name, buffer);

  const importResult = await importGhinRounds({
    playerName,
    fileName: file.name,
    rounds: parsed.validRounds,
  });

  return {
    fileName: file.name,
    playerName,
    rowsFound: parsed.rowsFound,
    rowsImported: importResult.rowsImported,
    rowsExisting: importResult.rowsExisting,
    rowsInvalid: parsed.invalidRows.length,
    player: importResult.player,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = getUploadedFiles(formData);

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      try {
        results.push(await processFile(file));
      } catch (err) {
        results.push({
          fileName: file.name,
          playerName: playerNameFromFileName(file.name),
          rowsFound: 0,
          rowsImported: 0,
          rowsExisting: 0,
          rowsInvalid: 0,
          error: err instanceof Error ? err.message : "Import failed.",
        });
      }
    }

    return NextResponse.json({
      filesProcessed: results.length,
      totalRowsFound: results.reduce((sum, row) => sum + row.rowsFound, 0),
      totalRowsImported: results.reduce((sum, row) => sum + row.rowsImported, 0),
      totalRowsExisting: results.reduce((sum, row) => sum + row.rowsExisting, 0),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during bulk GHIN import.",
      },
      { status: 500 }
    );
  }
}