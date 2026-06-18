import { jsPDF } from "jspdf";
import XLSXStyle from "xlsx-js-style";
import { Suggestion } from "./mockData";

export function downloadAwardLetterPDF(suggestion: Suggestion) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(20, 50, 90);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("AWARD LETTER", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text("Suggestion Scheme Award", pageWidth / 2, 22, { align: "center" });
  doc.setFontSize(8);
  doc.text(`${suggestion.type || "Cash The Flash"} Programme`, pageWidth / 2, 28, { align: "center" });

  // Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Date: ${suggestion.awardDate || "N/A"}`, pageWidth - 20, 45, { align: "right" });

  // Greeting
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Dear ${suggestion.employeeName || "Employee"},`, 20, 55);

  doc.setFontSize(10);
  const bodyText = "We are pleased to inform you that your suggestion has been recognized and awarded under the Suggestion Scheme. Your contribution towards continuous improvement is highly appreciated.";
  const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
  doc.text(splitBody, 20, 65);

  // Details Box
  const boxY = 85;
  doc.setDrawColor(20, 50, 90);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, boxY, pageWidth - 40, 70, 3, 3);
  
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(20, boxY, pageWidth - 40, 12, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(20, 50, 90);
  doc.text("Award Details", pageWidth / 2, boxY + 8, { align: "center" });

  const details = [
    ["Employee Name", suggestion.employeeName || "N/A"],
    ["Employee No", suggestion.employeeNo || "N/A"],
    ["Suggestion No", suggestion.suggestionNo],
    ["Suggestion Title", suggestion.subject],
    ["Award Category", suggestion.awardCategory || "N/A"],
    ["Award Amount", `Rs. ${suggestion.awardAmount?.toLocaleString() || "0"}`],
  ];

  doc.setFontSize(9);
  let detailY = boxY + 20;
  details.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, 28, detailY);
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), 80, detailY);
    detailY += 8;
  });

  // Encouragement
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("We encourage you to keep submitting innovative ideas.", 20, 175);

  // Signature
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text("Regards,", 20, 195);
  doc.text("Suggestion Scheme Committee", 20, 201);
  
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(pageWidth - 80, 210, pageWidth - 20, 210);
  doc.setFontSize(8);
  doc.text("Authority Signature", pageWidth - 50, 216, { align: "center" });

  // Footer
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 270, pageWidth, 27, "F");
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text("This is a system-generated document", pageWidth / 2, 278, { align: "center" });
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 283, { align: "center" });

  doc.save(`Award_Letter_${suggestion.suggestionNo}.pdf`);
}

export function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data as XLSX with bold headings and a "Filters Applied" section at the top.
 * @param title      Report title shown in the first row
 * @param headers    Column headers
 * @param rows       Data rows
 * @param filename   Output .xlsx filename
 * @param filters    Key-value pairs of active filters shown before the data table
 */
export function downloadXLSX(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string,
  filters?: Record<string, string>,
) {
  // ── Style definitions ──────────────────────────────────────────────────────
  const TITLE_STYLE = {
    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1E3A5F" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const FILTER_SECTION_STYLE = {
    font: { bold: true, sz: 10, color: { rgb: "1E3A5F" } },
    fill: { fgColor: { rgb: "DCE6F1" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const FILTER_KEY_STYLE = {
    font: { bold: true, sz: 9, color: { rgb: "333333" } },
    fill: { fgColor: { rgb: "F4F8FF" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const FILTER_VALUE_STYLE = {
    font: { sz: 9, color: { rgb: "333333" } },
    fill: { fgColor: { rgb: "F4F8FF" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const HEADER_STYLE = {
    font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "2E5090" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top:    { style: "thin", color: { rgb: "AAAAAA" } },
      bottom: { style: "thin", color: { rgb: "AAAAAA" } },
      left:   { style: "thin", color: { rgb: "AAAAAA" } },
      right:  { style: "thin", color: { rgb: "AAAAAA" } },
    },
  };

  const DATA_STYLE_EVEN = {
    font: { sz: 9 },
    fill: { fgColor: { rgb: "FFFFFF" } },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border: {
      top:    { style: "thin", color: { rgb: "DDDDDD" } },
      bottom: { style: "thin", color: { rgb: "DDDDDD" } },
      left:   { style: "thin", color: { rgb: "DDDDDD" } },
      right:  { style: "thin", color: { rgb: "DDDDDD" } },
    },
  };

  const DATA_STYLE_ODD = {
    ...DATA_STYLE_EVEN,
    fill: { fgColor: { rgb: "EEF3FA" } },
  };

  // ── Build worksheet cell-by-cell ──────────────────────────────────────────
  const wb = XLSXStyle.utils.book_new();
  // We'll track current row index
  let rowIdx = 0;
  const ws: Record<string, unknown> = {};
  const setCell = (r: number, c: number, v: string, s?: object) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    ws[addr] = { v, t: "s", s };
  };

  // ── Row 0: Title spanning all columns ──
  setCell(rowIdx, 0, title, TITLE_STYLE);
  // Fill remaining columns with same style for visual span
  for (let c = 1; c < headers.length; c++) setCell(rowIdx, c, "", TITLE_STYLE);
  rowIdx++;

  // ── Row 1: blank ──
  rowIdx++;

  // ── Filters section ──
  const activeFilters = filters
    ? Object.entries(filters).filter(([, v]) => v)
    : [];

  if (activeFilters.length > 0) {
    setCell(rowIdx, 0, "Filters Applied", FILTER_SECTION_STYLE);
    for (let c = 1; c < headers.length; c++) setCell(rowIdx, c, "", FILTER_SECTION_STYLE);
    rowIdx++;

    for (const [key, value] of activeFilters) {
      setCell(rowIdx, 0, key, FILTER_KEY_STYLE);
      setCell(rowIdx, 1, value, FILTER_VALUE_STYLE);
      for (let c = 2; c < headers.length; c++) setCell(rowIdx, c, "", FILTER_VALUE_STYLE);
      rowIdx++;
    }

    // blank spacer after filters
    rowIdx++;
  }

  // ── Column headers ──
  const headerRowIdx = rowIdx;
  headers.forEach((h, c) => setCell(rowIdx, c, h, HEADER_STYLE));
  rowIdx++;

  // ── Data rows ──
  rows.forEach((row, ri) => {
    const style = ri % 2 === 0 ? DATA_STYLE_EVEN : DATA_STYLE_ODD;
    headers.forEach((_, c) => {
      setCell(rowIdx, c, row[c] ?? "", style);
    });
    rowIdx++;
  });

  // ── Sheet range ──
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: rowIdx - 1, c: headers.length - 1 },
  );

  // ── Merge title row across all columns ──
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    ...(activeFilters.length > 0
      ? [{ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }]  // "Filters Applied" label
      : []),
  ];

  // ── Row heights ──
  const rowHeights: { hpt: number }[] = [];
  for (let i = 0; i < rowIdx; i++) {
    if (i === 0) rowHeights.push({ hpt: 24 });           // title
    else if (i === headerRowIdx) rowHeights.push({ hpt: 20 }); // header
    else rowHeights.push({ hpt: 16 });
  }
  ws["!rows"] = rowHeights;

  // ── Column widths ──
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    rows.forEach(r => { if (r[i] && r[i].length > max) max = r[i].length; });
    return { wch: Math.min(max + 2, 45) };
  });
  ws["!cols"] = colWidths;

  XLSXStyle.utils.book_append_sheet(wb, ws as XLSXStyle.WorkSheet, "Report");
  XLSXStyle.writeFile(wb, filename);
}

export function downloadTablePDF(title: string, headers: string[], rows: string[][], filename: string) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(20, 50, 90);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 13, { align: "center" });

  // Meta
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length}`, 14, 28);

  // Table
  const startY = 34;
  const colWidth = (pageWidth - 28) / headers.length;
  const rowHeight = 8;

  // Header row
  doc.setFillColor(240, 245, 255);
  doc.rect(14, startY, pageWidth - 28, rowHeight, "F");
  doc.setFontSize(7);
  doc.setTextColor(20, 50, 90);
  headers.forEach((h, i) => {
    doc.text(h, 16 + i * colWidth, startY + 5.5);
  });

  // Data rows
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  let currentY = startY + rowHeight;

  rows.forEach((row, rIdx) => {
    if (currentY > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      currentY = 20;
      // Re-draw header on new page
      doc.setFillColor(240, 245, 255);
      doc.rect(14, currentY, pageWidth - 28, rowHeight, "F");
      doc.setTextColor(20, 50, 90);
      headers.forEach((h, i) => {
        doc.text(h, 16 + i * colWidth, currentY + 5.5);
      });
      doc.setTextColor(0, 0, 0);
      currentY += rowHeight;
    }

    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, currentY, pageWidth - 28, rowHeight, "F");
    }

    row.forEach((cell, i) => {
      const truncated = String(cell).substring(0, Math.floor(colWidth / 2));
      doc.text(truncated, 16 + i * colWidth, currentY + 5.5);
    });

    // Row line
    doc.setDrawColor(230, 230, 230);
    doc.line(14, currentY + rowHeight, pageWidth - 14, currentY + rowHeight);
    currentY += rowHeight;
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text("System-generated report", pageWidth / 2, footerY, { align: "center" });

  doc.save(filename);
}

// Keep backward compatibility
export function downloadPDFText(title: string, headers: string[], rows: string[][], filename: string) {
  downloadTablePDF(title, headers, rows, filename.replace(".txt", ".pdf"));
}
