// src/hooks/useSHS.ts
// Hook untuk Mengelola Data Usulan Standar Harga Satuan (SHS)

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "./useSupabaseAuth";
import { toast } from "@/components/ui/use-toast";
import {
  SHSItem,
  SHSPeriod,
  SHSStatus,
  PeriodStatus,
  MasterKategori,
  MasterRekening,
  MasterSatuan,
  MasterKelompok,
  SHSRecapStats,
} from "@/types/shs";
import {
  DEFAULT_ACTIVE_PERIOD,
  DEFAULT_MASTER_KATEGORI,
  DEFAULT_MASTER_REKENING,
  DEFAULT_MASTER_SATUAN,
  DEFAULT_MASTER_KELOMPOK,
  getKategoriNama,
  setDynamicMasterKategori,
  setDynamicMasterRekening,
} from "@/lib/shsMasterData";
import {
  parseVerificationData,
  serializeVerificationData,
  computeOverallStatus,
  VerifierDecision,
  isItemOwner,
  canEditItem,
  canDeleteItem,
  canUserViewItem,
} from "@/lib/shsVerificationHelper";

const ITEMS_STORAGE_KEY = "siruang_shs_items_cache";
const getUserItemsStorageKey = (userId?: string) =>
  userId ? `siruang_shs_items_cache_${userId}` : ITEMS_STORAGE_KEY;
const PERIODS_STORAGE_KEY = "siruang_shs_periods_cache";
const MASTER_KAT_KEY = "siruang_shs_master_kategori";
const MASTER_REK_KEY = "siruang_shs_master_rekening";
const MASTER_SAT_KEY = "siruang_shs_master_satuan";
const MASTER_KEL_KEY = "siruang_shs_master_kelompok";

const normalizeRekening = (rek?: string | null): string => {
  if (!rek) return "";
  const trimmed = rek.trim();
  if (trimmed === "5.1.02.01.01.0012" || trimmed === "5.1.02.01.01.00012") {
    return "5.1.02.01.001.00012";
  }
  return trimmed;
};

const enrichSHSItem = (raw: any): SHSItem => {
  const verifData = parseVerificationData(raw);
  const resolvedKategoriNama = getKategoriNama(raw.kode_kategori, raw.kategori_nama);

  let computedStatus: SHSStatus = raw.status;
  // Jika di database raw.status adalah 'diajukan' namun metadata mencatat is_revisi,
  // maka di level aplikasi status usulan adalah 'diperbaiki' (usulan hasil revisi)
  if (raw.status === "diajukan" && verifData.is_revisi) {
    computedStatus = "diperbaiki";
  }

  return {
    ...raw,
    status: computedStatus,
    kategori_nama: resolvedKategoriNama || raw.kategori_nama,
    rekening_1: normalizeRekening(raw.rekening_1),
    rekening_2: raw.rekening_2 ? normalizeRekening(raw.rekening_2) : raw.rekening_2,
    rekening_3: raw.rekening_3 ? normalizeRekening(raw.rekening_3) : raw.rekening_3,
    is_revisi: verifData.is_revisi,
    revisi_ke: verifData.revisi_ke,
    revisi_at: verifData.revisi_at,
    catatan_perbaikan: verifData.catatan_perbaikan,
    previous_admin: verifData.previous_admin,
    previous_pengurus: verifData.previous_pengurus,
    verifikasi_admin: verifData.admin,
    verifikasi_pengurus: verifData.pengurus,
    submitted_at: raw.submitted_at || verifData.submitted_at || (raw.status !== "draft" ? raw.created_at : null),
  };
};

// Helper sanitasi item agar HANYA kolom PostgreSQL yang dikirim ke Supabase (hapus virtual fields)
const sanitizeItemForSupabase = (item: any) => {
  // PostgreSQL shs_items_status_check constraint mengizinkan:
  // 'draft', 'diajukan', 'disetujui', 'perlu_perbaikan', 'ditolak'
  const dbStatus = item.status === "diperbaiki" ? "diajukan" : item.status;

  return {
    period_id: item.period_id,
    tahun: item.tahun,
    user_id: item.user_id,
    nama_pengusul: item.nama_pengusul,
    unit_kerja: item.unit_kerja,
    kode_kategori: item.kode_kategori,
    kategori_nama: item.kategori_nama || null,
    uraian: item.uraian,
    spek: item.spek || "",
    satuan: item.satuan,
    harga: Number(item.harga) || 0,
    ongkir: Number(item.ongkir) || 0,
    total: (Number(item.harga) || 0) + (Number(item.ongkir) || 0),
    rekening_1: item.rekening_1,
    rekening_2: item.rekening_2 || null,
    rekening_3: item.rekening_3 || null,
    kelompok: item.kelompok,
    link_katalog_1: item.link_katalog_1 || "",
    link_katalog_2: item.link_katalog_2 || null,
    link_katalog_3: item.link_katalog_3 || null,
    tkdn_1: item.tkdn_1 !== undefined && item.tkdn_1 !== null && item.tkdn_1 !== "" ? Number(item.tkdn_1) : 0,
    tkdn_2: item.tkdn_2 !== undefined && item.tkdn_2 !== null && item.tkdn_2 !== "" ? Number(item.tkdn_2) : null,
    tkdn_3: item.tkdn_3 !== undefined && item.tkdn_3 !== null && item.tkdn_3 !== "" ? Number(item.tkdn_3) : null,
    status: dbStatus,
    catatan_verifikator: item.catatan_verifikator || null,
    verifikator_name: item.verifikator_name || null,
    verified_at: item.verified_at || null,
    updated_at: new Date().toISOString(),
  };
};

