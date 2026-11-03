// src/lib/pdfCleanlinessReport.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CleanlinessReport, CleanlinessComplaint } from "@/hooks/useCleanliness";

export interface CleanlinessReportSummary {
  year: number;
  month: number;
  monthLabel: string;
  totalWorkingDays: number;
  expectedSubmissions: number; // workingDays * 3 floors
  actualSubmissions: number;
  complianceRate: number;
  missedReports: {
    date: string;
    dayName: string;
    missingFloors: string[];
  }[];
  floorCounts: { [floor: string]: number };
  totalComplaints: number;
  resolvedComplaints: number;
  inProgressComplaints: number;
  pendingComplaints: number;
  reportedDaysCount: number; // Jumlah hari kerja yang minimal ada 1 laporan
  fullyCompliantDaysCount: number; // Jumlah hari kerja yang seluruh 3 lantai lengkap lapor
}

/**
 * Menghitung analisis kepatuhan harian dan status pengaduan
 */
export function calculateCleanlinessSummary(
  reports: CleanlinessReport[],
  complaints: CleanlinessComplaint[],
  year: number,
  month: number,
  monthLabel: string
): CleanlinessReportSummary {
  const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
  const periodReports = reports.filter(r => r.date.startsWith(monthPrefix));
  const periodComplaints = complaints.filter(c => c.date.startsWith(monthPrefix));

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const maxDay = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

  const missedReports: { date: string; dayName: string; missingFloors: string[] }[] = [];
  let workingDaysCount = 0;
  const reportedDatesSet = new Set<string>();

  for (let d = 1; d <= maxDay; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu

    // Hari kerja dinas Senin - Jumat (5 hari kerja)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    workingDaysCount++;

    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const dayReports = periodReports.filter(r => r.date === dateStr);
    if (dayReports.length > 0) {
      reportedDatesSet.add(dateStr);
    }
    const reportedFloors = new Set(dayReports.map(r => r.floor));

    const missingFloors = ["Lantai 1", "Lantai 2", "Lantai 3"].filter(f => !reportedFloors.has(f));
    if (missingFloors.length > 0) {
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      missedReports.push({ date: dateStr, dayName, missingFloors });
    }
  }

  const expectedSubmissions = workingDaysCount * 3;
  const actualSubmissions = periodReports.length;
  const complianceRate = expectedSubmissions > 0
    ? Math.min(100, Math.round((actualSubmissions / expectedSubmissions) * 100))
    : 100;

  const floorCounts: { [floor: string]: number } = {
    "Lantai 1": periodReports.filter(r => r.floor === "Lantai 1").length,
    "Lantai 2": periodReports.filter(r => r.floor === "Lantai 2").length,
    "Lantai 3": periodReports.filter(r => r.floor === "Lantai 3").length,
  };

  const resolvedComplaints = periodComplaints.filter(c => c.status === 'resolved').length;
  const inProgressComplaints = periodComplaints.filter(c => c.status === 'in_progress').length;
  const pendingComplaints = periodComplaints.filter(c => c.status === 'pending').length;

  return {
    year,
    month,
    monthLabel,
    totalWorkingDays: workingDaysCount,
    expectedSubmissions,
    actualSubmissions,
    complianceRate,
    missedReports,
    floorCounts,
    totalComplaints: periodComplaints.length,
    resolvedComplaints,
    inProgressComplaints,
    pendingComplaints,
    reportedDaysCount: reportedDatesSet.size,
    fullyCompliantDaysCount: workingDaysCount - missedReports.length
  };
}

/**
 * Mengelompokkan hari-hari yang tidak melapor agar tabel tidak terlalu panjang
 */
