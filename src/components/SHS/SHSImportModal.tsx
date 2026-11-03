// src/components/SHS/SHSImportModal.tsx
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { User } from "@/hooks/useSupabaseAuth";
import {
  SHSItem,
  SHSPeriod,
  MasterKategori,
  MasterRekening,
  MasterSatuan,
  MasterKelompok,
} from "@/types/shs";
import { DAFTAR_UNIT_DINKES_PUSKESMAS, getKategoriNama, formatKategoriWithNama } from "@/lib/shsMasterData";
import { inferUnitFromUser } from "@/lib/shsVerificationHelper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileCheck,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface SHSImportModalProps {
  user: User | null;
  activePeriod: SHSPeriod;
  isPeriodOpen: boolean;
  masterKategori: MasterKategori[];
  masterRekening: MasterRekening[];
  masterSatuan: MasterSatuan[];
  masterKelompok: MasterKelompok[];
  onImportComplete: () => void;
  importItems: (items: Omit<SHSItem, "id" | "created_at" | "updated_at">[]) => Promise<number>;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
  data: any;
}

export const SHSImportModal = ({
  user,
  activePeriod,
  isPeriodOpen,
  masterKategori,
  masterRekening,
  masterSatuan,
  masterKelompok,
  onImportComplete,
  importItems,
}: SHSImportModalProps) => {
  const isAdmin = user?.role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [validRows, setValidRows] = useState<Omit<SHSItem, "id" | "created_at" | "updated_at">[]>([]);
  const [invalidRows, setInvalidRows] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Download Template Excel
  const handleDownloadTemplate = () => {
    // 1. Data Sheet Template
    const templateHeaders = [
      "kode_kategori",
      "uraian",
      "spek",
      "satuan",
      "harga",
      "ongkir",
      "total (e+f)",
      "rekening 1",
      "rekening 2",
      "rekening 3",
      "kelompok",
      "tahun",
      "Link Katalog 1",
      "Link Katalog 2",
      "Link Katalog 3",
      "TKDN 1",
      "TKDN 2",
      "TKDN 3",
      "NAMA PENGUSUL",
      "PUSKESMAS/DINKES",
    ];

    const sampleData = [
      {
        kode_kategori: "1.3.2.08.01.01.002",
        uraian: "Tensimeter Digital Otomatis Omron HEM-7120",
        spek: "Tensimeter lengan atas digital, akurasi tekanan +/- 3 mmHg, memori 30 pengukuran, garansi resmi 5 tahun Kemenkes RI AKL.",
        satuan: "Unit",
        harga: 750000,
        ongkir: 25000,
        "total (e+f)": 775000,
        "rekening 1": "5.2.02.08.001.00001",
        "rekening 2": "",
        "rekening 3": "",
        kelompok: "Barang Medis / Alkes",
        tahun: activePeriod.tahun || 2027,
        "Link Katalog 1": "https://e-katalog.lkpp.go.id/katalog/produk/detail/123456",
        "Link Katalog 2": "https://e-katalog.lkpp.go.id/katalog/produk/detail/123457",
        "Link Katalog 3": "",
        "TKDN 1": 42.5,
        "TKDN 2": 40.0,
        "TKDN 3": "",
        "NAMA PENGUSUL": user?.username || "Pengusul",
        "PUSKESMAS/DINKES": "Puskesmas Teja",
      },
      {
        kode_kategori: "1.1.7.01.01.001",
        uraian: "Kertas HVS A4 80 gram Sinar Dunia",
        spek: "Ukuran A4 210 x 297 mm, ketebalan 80 gsm, 500 lembar per rim, putih bersih tingkat keputihan 98%.",
        satuan: "Rim",
        harga: 58000,
        ongkir: 0,
        "total (e+f)": 58000,
        "rekening 1": "5.1.02.01.001.00025",
        "rekening 2": "",
        "rekening 3": "",
        kelompok: "Alat Tulis Kantor (ATK)",
        tahun: activePeriod.tahun || 2027,
        "Link Katalog 1": "https://e-katalog.lkpp.go.id/katalog/produk/detail/987654",
        "Link Katalog 2": "https://e-katalog.lkpp.go.id/katalog/produk/detail/987655",
        "Link Katalog 3": "",
        "TKDN 1": 85.0,
        "TKDN 2": 82.0,
        "TKDN 3": "",
        "NAMA PENGUSUL": user?.username || "Pengusul",
        "PUSKESMAS/DINKES": "Sekretariat Dinas Kesehatan",
      },
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Usulan SHS
    const wsTemplate = XLSX.utils.json_to_sheet(sampleData, { header: templateHeaders });
    XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Usulan SHS");

    // Sheet 2: Referensi Kode Kategori
    const katRows = masterKategori.map((k) => ({
      kode: k.kode,
      nama_kategori: k.nama,
      kelompok: k.kelompok,
    }));
    const wsKat = XLSX.utils.json_to_sheet(katRows);
    XLSX.utils.book_append_sheet(wb, wsKat, "Ref Kategori Barang");

    // Sheet 3: Referensi Kode Rekening
    const rekRows = masterRekening.map((r) => ({
      kode_rekening: r.kode,
      uraian_rekening: r.uraian,
    }));
    const wsRek = XLSX.utils.json_to_sheet(rekRows);
    XLSX.utils.book_append_sheet(wb, wsRek, "Ref Rekening Belanja");

    // Sheet 4: Referensi Satuan & Kelompok
    const satRows = masterSatuan.map((s) => ({
      satuan: s.nama,
      keterangan: s.keterangan || "",
    }));
    const wsSat = XLSX.utils.json_to_sheet(satRows);
    XLSX.utils.book_append_sheet(wb, wsSat, "Ref Satuan");

    XLSX.writeFile(wb, `Template_Usulan_SHS_Dinkes_Pamekasan_TA_${activePeriod.tahun}.xlsx`);
    toast({
      title: "Template Terunduh",
      description: "File template Excel usulan SHS siap diisi.",
    });
  };

  // Handle Upload File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPeriodOpen && !isAdmin) {
      toast({
        title: "Batas Waktu Berakhir",
        description: "Periode pengusulan telah berakhir. Berkas tidak dapat diunggah.",
        variant: "destructive",
      });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setValidRows([]);
    setInvalidRows([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const wb = XLSX.read(buffer, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          toast({
            title: "File Kosong",
            description: "Tidak ada baris data dalam berkas yang diunggah.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        // Validate rows
        const valids: Omit<SHSItem, "id" | "created_at" | "updated_at">[] = [];
        const invalids: ValidationError[] = [];

        rawJson.forEach((rawRow: any, idx) => {
          const rowNum = idx + 2; // header is row 1
          
          // Normalisasi key objek: potong spasi depan/belakang dan dukung akses lowercase
          const row: Record<string, any> = {};
          for (const [k, v] of Object.entries(rawRow || {})) {
            const trimmedKey = k.trim();
            row[trimmedKey] = v;
            row[trimmedKey.toLowerCase()] = v;
          }

          const uraian = String(row.uraian || row.Uraian || row.URAIAN || "").trim();
          const kodeKat = String(row.kode_kategori || row.Kode_Kategori || row.KODE_KATEGORI || "").trim();
          const spek = String(row.spek || row.Spek || row.spesifikasi || row.SPEK || "").trim();
          const satuan = String(row.satuan || row.Satuan || row.SATUAN || "Unit").trim();
          const kelompok = String(row.kelompok || row.Kelompok || row.KELOMPOK || "Barang Medis / Alkes").trim();
          const rawHarga = String(
            row.harga ??
            row.Harga ??
            row["harga satuan"] ??
            row["harga_satuan"] ??
            "0"
          ).replace(/[^0-9]/g, "");
          const rawOngkir = String(row.ongkir ?? row.Ongkir ?? "0").replace(/[^0-9]/g, "");
          const harga = Number(rawHarga) || 0;
          const ongkir = Number(rawOngkir) || 0;
          
          const normalizeRek = (r: string) => {
            const trimmed = r.trim();
            if (trimmed === "5.1.02.01.01.0012" || trimmed === "5.1.02.01.01.00012") return "5.1.02.01.001.00012";
            if (trimmed.startsWith("5.1.02.01.01.")) return trimmed.replace("5.1.02.01.01.", "5.1.02.01.001.");
            if (trimmed.startsWith("5.1.02.02.01.")) return trimmed.replace("5.1.02.02.01.", "5.1.02.02.001.");
            return trimmed;
          };

          const rekening1 = normalizeRek(
            String(row["rekening 1"] || row["rekening_1"] || row.rekening1 || row.Rekening_1 || "")
          );
          const rekening2 = normalizeRek(
            String(row["rekening 2"] || row["rekening_2"] || row.rekening2 || "")
          );
          const rekening3 = normalizeRek(
            String(row["rekening 3"] || row["rekening_3"] || row.rekening3 || "")
          );

          const normalizeUrlStr = (url: any) => {
            const str = String(url || "").trim();
            if (!str) return "";
            if (/^https?:\/\//i.test(str)) return str;
            if (!str.includes(" ") && str.includes(".")) {
              return `https://${str}`;
            }
            return str;
          };

          const rawLink1 = normalizeUrlStr(
            row["Link Katalog 1"] || row["link katalog 1"] || row.link_katalog_1 || row.link_katalog1 || row.katalog_1 || ""
          );
          const rawLink2 = normalizeUrlStr(
            row["Link Katalog 2"] || row["link katalog 2"] || row.link_katalog_2 || row.link_katalog2 || ""
          );
          const rawLink3 = normalizeUrlStr(
            row["Link Katalog 3"] || row["link katalog 3"] || row.link_katalog_3 || row.link_katalog3 || ""
          );

          // Kumpulkan URL yang benar-benar valid (diawali http:// atau https://)
          const allLinks = [rawLink1, rawLink2, rawLink3];
          const validUrls = allLinks.filter((u) => u.startsWith("http://") || u.startsWith("https://"));

          // Prioritaskan URL valid yang ada
          const link1 = validUrls[0] || rawLink1;
          const link2 = validUrls[1] || (rawLink2.startsWith("http://") || rawLink2.startsWith("https://") ? rawLink2 : undefined);
          const link3 = validUrls[2] || (rawLink3.startsWith("http://") || rawLink3.startsWith("https://") ? rawLink3 : undefined);

          const parseTkdn = (v: any) => {
            if (v === "" || v === null || v === undefined) return undefined;
            const num = Number(v);
            return isNaN(num) ? undefined : num;
          };
          const tkdn1 = parseTkdn(row["TKDN 1"] ?? row["tkdn 1"] ?? row.tkdn_1 ?? row.tkdn1) ?? 0;
          const tkdn2 = parseTkdn(row["TKDN 2"] ?? row["tkdn 2"] ?? row.tkdn_2 ?? row.tkdn2);
          const tkdn3 = parseTkdn(row["TKDN 3"] ?? row["tkdn 3"] ?? row.tkdn_3 ?? row.tkdn3);

          const rowPengusul = String(
            row["NAMA PENGUSUL"] || row["nama pengusul"] || row.nama_pengusul || user?.username || "Pengusul"
          ).trim();
          const rowUnit = !isAdmin
            ? inferUnitFromUser(user?.username)
            : String(
                row["PUSKESMAS/DINKES"] ||
                  row["puskesmas/dinkes"] ||
                  row.unit_kerja ||
                  inferUnitFromUser(user?.username)
              ).trim();
          const rowTahun = Number(row.tahun || row.Tahun) || activePeriod.tahun || 2027;

          // Validations
          if (!uraian) {
            invalids.push({ row: rowNum, column: "uraian", message: "Nama barang/uraian kosong", data: row });
            return;
          }
          if (!kodeKat) {
            invalids.push({ row: rowNum, column: "kode_kategori", message: "Kode kategori kosong", data: row });
            return;
          }
          if (harga <= 0) {
            invalids.push({ row: rowNum, column: "harga", message: "Harga satuan kosong atau harus > 0", data: row });
            return;
          }
          if (!rekening1) {
            invalids.push({ row: rowNum, column: "rekening 1", message: "Kode rekening belanja 1 kosong", data: row });
            return;
          }
          if (!link1 || (!link1.startsWith("http://") && !link1.startsWith("https://"))) {
            invalids.push({ row: rowNum, column: "Link Katalog 1", message: "Tidak ada tautan URL valid (harus diawali http:// atau https://)", data: row });
            return;
          }

          const katObj = masterKategori.find((k) => k.kode === kodeKat);

          valids.push({
            period_id: activePeriod.id,
            tahun: rowTahun,
            user_id: user?.id || "user",
            nama_pengusul: rowPengusul,
            unit_kerja: rowUnit,
            kode_kategori: kodeKat,
            kategori_nama: katObj?.nama || getKategoriNama(kodeKat) || "",
            uraian,
            spek: spek || uraian,
            satuan: satuan || "Unit",
            harga,
            ongkir,
            total: harga + ongkir,
            rekening_1: rekening1,
            rekening_2: rekening2 || undefined,
            rekening_3: rekening3 || undefined,
            kelompok,
            link_katalog_1: link1,
            link_katalog_2: link2 || undefined,
            link_katalog_3: link3 || undefined,
            tkdn_1: tkdn1,
            tkdn_2: tkdn2,
            tkdn_3: tkdn3,
            status: "draft",
          });
        });

        setValidRows(valids);
        setInvalidRows(invalids);
      } catch (err: any) {
        toast({
          title: "Gagal Membaca File",
          description: err.message || "Pastikan format file berupa Excel (.xlsx) atau CSV yang valid.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Simpan baris valid
  const handleCommitImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      const count = await importItems(validRows);
      if (count > 0) {
        setValidRows([]);
        setInvalidRows([]);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        onImportComplete();
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Kartu Petunjuk & Unduh Template */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-600" />
                Import Data Usulan SHS dari Excel / CSV
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Unggah banyak usulan sekaligus menggunakan file spreadsheet berformat baku.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 text-xs border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 self-start sm:self-auto font-semibold"
            >
              <Download size={14} />
              Unduh Template Resmi (.xlsx)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-blue-600" /> Ketentuan Format Unggahan:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 text-[11px]">
              <li>Kolom wajib: <code>kode_kategori</code>, <code>uraian</code>, <code>satuan</code>, <code>harga</code>, <code>rekening_1</code>, <code>Link Katalog 1</code>, <code>Link Katalog 2</code>.</li>
              <li>Kode kategori & kode rekening harus sesuai lembar referensi di dalam file template.</li>
              <li>Tautan e-Katalog 1 dan 2 wajib diisi dengan link aktif LKPP / e-katalog (diawali <code>http://</code> atau <code>https://</code>), sedangkan Tautan 3 bersifat opsional.</li>
              <li>Data yang berhasil diimpor otomatis berstatus <strong>Draft</strong> sehingga Anda dapat memeriksa kembali sebelum diajukan.</li>
            </ul>
          </div>

          {/* Peringatan Periode Ditutup */}
          {!isPeriodOpen && !isAdmin && (
            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0 text-rose-600" />
              <div>
                <p className="font-bold text-xs">Periode Pengusulan Telah Berakhir</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Batas waktu pengusulan telah berakhir pada{" "}
                  <b>
                    {activePeriod?.tutup_at
                      ? new Date(activePeriod.tutup_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "waktu yang ditentukan"}
                  </b>
                  . Fitur unggah berkas impor dikunci secara otomatis tanpa perlu memuat ulang halaman.
                </p>
              </div>
            </div>
          )}

          {/* Area Drag & Drop File */}
          <div
            onClick={() => {
              if (!isPeriodOpen && !isAdmin) {
                toast({
                  title: "Periode Pengusulan Ditutup",
                  description: "Batas waktu pengusulan telah berakhir. Tidak dapat mengunggah berkas baru.",
                  variant: "destructive",
                });
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              !isPeriodOpen && !isAdmin
                ? "border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-60"
                : "border-slate-300 hover:border-emerald-500 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              disabled={!isPeriodOpen && !isAdmin}
              className="hidden"
            />
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              !isPeriodOpen && !isAdmin ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-700"
            }`}>
              <Upload size={22} />
            </div>
            <div className="text-sm font-bold text-slate-800">
              {!isPeriodOpen && !isAdmin
                ? "Impor Berkas Terkunci (Periode Telah Ditutup)"
                : fileName
                ? fileName
                : "Klik di sini untuk memilih file .xlsx atau .csv"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {!isPeriodOpen && !isAdmin
                ? "Batas waktu pengusulan telah habis. Hubungi Admin Dinkes jika diperlukan pembukaan masa usulan."
                : "Maksimal 5.000 baris per file (Ukuran berkas < 10 MB)"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hasil Validasi File */}
      {(validRows.length > 0 || invalidRows.length > 0) && (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck size={16} className="text-blue-600" />
                  Hasil Validasi Berkas: {fileName}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Tinjau baris yang siap diimpor dan perbaiki baris galat jika diperlukan.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs">
                  {validRows.length} Baris Valid
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                    {invalidRows.length} Baris Galat
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Tabel Baris Galat jika ada */}
            {invalidRows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <XCircle size={14} className="text-rose-600" />
                  Daftar Baris yang Gagal Validasi ({invalidRows.length}):
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50/40 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-rose-100 text-rose-800 text-[11px] font-bold">
                      <tr>
                        <th className="py-2 px-3">No. Baris Excel</th>
                        <th className="py-2 px-3">Kolom</th>
                        <th className="py-2 px-3">Pesan Kesalahan</th>
                        <th className="py-2 px-3">Uraian / Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {invalidRows.map((err, i) => (
                        <tr key={i} className="hover:bg-rose-100/50">
                          <td className="py-1.5 px-3 font-mono font-bold text-rose-900">
                            Baris {err.row}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-rose-800">{err.column}</td>
                          <td className="py-1.5 px-3 text-rose-700">{err.message}</td>
                          <td className="py-1.5 px-3 text-slate-500 line-clamp-1 max-w-xs">
                            {err.data.uraian || JSON.stringify(err.data)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pratinjau Baris Valid */}
            {validRows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Pratinjau Data Valid yang Siap Diimpor ({validRows.length} item):
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 text-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      <tr>
                        <th className="py-2 px-3">Uraian Barang</th>
                        <th className="py-2 px-3">Kategori</th>
                        <th className="py-2 px-3">Satuan</th>
                        <th className="py-2 px-3 text-right">Harga (Rp)</th>
                        <th className="py-2 px-3">Rekening</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validRows.slice(0, 15).map((r, i) => (
                        <tr key={i} className="hover:bg-white">
                          <td className="py-1.5 px-3 font-bold text-slate-800">{r.uraian}</td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-blue-600">
                            {formatKategoriWithNama(r.kode_kategori, r.kategori_nama)}
                          </td>
                          <td className="py-1.5 px-3">{r.satuan}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800">
                            {new Intl.NumberFormat("id-ID").format(r.harga)}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500">{r.rekening_1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validRows.length > 15 && (
                  <p className="text-[11px] text-slate-400 italic">
                    ... dan {validRows.length - 15} item valid lainnya.
                  </p>
                )}
              </div>
            )}

            {/* Tombol Konfirmasi Import */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Data akan disimpan sebagai <strong>Draft</strong> pada periode TA {activePeriod.tahun}.
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValidRows([]);
                    setInvalidRows([]);
                    setFileName("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs"
                >
                  Batal / Reset
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={validRows.length === 0 || isImporting || (!isPeriodOpen && !isAdmin)}
                  onClick={handleCommitImport}
                  className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 size={14} />
                  {isImporting
                    ? "Menyimpan ke Draft..."
                    : `Simpan ${validRows.length} Item ke Draft`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