// Helper get from localStorage with fallback
const getCachedData = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const setCachedData = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to cache ${key}:`, e);
  }
};

// Helper generate RFC4122 v4 UUID
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useSHS = (user: User | null) => {
  const isAdmin = user?.role === "admin";
  const isPengurusBarang =
    user?.role === "pengurus_barang" ||
    (user?.username || "").toLowerCase().startsWith("pengurus");

  // State: Periode
  const [periods, setPeriods] = useState<SHSPeriod[]>(() =>
    getCachedData<SHSPeriod[]>(PERIODS_STORAGE_KEY, [DEFAULT_ACTIVE_PERIOD])
  );
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.aktif) || periods[0] || DEFAULT_ACTIVE_PERIOD;
  }, [periods]);

  // State: Master Data
  const [masterKategori, setMasterKategori] = useState<MasterKategori[]>(() => {
    const cached = getCachedData<MasterKategori[]>(MASTER_KAT_KEY, null);
    if (!cached || !Array.isArray(cached) || cached.length === 0) {
      setDynamicMasterKategori(DEFAULT_MASTER_KATEGORI);
      return DEFAULT_MASTER_KATEGORI;
    }
    const defaultCodes = new Set(DEFAULT_MASTER_KATEGORI.map((d) => d.kode));
    const userCustom = cached.filter((c) => !defaultCodes.has(c.kode));
    const mergedDefaults = DEFAULT_MASTER_KATEGORI.map((def) => {
      const match = cached.find((c) => c.kode === def.kode);
      return match || def;
    });
    const initial = [...userCustom, ...mergedDefaults];
    setDynamicMasterKategori(initial);
    return initial;
  });
  const [masterRekening, setMasterRekening] = useState<MasterRekening[]>(() => {
    const cached = getCachedData<MasterRekening[]>(MASTER_REK_KEY, null);
    if (!cached || !Array.isArray(cached) || cached.length === 0) {
      setDynamicMasterRekening(DEFAULT_MASTER_REKENING);
      return DEFAULT_MASTER_REKENING;
    }
    const defaultCodes = new Set(DEFAULT_MASTER_REKENING.map((d) => d.kode));
    const userCustom = cached.filter((c) => !defaultCodes.has(c.kode));
    const mergedDefaults = DEFAULT_MASTER_REKENING.map((def) => {
      const match = cached.find((c) => c.kode === def.kode);
      return match || def;
    });
    const initial = [...userCustom, ...mergedDefaults];
    setDynamicMasterRekening(initial);
    return initial;
  });
  const [masterSatuan, setMasterSatuan] = useState<MasterSatuan[]>(() =>
    getCachedData<MasterSatuan[]>(MASTER_SAT_KEY, DEFAULT_MASTER_SATUAN)
  );
  const [masterKelompok, setMasterKelompok] = useState<MasterKelompok[]>(() => {
    const cached = getCachedData<MasterKelompok[]>(MASTER_KEL_KEY, DEFAULT_MASTER_KELOMPOK);
    if (!cached || cached.length < DEFAULT_MASTER_KELOMPOK.length) {
      setCachedData(MASTER_KEL_KEY, DEFAULT_MASTER_KELOMPOK);
      return DEFAULT_MASTER_KELOMPOK;
    }
    return cached;
  });

  const [isDatabaseMasterConnected, setIsDatabaseMasterConnected] = useState<boolean>(false);
  const [isSyncingMasters, setIsSyncingMasters] = useState<boolean>(false);

  // Fetch seluruh kategori dari Supabase dengan range pagination (jika > 1000 records)
  const fetchAllCategoriesFromSupabase = async (): Promise<MasterKategori[] | null> => {
    try {
      const all: MasterKategori[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("shs_master_kategori")
          .select("kode, nama, kelompok, aktif")
          .order("kode", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          if (all.length === 0) return null;
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          all.push(...(data as MasterKategori[]));
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            from += PAGE_SIZE;
          }
        }
      }

      return all;
    } catch {
      return null;
    }
  };

  // Fetch Master Data dari database Supabase (fallback ke local cache jika tabel belum ada)
  const fetchMasterData = useCallback(async () => {
    try {
      // 1. Fetch Kategori dari Supabase
      const katServer = await fetchAllCategoriesFromSupabase();

      // 2. Fetch Rekening dari Supabase
      const { data: rekData, error: rekError } = await supabase
        .from("shs_master_rekening")
        .select("kode, uraian, aktif")
        .order("kode", { ascending: true });

      let katOk = false;
      let rekOk = false;

      if (katServer !== null) {
        katOk = true;
        if (katServer.length > 0) {
          setMasterKategori(katServer);
          setCachedData(MASTER_KAT_KEY, katServer);
          setDynamicMasterKategori(katServer);
        }
      }

      if (!rekError && rekData) {
        rekOk = true;
        if (rekData.length > 0) {
          const rekList = rekData as MasterRekening[];
          setMasterRekening(rekList);
          setCachedData(MASTER_REK_KEY, rekList);
          setDynamicMasterRekening(rekList);
        }
      }

      setIsDatabaseMasterConnected(katOk && rekOk);
    } catch (err) {
      console.warn("fetchMasterData exception:", err);
      setIsDatabaseMasterConnected(false);
    }
  }, []);

  // Tambah Master Kategori ke Database Supabase
  const addMasterKategori = async (item: MasterKategori): Promise<boolean> => {
    const updated = [item, ...masterKategori.filter((k) => k.kode !== item.kode)];
    setMasterKategori(updated);
    setCachedData(MASTER_KAT_KEY, updated);
    setDynamicMasterKategori(updated);

    try {
      const { error } = await supabase.from("shs_master_kategori").upsert({
        kode: item.kode,
        nama: item.nama,
        kelompok: item.kelompok || "SSH",
        aktif: item.aktif !== false,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Supabase upsert kategori error:", error.message);
        setIsDatabaseMasterConnected(false);
        setMasterKategori(masterKategori);
        setCachedData(MASTER_KAT_KEY, masterKategori);
        setDynamicMasterKategori(masterKategori);
        toast({ title: "Gagal Menyimpan Kategori", description: error.message, variant: "destructive" });
        return false;
      }
      setIsDatabaseMasterConnected(true);
      return true;
    } catch (e: any) {
      console.warn("Exception addMasterKategori:", e);
      setIsDatabaseMasterConnected(false);
      setMasterKategori(masterKategori);
      setCachedData(MASTER_KAT_KEY, masterKategori);
      setDynamicMasterKategori(masterKategori);
      toast({ title: "Gagal Menyimpan Kategori", description: e?.message || "Koneksi database bermasalah", variant: "destructive" });
      return false;
    }
  };

  // Hapus Master Kategori dari Database Supabase
  const deleteMasterKategori = async (kode: string): Promise<boolean> => {
    const updated = masterKategori.filter((k) => k.kode !== kode);
    setMasterKategori(updated);
    setCachedData(MASTER_KAT_KEY, updated);
    setDynamicMasterKategori(updated);

    try {
      const { error } = await supabase.from("shs_master_kategori").delete().eq("kode", kode);
      if (error) {
        console.warn("Supabase delete kategori error:", error.message);
        setIsDatabaseMasterConnected(false);
        setMasterKategori(masterKategori);
        setCachedData(MASTER_KAT_KEY, masterKategori);
        setDynamicMasterKategori(masterKategori);
        toast({ title: "Gagal Menghapus Kategori", description: error.message, variant: "destructive" });
        return false;
      }
      return true;
    } catch (e: any) {
      console.warn("Exception deleteMasterKategori:", e);
      setIsDatabaseMasterConnected(false);
      setMasterKategori(masterKategori);
      setCachedData(MASTER_KAT_KEY, masterKategori);
      setDynamicMasterKategori(masterKategori);
      toast({ title: "Gagal Menghapus Kategori", description: e?.message || "Koneksi database bermasalah", variant: "destructive" });
      return false;
    }
  };

  // Tambah Master Rekening ke Database Supabase
  const addMasterRekening = async (item: MasterRekening): Promise<boolean> => {
    const updated = [item, ...masterRekening.filter((r) => r.kode !== item.kode)];
    setMasterRekening(updated);
    setCachedData(MASTER_REK_KEY, updated);
    setDynamicMasterRekening(updated);

    try {
      const { error } = await supabase.from("shs_master_rekening").upsert({
        kode: item.kode,
        uraian: item.uraian,
        aktif: item.aktif !== false,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Supabase upsert rekening error:", error.message);
        setIsDatabaseMasterConnected(false);
        setMasterRekening(masterRekening);
        setCachedData(MASTER_REK_KEY, masterRekening);
        setDynamicMasterRekening(masterRekening);
        toast({ title: "Gagal Menyimpan Rekening", description: error.message, variant: "destructive" });
        return false;
      }
      setIsDatabaseMasterConnected(true);
      return true;
    } catch (e: any) {
      console.warn("Exception addMasterRekening:", e);
      setIsDatabaseMasterConnected(false);
      setMasterRekening(masterRekening);
      setCachedData(MASTER_REK_KEY, masterRekening);
      setDynamicMasterRekening(masterRekening);
      toast({ title: "Gagal Menyimpan Rekening", description: e?.message || "Koneksi database bermasalah", variant: "destructive" });
      return false;
    }
  };

  // Hapus Master Rekening dari Database Supabase
  const deleteMasterRekening = async (kode: string): Promise<boolean> => {
    const updated = masterRekening.filter((r) => r.kode !== kode);
    setMasterRekening(updated);
    setCachedData(MASTER_REK_KEY, updated);
    setDynamicMasterRekening(updated);

    try {
      const { error } = await supabase.from("shs_master_rekening").delete().eq("kode", kode);
      if (error) {
        console.warn("Supabase delete rekening error:", error.message);
        setIsDatabaseMasterConnected(false);
        setMasterRekening(masterRekening);
        setCachedData(MASTER_REK_KEY, masterRekening);
        setDynamicMasterRekening(masterRekening);
        toast({ title: "Gagal Menghapus Rekening", description: error.message, variant: "destructive" });
        return false;
      }
      return true;
    } catch (e: any) {
      console.warn("Exception deleteMasterRekening:", e);
      setIsDatabaseMasterConnected(false);
      setMasterRekening(masterRekening);
      setCachedData(MASTER_REK_KEY, masterRekening);
      setDynamicMasterRekening(masterRekening);
      toast({ title: "Gagal Menghapus Rekening", description: e?.message || "Koneksi database bermasalah", variant: "destructive" });
      return false;
    }
  };

  // Sinkronkan seluruh master (1.460+ Kategori & Rekening) ke Database Supabase
  const syncAllMastersToDatabase = async (): Promise<boolean> => {
    setIsSyncingMasters(true);
    try {
      // 1. Sync Rekening
      const rekPayload = masterRekening.map((r) => ({
        kode: r.kode,
        uraian: r.uraian,
        aktif: r.aktif !== false,
        updated_at: new Date().toISOString(),
      }));
      const { error: rekErr } = await supabase
        .from("shs_master_rekening")
        .upsert(rekPayload, { onConflict: "kode" });
      if (rekErr) {
        throw new Error(`Gagal menyimpan rekening ke database: ${rekErr.message}`);
      }

      // 2. Sync Kategori (batch 200 items)
      const BATCH_SIZE = 200;
      for (let i = 0; i < masterKategori.length; i += BATCH_SIZE) {
        const batch = masterKategori.slice(i, i + BATCH_SIZE).map((k) => ({
          kode: k.kode,
          nama: k.nama,
          kelompok: k.kelompok || "SSH",
          aktif: k.aktif !== false,
          updated_at: new Date().toISOString(),
        }));
        const { error: katErr } = await supabase
          .from("shs_master_kategori")
          .upsert(batch, { onConflict: "kode" });
        if (katErr) {
          throw new Error(`Gagal menyimpan kategori ke database (batch ${i}): ${katErr.message}`);
        }
      }

      setIsDatabaseMasterConnected(true);
      toast({
        title: "Sinkronisasi Berhasil! 🎉",
        description: `Berhasil mengunggah ${masterKategori.length} Kategori Barang dan ${masterRekening.length} Rekening Belanja ke database Supabase.`,
      });
      return true;
    } catch (err: any) {
      console.error("Gagal sinkron master:", err);
      toast({
        title: "Gagal Sinkronisasi Database",
        description:
          err.message ||
          "Pastikan tabel shs_master_kategori & shs_master_rekening sudah dibuat di Supabase SQL Editor.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSyncingMasters(false);
    }
  };

  // Key localStorage yang diisolasi per akun pengguna (mencegah data tercampur antar bidang)
  const itemsStorageKey = useMemo(() => {
    return getUserItemsStorageKey(user?.id);
  }, [user?.id]);

  // State: Items Usulan SHS (Diisolasi khusus untuk akun/bidang pengguna saat ini)
  const [items, setItems] = useState<SHSItem[]>(() => {
    const key = getUserItemsStorageKey(user?.id);
    const cached = getCachedData<any[]>(key, []).map(enrichSHSItem);
    if (!isAdmin && !isPengurusBarang) {
      return cached.filter((i) => canUserViewItem(i, user));
    }
    return cached;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Live clock ticker untuk evaluasi realtime status periode tanpa reload
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Status Periode Aktif (Realtime dievaluasi setiap detik tanpa perlu reload browser)
  const periodStatus = useMemo<PeriodStatus>(() => {
    if (!activePeriod || !activePeriod.aktif) return "ditutup";
    const buka = new Date(activePeriod.buka_at).getTime();
    const tutup = new Date(activePeriod.tutup_at).getTime();

    if (currentTime < buka) return "belum_dibuka";
    if (currentTime > tutup) return "ditutup";
    return "dibuka";
  }, [activePeriod, currentTime]);

  // Helper verifikasi instan apakah periode sedang buka tepat saat aksi simpan/kirim dilakukan
  const checkIsPeriodOpenNow = useCallback((): boolean => {
    if (isAdmin) return true;
    if (!activePeriod || !activePeriod.aktif) return false;
    const now = Date.now();
    const buka = new Date(activePeriod.buka_at).getTime();
    const tutup = new Date(activePeriod.tutup_at).getTime();
    return now >= buka && now <= tutup;
  }, [activePeriod, isAdmin]);

  // Fetch Items from Supabase (or fallback to cache)
  const fetchItems = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);

    const storageKey = getUserItemsStorageKey(user.id);

    try {
      const { data, error } = await supabase
        .from("shs_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase shs_items error, using localStorage cache:", error.message);
        const cached = getCachedData<any[]>(storageKey, []).map(enrichSHSItem);
        const filteredCached = !isAdmin && !isPengurusBarang
          ? cached.filter((i) => canUserViewItem(i, user))
          : cached;
        setItems(filteredCached);
      } else if (data) {
        let enrichedServer = (data as any[]).map(enrichSHSItem);

        // Jika peran adalah bidang / pengusul non-verifikator:
        // HANYA simpan & tampilkan usulan milik bidang/unit sendiri (bidang tidak bisa melihat usulan bidang lain)
        if (!isAdmin && !isPengurusBarang) {
          enrichedServer = enrichedServer.filter((item) => canUserViewItem(item, user));
        }

        setItems(enrichedServer);
        setCachedData(storageKey, enrichedServer);
      }
    } catch (err: any) {
      console.warn("fetchItems exception, fallback to cache:", err);
      const cached = getCachedData<any[]>(storageKey, []).map(enrichSHSItem);
      const filteredCached = !isAdmin && !isPengurusBarang
        ? cached.filter((i) => canUserViewItem(i, user))
        : cached;
      setItems(filteredCached);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user, isAdmin, isPengurusBarang]);

  // Fetch Periods from Supabase
  const fetchPeriods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("shs_periods")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setPeriods(data as SHSPeriod[]);
        setCachedData(PERIODS_STORAGE_KEY, data);
      }
    } catch {
      // ignore, fallback to cache
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchPeriods();
    fetchMasterData();

    // Realtime subscription — auto-sync saat ada perubahan di database
    const channel = supabase
      .channel("realtime-shs-items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shs_items" },
        () => fetchItems(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shs_periods" },
        () => fetchPeriods()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems, fetchPeriods, fetchMasterData]);

  // Sync Master Data to LocalStorage whenever updated
  const updateMasterKategori = (newKat: MasterKategori[]) => {
    setMasterKategori(newKat);
    setCachedData(MASTER_KAT_KEY, newKat);
    setDynamicMasterKategori(newKat);
  };
  const updateMasterRekening = (newRek: MasterRekening[]) => {
    setMasterRekening(newRek);
    setCachedData(MASTER_REK_KEY, newRek);
    setDynamicMasterRekening(newRek);
  };
  const updateMasterSatuan = (newSat: MasterSatuan[]) => {
    setMasterSatuan(newSat);
    setCachedData(MASTER_SAT_KEY, newSat);
  };
  const updateMasterKelompok = (newKel: MasterKelompok[]) => {
    setMasterKelompok(newKel);
    setCachedData(MASTER_KEL_KEY, newKel);
  };

  // Simpan / Perbarui Periode (Admin)
  const savePeriod = async (periodData: SHSPeriod) => {
    try {
      const updatedList = periods.map((p) =>
        p.id === periodData.id ? periodData : { ...p, aktif: periodData.aktif ? false : p.aktif }
      );
      if (!periods.some((p) => p.id === periodData.id)) {
        updatedList.unshift(periodData);
      }
      setPeriods(updatedList);
      setCachedData(PERIODS_STORAGE_KEY, updatedList);

      // Attempt Supabase upsert
      const { error } = await supabase.from("shs_periods").upsert(periodData);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Pengaturan periode pengusulan SHS berhasil disimpan." });
      return true;
    } catch (e: any) {
      setPeriods(periods);
      setCachedData(PERIODS_STORAGE_KEY, periods);
      toast({ title: "Gagal menyimpan periode", description: e.message, variant: "destructive" });
      return false;
    }
  };

  // Tambah Item Usulan (Draft atau Langsung Diajukan)
  const createItem = async (
    itemData: Omit<SHSItem, "id" | "created_at" | "updated_at">
  ): Promise<boolean> => {
    // Validasi Periode: Cek waktu detik ini secara instan
    if (!checkIsPeriodOpenNow()) {
      toast({
        title: "Batas Waktu Pengusulan Berakhir",
        description: `Waktu pengusulan telah berakhir pada ${activePeriod?.tutup_at ? new Date(activePeriod.tutup_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : ""}. Input usulan baru tidak lagi diterima.`,
        variant: "destructive",
      });
      return false;
    }

    const nowIso = new Date().toISOString();
    const isDirectSubmitted = itemData.status === "diajukan";
    const initialCatatan = isDirectSubmitted
      ? serializeVerificationData(null, null, null, nowIso, itemData.nama_pengusul)
      : itemData.catatan_verifikator || null;

    const newItem: SHSItem = {
      ...itemData,
      kategori_nama: itemData.kategori_nama || getKategoriNama(itemData.kode_kategori),
      id: generateUUID(),
      catatan_verifikator: initialCatatan,
      submitted_at: isDirectSubmitted ? nowIso : null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Optimistic state
    const nextItems = [newItem, ...items];
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      const cleanItem = {
        ...sanitizeItemForSupabase(newItem),
        id: newItem.id,
        created_at: newItem.created_at,
      };

      const { error } = await supabase.from("shs_items").insert(cleanItem);
      if (error) {
        setItems(items);
        setCachedData(itemsStorageKey, items);
        console.error("Supabase insert error:", error);
        toast({
          title: "Gagal Menyimpan ke Database",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      toast({
        title: newItem.status === "diajukan" ? "Usulan Diajukan" : "Draft Disimpan",
        description: `Usulan "${newItem.uraian}" berhasil disimpan.`,
      });
      return true;
    } catch (e: any) {
      // Rollback optimistic update — data gagal disimpan ke database
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Menyimpan",
        description: `Koneksi ke database gagal: ${e.message}. Silakan coba lagi.`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Tambah Batch / Banyak Usulan Sekaligus (Draft atau Langsung Diajukan)
  const createBatchItems = async (
    itemsList: Omit<SHSItem, "id" | "created_at" | "updated_at">[]
  ): Promise<boolean> => {
    if (itemsList.length === 0) return false;

    if (!checkIsPeriodOpenNow()) {
      toast({
        title: "Batas Waktu Pengusulan Berakhir",
        description: `Waktu pengusulan telah berakhir pada ${activePeriod?.tutup_at ? new Date(activePeriod.tutup_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : ""}. Input usulan baru tidak lagi diterima.`,
        variant: "destructive",
      });
      return false;
    }

    const nowIso = new Date().toISOString();
    const preparedItems: SHSItem[] = itemsList.map((item) => {
      const isDirectSubmitted = item.status === "diajukan";
      const initialCatatan = isDirectSubmitted
        ? serializeVerificationData(null, null, null, nowIso, item.nama_pengusul)
        : item.catatan_verifikator || null;
      return {
        ...item,
        kategori_nama: item.kategori_nama || getKategoriNama(item.kode_kategori),
        id: generateUUID(),
        catatan_verifikator: initialCatatan,
        submitted_at: isDirectSubmitted ? nowIso : null,
        created_at: nowIso,
        updated_at: nowIso,
      };
    });

    const cleanPrepared = preparedItems.map((it) => ({
      ...sanitizeItemForSupabase(it),
      id: it.id,
      created_at: it.created_at,
    }));

    const nextItems = [...preparedItems, ...items];
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      const { error } = await supabase.from("shs_items").insert(cleanPrepared);
      if (error) {
        setItems(items);
        setCachedData(itemsStorageKey, items);
        console.error("Supabase batch insert error:", error);
        toast({
          title: "Gagal Menyimpan ke Database",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
    } catch (e: any) {
      // Rollback optimistic update
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Menyimpan ke Database",
        description: `Koneksi gagal: ${e.message}. Silakan coba lagi.`,
        variant: "destructive",
      });
      return false;
    }

    const targetStatus = preparedItems[0]?.status || "diajukan";
    toast({
      title: targetStatus === "diajukan" ? "Usulan Berhasil Diajukan" : "Draft Disimpan",
      description: `Sebanyak ${preparedItems.length} usulan barang berhasil disimpan ke dalam sistem.`,
    });
    return true;
  };

  // Import Massal dari File Excel / CSV
  const importItems = async (
    newItemsList: Omit<SHSItem, "id" | "created_at" | "updated_at">[]
  ): Promise<number> => {
    if (!checkIsPeriodOpenNow()) {
      toast({
        title: "Batas Waktu Pengusulan Berakhir",
        description: `Batas waktu pengusulan telah berakhir pada ${activePeriod?.tutup_at ? new Date(activePeriod.tutup_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : ""}. Import berkas ditolak.`,
        variant: "destructive",
      });
      return 0;
    }

    const preparedItems: SHSItem[] = newItemsList.map((item) => ({
      ...item,
      kategori_nama: item.kategori_nama || getKategoriNama(item.kode_kategori),
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const cleanPrepared = preparedItems.map((newItem) => ({
      ...newItem,
      spek: newItem.spek || "",
      rekening_1: newItem.rekening_1 || "",
      rekening_2: newItem.rekening_2 || null,
      rekening_3: newItem.rekening_3 || null,
      link_katalog_1: newItem.link_katalog_1 || "",
      link_katalog_2: newItem.link_katalog_2 || null,
      link_katalog_3: newItem.link_katalog_3 || null,
      tkdn_1: !isNaN(Number(newItem.tkdn_1)) ? Number(newItem.tkdn_1) : 0,
      tkdn_2: newItem.tkdn_2 !== undefined && newItem.tkdn_2 !== null && (newItem.tkdn_2 as any) !== "" && !isNaN(Number(newItem.tkdn_2)) ? Number(newItem.tkdn_2) : null,
      tkdn_3: newItem.tkdn_3 !== undefined && newItem.tkdn_3 !== null && (newItem.tkdn_3 as any) !== "" && !isNaN(Number(newItem.tkdn_3)) ? Number(newItem.tkdn_3) : null,
    }));

    const nextItems = [...preparedItems, ...items];
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      const { error: importError } = await supabase.from("shs_items").insert(cleanPrepared);
      if (importError) {
        setItems(items);
        setCachedData(itemsStorageKey, items);
        toast({
          title: "Gagal Import ke Database",
          description: importError.message,
          variant: "destructive",
        });
        return 0;
      }
    } catch (e: any) {
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Import ke Database",
        description: `Koneksi gagal: ${e.message}. Silakan coba lagi.`,
        variant: "destructive",
      });
      return 0;
    }

    toast({
      title: "Import Berhasil",
      description: `${preparedItems.length} item usulan berhasil dimasukkan sebagai Draft.`,
    });
    return preparedItems.length;
  };

  // Update Item
  const updateItem = async (
    id: string,
    payload: Partial<SHSItem>
  ): Promise<boolean> => {
    const existing = items.find((i) => i.id === id);
    if (!existing) return false;

    // 1. Cek Hak Akses Kepemilikan (Bidang lain TIDAK BISA mengedit punya bidang lain!)
    const isOwner = isItemOwner(existing, user);
    if (!isAdmin && !isOwner) {
      toast({
        title: "Akses Ditolak",
        description: `Anda tidak memiliki hak akses untuk mengedit usulan milik ${existing.unit_kerja}.`,
        variant: "destructive",
      });
      return false;
    }

    // 2. Kunci Status: Usulan yang sedang diajukan atau diperbaiki terkunci dari edit sebelum ada keputusan verifikator!
    if (!isAdmin && (existing.status === "diajukan" || existing.status === "diperbaiki")) {
      toast({
        title: "Usulan Sedang Diverifikasi (Terkunci)",
        description: "Usulan yang telah diajukan atau diperbaiki terkunci dan tidak dapat diedit selama proses verifikasi. Tunggu keputusan verifikator (perlu perbaikan / ditolak) terlebih dahulu.",
        variant: "destructive",
      });
      return false;
    }

    if (!isAdmin && existing.status === "disetujui") {
      toast({
        title: "Usulan Telah Disetujui Penuh",
        description: "Usulan yang telah disetujui penuh tidak dapat diedit lagi.",
        variant: "destructive",
      });
      return false;
    }

    // 3. Batas Waktu Periode: Jika periode ditutup, pengusulan baru dikunci.
    // Namun usulan yang berstatus 'perlu_perbaikan' TETAP BISA diedit dan diperbaiki!
    if (!checkIsPeriodOpenNow() && existing.status !== "perlu_perbaikan" && existing.status !== "ditolak" && !isAdmin) {
      toast({
        title: "Batas Waktu Pengusulan Berakhir",
        description: "Periode pengusulan telah ditutup. Usulan baru tidak dapat disimpan. Usulan perbaikan tetap dapat diperbaiki.",
        variant: "destructive",
      });
      return false;
    }

    const nowIso = new Date().toISOString();
    const existingVerif = parseVerificationData(existing);
    let updatedCatatan = payload.catatan_verifikator !== undefined ? payload.catatan_verifikator : existing.catatan_verifikator;
    let submittedAt = existing.submitted_at;
    let finalStatus: SHSStatus = (payload.status as SHSStatus) || existing.status;
    let isRevisi = Boolean(existing.is_revisi || existingVerif.is_revisi);
    let revisiKe = existing.revisi_ke || existingVerif.revisi_ke || 0;
    let revisiAt = existing.revisi_at || existingVerif.revisi_at || null;
    let catatanPerbaikan = payload.catatan_perbaikan !== undefined ? payload.catatan_perbaikan : (existing.catatan_perbaikan || existingVerif.catatan_perbaikan || null);
    let previousAdmin = existingVerif.previous_admin || null;
    let previousPengurus = existingVerif.previous_pengurus || null;

    // Deteksi jika usulan merupakan hasil perbaikan dari penolakan / perlu perbaikan
    const isSubmittingRevision =
      payload.status === "diperbaiki" ||
      ((payload.status === "diajukan" || payload.status === undefined) &&
        (existing.status === "perlu_perbaikan" || existing.status === "ditolak"));

    if (isSubmittingRevision && payload.status !== "draft") {
      finalStatus = "diperbaiki";
      isRevisi = true;
      revisiKe = (existingVerif.revisi_ke || existing.revisi_ke || 0) + 1;
      revisiAt = nowIso;
      submittedAt = nowIso;
      if (existingVerif.admin) previousAdmin = existingVerif.admin;
      if (existingVerif.pengurus) previousPengurus = existingVerif.pengurus;

      updatedCatatan = serializeVerificationData(
        null,
        null,
        null,
        nowIso,
        user?.username || existing.nama_pengusul,
        {
          is_revisi: true,
          revisi_ke: revisiKe,
          revisi_at: revisiAt,
          catatan_perbaikan: catatanPerbaikan || "Usulan telah diperbaiki oleh pengusul.",
          previous_admin: previousAdmin,
          previous_pengurus: previousPengurus,
        }
      );
    } else if (payload.status === "diajukan" && !isRevisi) {
      submittedAt = nowIso;
      finalStatus = "diajukan";
      updatedCatatan = serializeVerificationData(null, null, null, nowIso, user?.username || existing.nama_pengusul);
    }

    const updated: SHSItem = {
      ...existing,
      ...payload,
      status: finalStatus,
      is_revisi: isRevisi,
      revisi_ke: revisiKe,
      revisi_at: revisiAt,
      catatan_perbaikan: catatanPerbaikan,
      previous_admin: previousAdmin,
      previous_pengurus: previousPengurus,
      submitted_at: submittedAt,
      catatan_verifikator: updatedCatatan,
      verifikasi_admin: (finalStatus === "diperbaiki" || finalStatus === "diajukan") ? null : (payload.verifikasi_admin !== undefined ? payload.verifikasi_admin : existing.verifikasi_admin),
      verifikasi_pengurus: (finalStatus === "diperbaiki" || finalStatus === "diajukan") ? null : (payload.verifikasi_pengurus !== undefined ? payload.verifikasi_pengurus : existing.verifikasi_pengurus),
      kategori_nama:
        payload.kategori_nama ||
        (payload.kode_kategori ? getKategoriNama(payload.kode_kategori) : existing.kategori_nama),
      updated_at: nowIso,
    };

    const nextItems = items.map((i) => (i.id === id ? updated : i));
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      const cleanUpdate = sanitizeItemForSupabase(updated);
      const { error } = await supabase.from("shs_items").update(cleanUpdate).eq("id", id);
      if (error) {
        setItems(items);
        setCachedData(itemsStorageKey, items);
        console.error("Supabase update error:", error);
        toast({
          title: "Gagal Memperbarui Database",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      if (finalStatus === "diperbaiki") {
        toast({
          title: `Usulan Diperbaiki (Revisi #${revisiKe}) ✨`,
          description: `Usulan "${updated.uraian}" berhasil diperbaiki dan diteruskan ke Verifikator.`,
        });
      } else {
        toast({ title: "Berhasil", description: "Data usulan berhasil diperbarui." });
      }
      return true;
    } catch (e: any) {
      // Rollback optimistic update
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Memperbarui",
        description: `Koneksi ke database gagal: ${e.message}. Silakan coba lagi.`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Hapus Item
  const deleteItem = async (id: string): Promise<boolean> => {
    const existing = items.find((i) => i.id === id);
    if (!existing) return false;

    // 1. Cek Hak Akses Kepemilikan
    const isOwner = isItemOwner(existing, user);
    if (!isAdmin && !isOwner) {
      toast({
        title: "Akses Ditolak",
        description: `Anda tidak memiliki izin menghapus usulan milik ${existing.unit_kerja}.`,
        variant: "destructive",
      });
      return false;
    }

    // 2. Kunci Status: Usulan yang diajukan, diperbaiki, atau disetujui tidak boleh dihapus sembarangan
    if (!isAdmin && (existing.status === "diajukan" || existing.status === "diperbaiki" || existing.status === "disetujui")) {
      toast({
        title: "Gagal Menghapus",
        description: `Usulan yang berstatus ${existing.status} tidak dapat dihapus oleh pengusul. Hanya draf awal atau usulan yang ditolak yang dapat dihapus.`,
        variant: "destructive",
      });
      return false;
    }

    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      const { error } = await supabase.from("shs_items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Terhapus", description: "Usulan berhasil dihapus." });
      return true;
    } catch (e: any) {
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Menghapus",
        description: e?.message ? `Database: ${e.message}` : "Gagal menghapus data dari database.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Ajukan Draft / Kirim Usulan (Satu per satu atau Massal)
  const submitDrafts = async (ids: string[]): Promise<boolean> => {
    const targetItems = items.filter((i) => ids.includes(i.id));
    const hasNewDrafts = targetItems.some((i) => i.status === "draft");

    // Jika periode ditutup: Usulan baru (draft) TIDAK BISA diajukan.
    // Namun usulan hasil perbaikan (revisi) TETAP BISA diajukan kapan saja!
    if (hasNewDrafts && !checkIsPeriodOpenNow() && !isAdmin) {
      toast({
        title: "Batas Waktu Pengusulan Baru Berakhir",
        description: `Batas waktu pengusulan baru telah berakhir pada ${activePeriod?.tutup_at ? new Date(activePeriod.tutup_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : ""}. Pengajuan usulan baru ditolak. Usulan perbaikan (revisi) tetap dapat dikirimkan.`,
        variant: "destructive",
      });
      return false;
    }

    const nowIso = new Date().toISOString();
    let revisedCount = 0;
    let initialCount = 0;

    const nextItems = items.map((i) => {
      if (ids.includes(i.id) && (i.status === "draft" || i.status === "perlu_perbaikan" || i.status === "ditolak")) {
        const isRevising = i.status === "perlu_perbaikan" || i.status === "ditolak" || i.is_revisi;
        const revKe = isRevising ? ((i.revisi_ke || 0) + 1) : undefined;
        const newStatus: SHSStatus = isRevising ? "diperbaiki" : "diajukan";
        if (isRevising) revisedCount++; else initialCount++;

        const existingVerif = parseVerificationData(i);
        const serialized = serializeVerificationData(
          null,
          null,
          null,
          nowIso,
          user?.username || i.nama_pengusul,
          isRevising
            ? {
                is_revisi: true,
                revisi_ke: revKe,
                revisi_at: nowIso,
                catatan_perbaikan: i.catatan_perbaikan || "Usulan diperbaiki dan diajukan kembali.",
                previous_admin: existingVerif.admin,
                previous_pengurus: existingVerif.pengurus,
              }
            : undefined
        );

        return {
          ...i,
          status: newStatus,
          is_revisi: isRevising,
          revisi_ke: revKe,
          revisi_at: isRevising ? nowIso : i.revisi_at,
          submitted_at: nowIso,
          verifikasi_admin: null,
          verifikasi_pengurus: null,
          catatan_verifikator: serialized,
          verifikator_name: null,
          verified_at: null,
          updated_at: nowIso,
        };
      }
      return i;
    });

    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      for (const id of ids) {
        const target = nextItems.find((it) => it.id === id);
        if (!target) continue;
        const cleanItem = sanitizeItemForSupabase(target);
        const { error } = await supabase
          .from("shs_items")
          .update(cleanItem)
          .eq("id", id);
        if (error) throw error;
      }
      toast({
        title: "Usulan Berhasil Dikirim",
        description: `${ids.length} usulan telah dikirim ke Tim Verifikator (${revisedCount} diperbaiki, ${initialCount} usulan baru).`,
      });
      return true;
    } catch (e: any) {
      // Rollback optimistic update
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Mengirim Usulan",
        description: e?.message ? `Database: ${e.message}` : `Koneksi ke database gagal. Silakan coba lagi.`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Verifikasi Item (Dual Verifikator: Admin Dinkes & Pengurus Barang)
  const verifyItem = async (
    id: string,
    keputusan: "disetujui" | "perlu_perbaikan" | "ditolak",
    catatan: string,
    verifikatorName: string
  ): Promise<boolean> => {
    if ((keputusan === "perlu_perbaikan" || keputusan === "ditolak") && !catatan.trim()) {
      toast({
        title: "Catatan Wajib Diisi",
        description: "Harap masukkan catatan telaah/alasan untuk keputusan ini.",
        variant: "destructive",
      });
      return false;
    }

    const target = items.find((i) => i.id === id);
    if (!target) return false;

    const existingVerif = parseVerificationData(target);
    const nowIso = new Date().toISOString();

    const currentDecision: VerifierDecision = {
      status: keputusan,
      catatan: catatan.trim() || null,
      verifikator_name: verifikatorName,
      verified_at: nowIso,
    };

    let nextAdmin = existingVerif.admin;
    let nextPengurus = existingVerif.pengurus;

    if (isPengurusBarang) {
      nextPengurus = currentDecision;
    } else {
      nextAdmin = currentDecision;
    }

    const { status: nextStatus, verifikator_name: nextVerifName } = computeOverallStatus(
      nextAdmin,
      nextPengurus,
      target.status
    );

    const serializedCatatan = serializeVerificationData(
      nextAdmin,
      nextPengurus,
      catatan.trim() || null,
      existingVerif.submitted_at,
      existingVerif.submitted_by,
      {
        is_revisi: existingVerif.is_revisi,
        revisi_ke: existingVerif.revisi_ke,
        revisi_at: existingVerif.revisi_at,
        catatan_perbaikan: existingVerif.catatan_perbaikan,
        previous_admin: existingVerif.previous_admin,
        previous_pengurus: existingVerif.previous_pengurus,
      }
    );

    // PostgreSQL check constraint (shs_items_status_check) hanya mengizinkan:
    // 'draft', 'diajukan', 'disetujui', 'perlu_perbaikan', 'ditolak'.
    // Status 'diperbaiki' adalah status virtual UI/frontend, sehingga harus di-map ke 'diajukan' untuk database.
    const dbStatus = nextStatus === "diperbaiki" ? "diajukan" : nextStatus;

    const payload = {
      status: dbStatus,
      catatan_verifikator: serializedCatatan,
      verifikator_name: nextVerifName,
      verified_at: nowIso,
      updated_at: nowIso,
    };

    const nextItems = items.map((i) =>
      i.id === id
        ? {
            ...i,
            ...payload,
            status: nextStatus,
            verifikasi_admin: nextAdmin,
            verifikasi_pengurus: nextPengurus,
          }
        : i
    );
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      const { error } = await supabase.from("shs_items").update(payload).eq("id", id);
      if (error) {
        throw error;
      }

      if (nextStatus === "disetujui") {
        toast({
          title: "Usulan Disetujui Penuh (2/2) ✓",
          description: "Kedua verifikator (Admin Dinkes & Pengurus Barang) telah menyetujui usulan ini.",
        });
      } else if (keputusan === "disetujui") {
        toast({
          title: isPengurusBarang
            ? "Disetujui Pengurus Barang (1/2)"
            : "Disetujui Admin Dinkes (1/2)",
          description: isPengurusBarang
            ? "Menunggu persetujuan Admin Dinkes agar usulan berstatus Disetujui Penuh."
            : "Menunggu persetujuan Pengurus Barang agar usulan berstatus Disetujui Penuh.",
        });
      } else if (keputusan === "perlu_perbaikan") {
        toast({
          title: "Usulan Dikembalikan ke Pengusul",
          description: `Catatan perbaikan telah dikirim ke ${target.unit_kerja}.`,
        });
      } else {
        toast({
          title: "Usulan Ditolak",
          description: "Usulan telah ditolak oleh verifikator.",
          variant: "destructive",
        });
      }
      return true;
    } catch (e: any) {
      // Rollback optimistic update
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Menyimpan Verifikasi",
        description: e?.message ? `Database: ${e.message}` : `Koneksi ke database gagal. Silakan coba lagi.`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Setujui Massal (Dual Verifikator)
  const bulkApprove = async (ids: string[], verifikatorName: string): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    let fullyApprovedCount = 0;
    let partialApprovedCount = 0;

    const updates: { id: string; payload: any; enriched: Partial<SHSItem> }[] = [];

    ids.forEach((id) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;

      const parsedVerif = parseVerificationData(target);
      const decision: VerifierDecision = {
        status: "disetujui",
        catatan: null,
        verifikator_name: verifikatorName,
        verified_at: nowIso,
      };

      let nextAdmin = parsedVerif.admin;
      let nextPengurus = parsedVerif.pengurus;

      if (isPengurusBarang) {
        nextPengurus = decision;
      } else {
        nextAdmin = decision;
      }

      const { status: nextStatus, verifikator_name: nextVerifName } = computeOverallStatus(
        nextAdmin,
        nextPengurus,
        target.status
      );

      if (nextStatus === "disetujui") {
        fullyApprovedCount++;
      } else {
        partialApprovedCount++;
      }

      const serializedCatatan = serializeVerificationData(
        nextAdmin,
        nextPengurus,
        null,
        parsedVerif.submitted_at,
        parsedVerif.submitted_by,
        {
          is_revisi: parsedVerif.is_revisi,
          revisi_ke: parsedVerif.revisi_ke,
          revisi_at: parsedVerif.revisi_at,
          catatan_perbaikan: parsedVerif.catatan_perbaikan,
          previous_admin: parsedVerif.previous_admin,
          previous_pengurus: parsedVerif.previous_pengurus,
        }
      );
      // PostgreSQL check constraint (shs_items_status_check) hanya mengizinkan:
      // 'draft', 'diajukan', 'disetujui', 'perlu_perbaikan', 'ditolak'.
      // Status 'diperbaiki' adalah status virtual UI/frontend, sehingga harus di-map ke 'diajukan' untuk database.
      const dbStatus = nextStatus === "diperbaiki" ? "diajukan" : nextStatus;

      const payload = {
        status: dbStatus,
        catatan_verifikator: serializedCatatan,
        verifikator_name: nextVerifName,
        verified_at: nowIso,
        updated_at: nowIso,
      };

      updates.push({
        id,
        payload,
        enriched: {
          ...payload,
          status: nextStatus,
          verifikasi_admin: nextAdmin,
          verifikasi_pengurus: nextPengurus,
        },
      });
    });

    const updateMap = new Map(updates.map((u) => [u.id, u.enriched]));
    const nextItems = items.map((i) => (updateMap.has(i.id) ? { ...i, ...updateMap.get(i.id) } : i));
    setItems(nextItems);
    setCachedData(itemsStorageKey, nextItems);

    try {
      for (const u of updates) {
        const { error } = await supabase.from("shs_items").update(u.payload).eq("id", u.id);
        if (error) {
          throw error;
        }
      }
      toast({
        title: "Persetujuan Massal Berhasil",
        description: `${ids.length} usulan diproses (${fullyApprovedCount} disetujui penuh 2/2, ${partialApprovedCount} menunggu verifikator mitra 1/2).`,
      });
      return true;
    } catch (e: any) {
      // Rollback optimistic update
      setItems(items);
      setCachedData(itemsStorageKey, items);
      toast({
        title: "Gagal Menyimpan Persetujuan",
        description: e?.message ? `Database: ${e.message}` : `Koneksi ke database gagal. Silakan coba lagi.`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Rekapitulasi Statistik
  const recapStats = useMemo<SHSRecapStats>(() => {
    let total = 0;
    let draft = 0;
    let diajukan = 0;
    let diperbaiki = 0;
    let disetujui = 0;
    let perlu_perbaikan = 0;
    let ditolak = 0;
    let totalAnggaran = 0;
    let totalAnggaranDisetujui = 0;

    items.forEach((item) => {
      total += 1;
      const t = Number(item.total) || 0;
      totalAnggaran += t;

      if (item.status === "draft") draft += 1;
      else if (item.status === "diperbaiki") diperbaiki += 1;
      else if (item.status === "diajukan") diajukan += 1;
      else if (item.status === "disetujui") {
        disetujui += 1;
        totalAnggaranDisetujui += t;
      } else if (item.status === "perlu_perbaikan") perlu_perbaikan += 1;
      else if (item.status === "ditolak") ditolak += 1;
    });

    return {
      total,
      draft,
      diajukan,
      diperbaiki,
      disetujui,
      perlu_perbaikan,
      ditolak,
      totalAnggaran,
      totalAnggaranDisetujui,
    };
  }, [items]);

  return {
    items,
    periods,
    activePeriod,
    periodStatus,
    isLoading,
    masterKategori,
    masterRekening,
    masterSatuan,
    masterKelompok,
    recapStats,
    isDatabaseMasterConnected,
    isSyncingMasters,
    fetchMasterData,
    addMasterKategori,
    deleteMasterKategori,
    addMasterRekening,
    deleteMasterRekening,
    syncAllMastersToDatabase,
    fetchItems,
    createItem,
    createBatchItems,
    importItems,
    updateItem,
    deleteItem,
    submitDrafts,
    verifyItem,
    bulkApprove,
    savePeriod,
    updateMasterKategori,
    updateMasterRekening,
    updateMasterSatuan,
    updateMasterKelompok,
  };
};
