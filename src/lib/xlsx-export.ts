import type { PieSegment } from "@/components/chat/pie-chart";
import { pieChartSvgMarkup } from "@/components/chat/pie-chart";

const ROW_PX = 20;

function svgToPngDataUrl(markup: string, width: number, height: number, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize chart SVG"));
    };
    img.src = url;
  });
}

/**
 * Builds an .xlsx workbook — a "Data" sheet with the raw rows, plus a
 * "Charts" sheet with the same pie charts shown on screen, rasterized to PNG
 * and embedded as images (no charting library; exceljs only packages the
 * workbook/sheet/image structure) — and triggers a browser download.
 */
export async function downloadReportXlsx(opts: {
  filename: string;
  title: string;
  rangeLabel: string;
  csvRows: string[][];
  charts: { title: string; segments: PieSegment[] }[];
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Foreman";
  workbook.created = new Date();

  const dataSheet = workbook.addWorksheet("Data");
  dataSheet.addRows(opts.csvRows);
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.columns.forEach((col) => {
    col.width = 18;
  });

  const chartSheet = workbook.addWorksheet("Charts");
  chartSheet.getCell("A1").value = `${opts.title} — ${opts.rangeLabel}`;
  chartSheet.getCell("A1").font = { bold: true, size: 14 };

  let rowCursor = 2;
  for (const chart of opts.charts) {
    const { markup, width, height } = pieChartSvgMarkup(chart.title, chart.segments);
    const dataUrl = await svgToPngDataUrl(markup, width, height);
    const imageId = workbook.addImage({ base64: dataUrl, extension: "png" });
    chartSheet.addImage(imageId, { tl: { col: 0, row: rowCursor }, ext: { width, height } });
    rowCursor += Math.ceil(height / ROW_PX) + 1;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  a.click();
  URL.revokeObjectURL(url);
}