export function groupConsecutiveMissedDates(missed: { date: string; dayName: string; missingFloors: string[] }[]) {
  if (missed.length <= 6) {
    return missed.map((m, idx) => ({
      no: idx + 1,
      period: `${m.date} (${m.dayName})`,
      floors: m.missingFloors.join(", "),
      status: "TIDAK LAPOR",
      action: "Konfirmasi petugas lantai"
    }));
  }

  const groups: { startDate: string; endDate: string; startDay: string; endDay: string; count: number; floors: string }[] = [];
  let currentGroup: any = null;

  for (const m of missed) {
    const floorsStr = m.missingFloors.join(", ");
    if (!currentGroup) {
      currentGroup = { startDate: m.date, endDate: m.date, startDay: m.dayName, endDay: m.dayName, count: 1, floors: floorsStr };
    } else if (currentGroup.floors === floorsStr) {
      currentGroup.endDate = m.date;
      currentGroup.endDay = m.dayName;
      currentGroup.count++;
    } else {
      groups.push(currentGroup);
      currentGroup = { startDate: m.date, endDate: m.date, startDay: m.dayName, endDay: m.dayName, count: 1, floors: floorsStr };
    }
  }
  if (currentGroup) groups.push(currentGroup);

  return groups.map((g, idx) => ({
    no: idx + 1,
    period: g.count === 1
      ? `${g.startDate} (${g.startDay})`
      : `${g.startDate} s/d ${g.endDate} (${g.count} hari kerja)`,
    floors: g.floors,
    status: `TIDAK LAPOR (${g.count} HARI)`,
    action: "Evaluasi presensi & teguran berkala"
  }));
}

/**
 * Konversi URL gambar menjadi base64 JPEG terkompresi untuk dimasukkan ke PDF
 * Menggunakan fetch -> blob -> FileReader -> canvas untuk menghindari masalah CORS canvas
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  // Coba metode 1: fetch blob (paling aman & reliable)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const rawBase64 = reader.result as string;
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
              return;
            }
            resolve(rawBase64);
          };
          img.onerror = () => resolve(rawBase64);
          img.src = rawBase64;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Lanjut fallback ke metode 2 jika fetch blob gagal
  }

  // Metode 2: Direct Image tag
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
            return;
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generate dan unduh PDF resmi laporan Monev Kebersihan lengkap dengan lampiran foto
 */
