import fs from "fs/promises";
import path from "path";

export const USGA_DOWNLOAD_DIR = "C:\\Users\\marcu\\USGA-Downloads";

function isUsgaScoreFile(fileName: string) {
  return /Scores_\d{8}_.+\.xlsx$/i.test(fileName);
}

async function listScoreFiles() {
  await fs.mkdir(USGA_DOWNLOAD_DIR, { recursive: true });

  const files = await fs.readdir(USGA_DOWNLOAD_DIR);
  const scoreFiles = [];

  for (const file of files) {
    if (!isUsgaScoreFile(file)) continue;

    const filePath = path.join(USGA_DOWNLOAD_DIR, file);
    const stat = await fs.stat(filePath);

    scoreFiles.push({
      file,
      filePath,
      modifiedMs: stat.mtimeMs,
      size: stat.size,
    });
  }

  return scoreFiles;
}

export async function getCurrentExcelFileNames() {
  const files = await listScoreFiles();
  return files.map((file) => file.file);
}

export async function waitForNewExcelDownload(params: {
  beforeFiles: string[];
  timeoutMs?: number;
}) {
  const timeoutMs = params.timeoutMs ?? 60000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const files = await listScoreFiles();

    const newFiles = files
      .filter((file) => !params.beforeFiles.includes(file.file))
      .sort((a, b) => b.modifiedMs - a.modifiedMs);

    if (newFiles.length > 0 && newFiles[0].size > 0) {
      return newFiles[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for USGA score Excel download.");
}