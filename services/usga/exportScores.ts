import type { Page } from "playwright";
import {
  getCurrentExcelFileNames,
  waitForNewExcelDownload,
} from "@/services/usga/downloadWatcher";

export async function exportScoresExcel(params: {
  page: Page;
  scoreMaintenanceUrl: string;
}) {
  const beforeFiles = await getCurrentExcelFileNames();

  await params.page.goto(params.scoreMaintenanceUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await params.page.waitForLoadState("networkidle", { timeout: 60000 });

  const exportButton = params.page.locator("button.btn.fill.green", {
    hasText: "Export to Excel",
  });

  await exportButton.waitFor({ state: "visible", timeout: 30000 });
  await exportButton.click();

  const downloadedFile = await waitForNewExcelDownload({
    beforeFiles,
    timeoutMs: 60000,
  });

  return downloadedFile;
}