export async function generateCleanlinessPdfReport(
  reports: CleanlinessReport[],
  complaints: CleanlinessComplaint[],
  year: number,
  month: number,
  monthLabel: string,
  onProgress?: (statusText: string) => void
): Promise<void> {
  onProgress?.("Menganalisis data & kepatuhan...");
  const summary = calculateCleanlinessSummary(reports, complaints, year, month, monthLabel);
  const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
  const periodReports = reports
    .filter(r => r.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const periodComplaints = complaints
    .filter(c => c.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 14;

  // ─── 1. KOP SURAT RESMI ───
  onProgress?.("Menyusun Kop Surat Resmi...");
  try {
    const logoData = await loadImageAsDataUrl("/logo-pamekasan.png");
    if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 11, 16, 20);
    }
  } catch {
    // Abaikan jika logo tidak ditemukan
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // Navy #1E3A8A
  doc.text("PEMERINTAH KABUPATEN PAMEKASAN", pageWidth / 2, currentY, { align: "center" });

  currentY += 6;
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("DINAS KESEHATAN", pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Jl. Jokotole No. 4, Barurambat Kota, Kec. Pamekasan, Kabupaten Pamekasan, Jawa Timur 69317", pageWidth / 2, currentY, { align: "center" });

  currentY += 4;
  doc.text("Telepon: (0324) 322444 | Email: dinkes@pamekasantkab.go.id | Website: dinkes.pamekasantkab.go.id", pageWidth / 2, currentY, { align: "center" });

  // Garis Kop Surat Ganda
  currentY += 4;
  doc.setLineWidth(1);
  doc.setDrawColor(30, 58, 138);
  doc.line(14, currentY, pageWidth - 14, currentY);
  doc.setLineWidth(0.3);
  doc.line(14, currentY + 1, pageWidth - 14, currentY + 1);

  // ─── 2. JUDUL LAPORAN ───
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("LAPORAN MONITORING DAN EVALUASI (MONEV) KEBERSIHAN GEDUNG", pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Periode: ${monthLabel} ${year} · Kantor Dinas Kesehatan Kabupaten Pamekasan`, pageWidth / 2, currentY, { align: "center" });

  // ─── 3. I. RINGKASAN EKSEKUTIF / DASHBOARD ───
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text("I. RINGKASAN CAPAIAN DAN INDIKATOR KEBERSIHAN", 14, currentY);

  currentY += 4;
  const f1 = summary.floorCounts["Lantai 1"] || 0;
  const f2 = summary.floorCounts["Lantai 2"] || 0;
  const f3 = summary.floorCounts["Lantai 3"] || 0;

  let floorStatusText = "Seluruh lantai aktif dilaporkan";
  if (f1 === 0 && f2 === 0 && f3 === 0) {
    floorStatusText = "Seluruh lantai nihil laporan";
  } else if (f1 > 0 && f2 === 0 && f3 === 0) {
    floorStatusText = "Lt 2 & 3 nihil (Perlu teguran)";
  } else if (f1 === 0 && f2 > 0 && f3 === 0) {
    floorStatusText = "Lt 1 & 3 nihil (Perlu teguran)";
  } else if (f1 === 0 && f2 === 0 && f3 > 0) {
    floorStatusText = "Lt 1 & 2 nihil (Perlu teguran)";
  } else if (f1 === 0 || f2 === 0 || f3 === 0) {
    const missingFloorNames: string[] = [];
    if (f1 === 0) missingFloorNames.push("Lt 1");
    if (f2 === 0) missingFloorNames.push("Lt 2");
    if (f3 === 0) missingFloorNames.push("Lt 3");
    floorStatusText = `${missingFloorNames.join(" & ")} nihil (Perlu teguran)`;
  }

  const emptyDaysCount = Math.max(0, summary.totalWorkingDays - summary.reportedDaysCount);
  const reportedDaysDesc = summary.reportedDaysCount === 0
    ? "0 Hari Terisi (Semua Kosong)"
    : `${summary.reportedDaysCount} Hari Ada Laporan (${emptyDaysCount} Hari Nihil)`;

  const dashboardData = [
    ["Indikator Evaluasi", "Target / Satuan", "Capaian Periode Ini", "Status & Evaluasi"],
    [
      "Kepatuhan Laporan Harian OB",
      `${summary.expectedSubmissions} Laporan`,
      `${summary.actualSubmissions} Laporan (${summary.complianceRate}%)`,
      summary.complianceRate >= 90 ? "Sangat Baik / Disiplin" : summary.complianceRate >= 75 ? "Cukup / Perlu Perhatian" : "Kurang / Perlu Teguran"
    ],
    [
      "Jumlah Hari Kerja Aktif",
      `${summary.totalWorkingDays} Hari Kerja`,
      reportedDaysDesc,
      summary.missedReports.length === 0
        ? "100% Terpantau Lengkap"
        : `${summary.missedReports.length} Hari Belum Lengkap (Ada Lantai Bolong)`
    ],
    [
      "Rekap Laporan per Lantai",
      "Lt 1 / Lt 2 / Lt 3",
      `Lt 1: ${f1} | Lt 2: ${f2} | Lt 3: ${f3}`,
      floorStatusText
    ],
    [
      "Pengaduan Kebersihan Masuk",
      "Target 0 Pengaduan",
      `${summary.totalComplaints} Pengaduan`,
      summary.totalComplaints === 0 ? "Nihil (Kondisi Bersih Optimal)" : `${summary.resolvedComplaints} Selesai, ${summary.pendingComplaints} Pending`
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [dashboardData[0]],
    body: dashboardData.slice(1),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 47 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ─── 4. II. SKEMA KEPATUHAN HARIAN & YANG TIDAK LAPOR ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text("II. EVALUASI KEPATUHAN HARIAN & DETEKSI PETUGAS TIDAK LAPOR", 14, currentY);

  currentY += 4;
  if (summary.missedReports.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61);
    doc.text("KESIMPULAN KEPATUHAN: 100% DISIPLIN LENGKAP (NIHIL KETERLAMBATAN)", 18, currentY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Seluruh lantai (Lantai 1, 2, dan 3) rutin dilaporkan setiap hari kerja tanpa ada tanggal yang terlewat. Petugas menjalankan tugas dengan tertib.", 18, currentY + 10);

    currentY += 19;
  } else {
    const alertTitle = `PERINGATAN: DITEMUKAN ${summary.missedReports.length} HARI KERJA DENGAN LAPORAN KOSONG / TIDAK LAPOR`;
    const alertDesc = "Petugas kebersihan pada lantai tertera tidak menyampaikan laporan dokumentasi pada tanggal berikut. Disarankan Kasubag Umum melakukan teguran atau konfirmasi kendala lapangan kepada petugas terkait.";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitDesc = doc.splitTextToSize(alertDesc, pageWidth - 36);
    const boxHeight = 12 + (splitDesc.length * 4);

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text(alertTitle, 18, currentY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(127, 29, 29);
    doc.text(splitDesc, 18, currentY + 9.5);

    currentY += boxHeight + 4;

    // Gunakan fungsi pengelompokan tanggal berurutan agar tabel rapi dan tidak memakan puluhan baris
    const groupedMissed = groupConsecutiveMissedDates(summary.missedReports);
    const missedTableHead = [["No", "Tanggal / Rentang Hari", "Lantai Yang Tidak Lapor", "Status", "Rekomendasi Tindakan"]];
    const missedTableBody = groupedMissed.map(item => [
      item.no,
      item.period,
      item.floors,
      item.status,
      item.action
    ]);

    autoTable(doc, {
      startY: currentY,
      head: missedTableHead,
      body: missedTableBody,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 48 },
        2: { cellWidth: 45, fontStyle: 'bold', textColor: [190, 18, 60] },
        3: { cellWidth: 35, fontStyle: 'bold' },
        4: { cellWidth: 44 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── 5. III. SKEMA EVALUASI PENGADUAN KEBERSIHAN PEGAWAI ───
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text("III. EVALUASI DAN TINDAK LANJUT PENGADUAN KEBERSIHAN", 14, currentY);

  currentY += 4;
  if (periodComplaints.length === 0) {
    const greenTitle = "KONDISI BERSIH OPTIMAL: NIHIL PENGADUAN KEBERSIHAN";
    const greenDesc = `Selama periode ${monthLabel} ${year}, tidak tercatat adanya pengaduan maupun komplain ketidakbersihan dari pegawai di seluruh lantai gedung kantor. Tingkat kebersihan terjaga dengan prima sesuai standar operasional kenyamanan kerja Dinas Kesehatan Kabupaten Pamekasan.`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitGreenDesc = doc.splitTextToSize(greenDesc, pageWidth - 36);
    const greenBoxHeight = 12 + (splitGreenDesc.length * 4.2);

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(14, currentY, pageWidth - 28, greenBoxHeight, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61);
    doc.text(greenTitle, 18, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(splitGreenDesc, 18, currentY + 10);

    currentY += greenBoxHeight + 6;
  } else {
    const amberTitle = `TERDAPAT ${periodComplaints.length} PENGADUAN DARI PEGAWAI (${summary.resolvedComplaints} Diselesaikan, ${summary.pendingComplaints} Menunggu)`;
    const amberDesc = "Rincian pengaduan pegawai dan dokumentasi tindak lanjut penyelesaian oleh petugas disajikan pada tabel di bawah ini:";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitAmberDesc = doc.splitTextToSize(amberDesc, pageWidth - 36);
    const amberBoxHeight = 12 + (splitAmberDesc.length * 4.2);

    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(14, currentY, pageWidth - 28, amberBoxHeight, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(amberTitle, 18, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.text(splitAmberDesc, 18, currentY + 10);

    currentY += amberBoxHeight + 6;

    const complaintTableHead = [["No", "Tanggal / Jam", "Pelapor & Bidang", "Lokasi", "Uraian Pengaduan", "Status", "Petugas & Solusi"]];
    const complaintTableBody = periodComplaints.map((c, idx) => [
      idx + 1,
      `${c.date}\n${c.time || ''}`,
      `${c.reporter_name}\n(${c.bidang})`,
      c.floor,
      c.description,
      c.status === 'resolved' ? 'SELESAI' : c.status === 'in_progress' ? 'PROSES' : 'MENUNGGU',
      c.handler_name ? `${c.handler_name}\n${c.handler_notes || '-'}` : (c.handler_notes || 'Belum ditindaklanjuti')
    ]);

    autoTable(doc, {
      startY: currentY,
      head: complaintTableHead,
      body: complaintTableBody,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [245, 158, 11], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 32 },
        3: { cellWidth: 20 },
        4: { cellWidth: 45 },
        5: { cellWidth: 20, fontStyle: 'bold' },
        6: { cellWidth: 35 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── 6. IV. KESIMPULAN & LEMBAR PENGESAHAN ───
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text("IV. KESIMPULAN DAN REKOMENDASI", 14, currentY);

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  let conclusionText = "";
  if (summary.missedReports.length === 0 && summary.totalComplaints === 0) {
    conclusionText = `Kinerja kebersihan kantor Dinas Kesehatan pada bulan ${monthLabel} ${year} BERPRESTASI SANGAT BAIK. Seluruh laporan harian tersampaikan 100% tepat waktu dan tidak ada komplain kebersihan dari pegawai. Disarankan memberikan apresiasi kerja kepada tim kebersihan.`;
  } else if (summary.missedReports.length > 0 && summary.totalComplaints === 0) {
    conclusionText = `Kondisi kebersihan gedung kantor terpelihara dengan baik tanpa keluhan pegawai, namun demikian terdapat ${summary.missedReports.length} tanggal laporan harian yang tidak diisi oleh petugas. Perlu penegakan disiplin pelaporan berkala.`;
  } else if (summary.missedReports.length === 0 && summary.totalComplaints > 0) {
    conclusionText = `Petugas kebersihan sangat rajin menyampaikan laporan harian (100%), namun terdapat ${summary.totalComplaints} pengaduan dari pegawai terkait titik-titik tertentu. Diharapkan pengawasan lebih difokuskan pada area yang sering diadukan.`;
  } else {
    conclusionText = `Perlu dilakukan evaluasi menyeluruh terhadap pengelolaan kebersihan gedung kantor, mengingat terdapat ${summary.missedReports.length} hari tanpa laporan harian dan ${summary.totalComplaints} keluhan pegawai yang masuk selama periode ini.`;
  }

  const splitConclusion = doc.splitTextToSize(conclusionText, pageWidth - 28);
  doc.text(splitConclusion, 14, currentY);
  currentY += (splitConclusion.length * 4) + 8;

  // LEMBAR PENGESAHAN TANDA TANGAN
  if (currentY > 235) {
    doc.addPage();
    currentY = 25;
  }

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const colLeft = 25;
  const colRight = pageWidth - 75;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  doc.text(`Pamekasan, ${todayFormatted}`, colRight, currentY);
  currentY += 5;

  doc.text("Koordinator Petugas Kebersihan,", colLeft, currentY);
  doc.text("Mengetahui,", colRight, currentY);
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Tim Kebersihan Gedung DINKES", colLeft, currentY);
  doc.text("Kasubag Umum & Kepegawaian", colRight, currentY);

  currentY += 20;
  doc.setFont("helvetica", "bold");
  doc.text("( ..................................................... )", colLeft, currentY);
  doc.text("( ..................................................... )", colRight, currentY);

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Petugas Pelaksana", colLeft, currentY);
  doc.text("NIP. ...............................................", colRight, currentY);

  // ═════════════════════════════════════════════════════════════════
  // ─── 7. V. LAMPIRAN FOTO BUKTI PENGADUAN & TINDAK LANJUT ────────
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  currentY = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("V. LAMPIRAN DOKUMENTASI BUKTI PENGADUAN & PENYELESAIAN (BEFORE & AFTER)", 14, currentY);

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Bukti foto kondisi masalah saat diadukan dan foto bukti fisik setelah ditindaklanjuti/dibersihkan oleh petugas.", 14, currentY);
  currentY += 6;

  if (periodComplaints.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61);
    doc.text("NIHIL PENGADUAN: Tidak ada bukti foto pengaduan yang perlu dilampirkan pada periode ini.", 18, currentY + 8);
    currentY += 20;
  } else {
    for (let i = 0; i < periodComplaints.length; i++) {
      const c = periodComplaints[i];
      onProgress?.(`Memproses foto bukti pengaduan (${i + 1}/${periodComplaints.length})...`);

      const beforePhotos = c.photos || [];
      const afterPhotos = c.resolution_photos || [];

      if (currentY + 65 > pageHeight - 20) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, currentY, pageWidth - 28, 12, 1.5, 1.5, 'FD');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Pengaduan #${i + 1}: ${c.description}`, 17, currentY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Pelapor: ${c.reporter_name} (${c.bidang}) | Lokasi: ${c.floor} | Tgl: ${c.date} ${c.time || ''} | Status: ${c.status === 'resolved' ? 'SELESAI' : 'MENUNGGU'}`, 17, currentY + 9);

      currentY += 14;

      const imgWidth = 40;
      const imgHeight = 32;

      // Kolom Kiri: Foto Pengaduan (Before)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text("Foto Saat Diadukan (Before):", 16, currentY + 3);

      let xPosBefore = 16;
      if (beforePhotos.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Tidak ada foto terlampir", 16, currentY + 12);
      } else {
        for (let pIdx = 0; pIdx < Math.min(2, beforePhotos.length); pIdx++) {
          try {
            const imgData = await loadImageAsDataUrl(beforePhotos[pIdx]);
            if (imgData) {
              doc.addImage(imgData, 'JPEG', xPosBefore, currentY + 5, imgWidth, imgHeight);
              doc.setDrawColor(226, 232, 240);
              doc.rect(xPosBefore, currentY + 5, imgWidth, imgHeight);
            }
          } catch {
            // Lewati jika error
          }
          xPosBefore += imgWidth + 4;
        }
      }

      // Kolom Kanan: Foto Hasil Penyelesaian (After)
      const colAfterX = 105;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(21, 128, 61);
      doc.text("Foto Bukti Selesai (After):", colAfterX, currentY + 3);

      let xPosAfter = colAfterX;
      if (afterPhotos.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(c.status === 'resolved' ? "Selesai tanpa foto" : "Belum ada foto penyelesaian (Pending)", colAfterX, currentY + 12);
      } else {
        for (let pIdx = 0; pIdx < Math.min(2, afterPhotos.length); pIdx++) {
          try {
            const imgData = await loadImageAsDataUrl(afterPhotos[pIdx]);
            if (imgData) {
              doc.addImage(imgData, 'JPEG', xPosAfter, currentY + 5, imgWidth, imgHeight);
              doc.setDrawColor(226, 232, 240);
              doc.rect(xPosAfter, currentY + 5, imgWidth, imgHeight);
            }
          } catch {
            // Lewati jika error
          }
          xPosAfter += imgWidth + 4;
        }
      }

      currentY += imgHeight + 12;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // ─── 8. VI. LAMPIRAN DOKUMENTASI FOTO KEBERSIHAN HARIAN OB ──────
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  currentY = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("VI. LAMPIRAN DOKUMENTASI FOTO KEBERSIHAN HARIAN PETUGAS (LANTAI 1, 2, 3)", 14, currentY);

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Dokumentasi visual hasil pembersihan harian di seluruh lantai kantor Dinas Kesehatan.", 14, currentY);
  currentY += 6;

  const reportsWithPhotos = periodReports.filter(r => r.photos && r.photos.length > 0);

  if (reportsWithPhotos.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Belum ada dokumentasi foto laporan harian yang diunggah pada periode ini.", 18, currentY + 8);
    currentY += 20;
  } else {
    for (let rIdx = 0; rIdx < reportsWithPhotos.length; rIdx++) {
      const rep = reportsWithPhotos[rIdx];
      onProgress?.(`Memproses foto harian (${rIdx + 1}/${reportsWithPhotos.length})...`);

      if (currentY + 58 > pageHeight - 20) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, currentY, pageWidth - 28, 10, 1.5, 1.5, 'FD');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`[${rep.date} · ${rep.time || '-'}] ${rep.floor} · Petugas: ${rep.inspector_name}`, 17, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Keterangan: ${rep.description || 'Pembersihan rutin selesai.'}`, 17, currentY + 8);

      currentY += 12;

      const pWidth = 52;
      const pHeight = 39;
      let xOffset = 15;

      const photosToRender = rep.photos.slice(0, 3);
      for (let pI = 0; pI < photosToRender.length; pI++) {
        try {
          const imgData = await loadImageAsDataUrl(photosToRender[pI]);
          if (imgData) {
            doc.addImage(imgData, 'JPEG', xOffset, currentY, pWidth, pHeight);
            doc.setDrawColor(203, 213, 225);
            doc.rect(xOffset, currentY, pWidth, pHeight);
          }
        } catch {
          // Lewati jika error
        }
        xOffset += pWidth + 5;
      }

      currentY += pHeight + 8;
    }
  }

  // ─── 9. SIMPAN FILE PDF ───
  onProgress?.("Menyimpan & mengemas dokumen PDF...");
  const filename = `Laporan-Monev-Kebersihan-DINKES-${year}-${month.toString().padStart(2, '0')}.pdf`;
  doc.save(filename);
}
