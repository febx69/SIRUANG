// src/lib/excelExportWithImages.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { CleanlinessReport, CleanlinessComplaint } from "@/hooks/useCleanliness";

/**
 * Mengubah URL gambar atau DataURL ke format base64 murni tanpa prefix
 */
async function getBase64FromUrl(url: string): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> {
  try {
    if (url.startsWith('data:image/')) {
      const match = url.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'png' ? 'png' : 'jpeg';
        return { base64: match[2], extension: ext };
      }
    }

    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    // Convert arrayBuffer to base64
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const extension = blob.type === 'image/png' ? 'png' : 'jpeg';
    return { base64, extension };
  } catch (err) {
    console.warn("Gagal mengunduh gambar untuk disematkan di Excel:", url, err);
    return null;
  }
}

/**
 * Ekspor laporan monev kebersihan dan pengaduan ke format Excel dengan foto disematkan langsung di dalam sel.
 */
export async function exportCleanlinessToExcel(
  reports: CleanlinessReport[],
  complaints: CleanlinessComplaint[],
  periodLabel: string,
  onProgress?: (text: string) => void
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIRUANG - Dinkes Pamekasan";
  workbook.created = new Date();

  // -------------------------------------------------------------
  // SHEET 1: LAPORAN HARIAN OB
  // -------------------------------------------------------------
  onProgress?.("Menyiapkan Sheet Laporan Harian...");
  const sheet1 = workbook.addWorksheet("Laporan Harian OB", {
    views: [{ showGridLines: true }]
  });

  // Header judul
  sheet1.mergeCells("A1:G1");
  const titleCell1 = sheet1.getCell("A1");
  titleCell1.value = `REKAP LAPORAN HARIAN MONEV KEBERSIHAN (${periodLabel.toUpperCase()})`;
  titleCell1.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell1.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(1).height = 32;

  sheet1.mergeCells("A2:G2");
  const subTitleCell1 = sheet1.getCell("A2");
  subTitleCell1.value = "Dinas Kesehatan Kabupaten Pamekasan";
  subTitleCell1.font = { italic: true, size: 11, color: { argb: "FF475569" } };
  subTitleCell1.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(2).height = 20;

  // Header Kolom
  const headers1 = [
    { header: "No", key: "no", width: 6 },
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Waktu", key: "time", width: 10 },
    { header: "Petugas OB", key: "inspector", width: 22 },
    { header: "Lantai", key: "floor", width: 15 },
    { header: "Keterangan Kondisi", key: "description", width: 35 },
    { header: "Dokumentasi Foto", key: "photos", width: 45 },
  ];

  sheet1.getRow(4).values = headers1.map(h => h.header);
  sheet1.getRow(4).height = 26;
  sheet1.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet1.getRow(4).alignment = { horizontal: "center", vertical: "middle" };

  // Set column widths
  headers1.forEach((h, idx) => {
    sheet1.getColumn(idx + 1).width = h.width;
    sheet1.getCell(4, idx + 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D9488" } // Emerald / Teal
    };
    sheet1.getCell(4, idx + 1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  // Isi data laporan harian
  let currentRow = 5;
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    onProgress?.(`Memproses foto laporan ${i + 1} dari ${reports.length}...`);

    const row = sheet1.getRow(currentRow);
    row.values = [
      i + 1,
      r.date,
      r.time,
      r.inspector_name,
      r.floor,
      r.description || "-",
      "" // kolom foto akan diisi image
    ];
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = r.photos && r.photos.length > 0 ? 80 : 30;

    // Apply borders
    for (let c = 1; c <= 7; c++) {
      sheet1.getCell(currentRow, c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    // Embed photos
    if (r.photos && r.photos.length > 0) {
      for (let pIdx = 0; pIdx < Math.min(r.photos.length, 3); pIdx++) {
        const photoUrl = r.photos[pIdx];
        const imgData = await getBase64FromUrl(photoUrl);
        if (imgData) {
          const imageId = workbook.addImage({
            base64: imgData.base64,
            extension: imgData.extension,
          });

          sheet1.addImage(imageId, {
            tl: { col: 6 + pIdx * 0.45, row: currentRow - 1 + 0.1 },
            ext: { width: 90, height: 68 }
          });
        }
      }
    }

    currentRow++;
  }

  // -------------------------------------------------------------
  // SHEET 2: PENGADUAN KEBERSIHAN
  // -------------------------------------------------------------
  onProgress?.("Menyiapkan Sheet Pengaduan Kebersihan...");
  const sheet2 = workbook.addWorksheet("Pengaduan Kebersihan", {
    views: [{ showGridLines: true }]
  });

  sheet2.mergeCells("A1:I1");
  const titleCell2 = sheet2.getCell("A1");
  titleCell2.value = `REKAP PENGADUAN KEBERSIHAN PEGAWAI (${periodLabel.toUpperCase()})`;
  titleCell2.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell2.alignment = { horizontal: "center", vertical: "middle" };
  sheet2.getRow(1).height = 32;

  sheet2.mergeCells("A2:I2");
  const subTitleCell2 = sheet2.getCell("A2");
  subTitleCell2.value = "Dinas Kesehatan Kabupaten Pamekasan";
  subTitleCell2.font = { italic: true, size: 11, color: { argb: "FF475569" } };
  subTitleCell2.alignment = { horizontal: "center", vertical: "middle" };
  sheet2.getRow(2).height = 20;

  const headers2 = [
    { header: "No", width: 6 },
    { header: "Tanggal", width: 14 },
    { header: "Pelapor", width: 20 },
    { header: "Bidang / Seksi", width: 22 },
    { header: "Lantai", width: 14 },
    { header: "Keterangan Keluhan", width: 35 },
    { header: "Status", width: 16 },
    { header: "Foto Aduan", width: 30 },
    { header: "Catatan Penanganan", width: 30 },
  ];

  sheet2.getRow(4).values = headers2.map(h => h.header);
  sheet2.getRow(4).height = 26;
  sheet2.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet2.getRow(4).alignment = { horizontal: "center", vertical: "middle" };

  headers2.forEach((h, idx) => {
    sheet2.getColumn(idx + 1).width = h.width;
    sheet2.getCell(4, idx + 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" } // Royal Blue
    };
    sheet2.getCell(4, idx + 1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  let currentCompRow = 5;
  for (let j = 0; j < complaints.length; j++) {
    const c = complaints[j];
    onProgress?.(`Memproses foto aduan ${j + 1} dari ${complaints.length}...`);

    const statusLabel =
      c.status === 'resolved' ? 'SELESAI' :
      c.status === 'in_progress' ? 'SEDANG DIKERJAKAN' : 'MENUNGGU';

    const row = sheet2.getRow(currentCompRow);
    row.values = [
      j + 1,
      `${c.date} ${c.time}`,
      c.reporter_name,
      c.bidang,
      c.floor,
      c.description,
      statusLabel,
      "", // foto aduan
      c.handler_notes ? `${c.handler_notes} (Oleh: ${c.handler_name || 'Petugas'})` : "-"
    ];
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = c.photos && c.photos.length > 0 ? 80 : 30;

    for (let col = 1; col <= 9; col++) {
      sheet2.getCell(currentCompRow, col).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    // Embed complaint photo
    if (c.photos && c.photos.length > 0) {
      const photoUrl = c.photos[0];
      const imgData = await getBase64FromUrl(photoUrl);
      if (imgData) {
        const imageId = workbook.addImage({
          base64: imgData.base64,
          extension: imgData.extension,
        });

        sheet2.addImage(imageId, {
          tl: { col: 7.1, row: currentCompRow - 1 + 0.1 },
          ext: { width: 90, height: 68 }
        });
      }
    }

    currentCompRow++;
  }

  onProgress?.("Mengemas file Excel...");
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const filename = `Monev_Kebersihan_Dinkes_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
  saveAs(blob, filename);
}
