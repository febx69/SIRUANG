// src/hooks/usePBPU.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from './useSupabaseAuth';
import { toast } from '@/components/ui/use-toast';
import {
  PBPUSubmission,
  PBPUSubmissionPayload,
  PBPUVerificationStatus,
  PBPUNikStatus,
  PBPUDocument,
  PBPUNikHistory,
  PBPUStatusHistory,
} from '@/types/pbpu';

const STORAGE_KEY = 'siruang_pbpu_submissions_cache';

// Helper Generator RFC4122 v4 UUID yang kompatibel di semua lingkungan (insecure context/file://)
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getLocalSubmissions = (): PBPUSubmission[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalSubmissions = (data: PBPUSubmission[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving PBPU submissions to localStorage', e);
  }
};

export const usePBPU = (user: User | null) => {
  const [submissions, setSubmissions] = useState<PBPUSubmission[]>(() => getLocalSubmissions());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all submissions from Supabase with fallback
  const fetchSubmissions = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const { data: subData, error: subError } = await supabase
        .from('pbpu_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subError) throw subError;

      if (subData && subData.length >= 0) {
        // Fetch related documents, nik_history, status_history in parallel
        const [docsRes, nikHistRes, statHistRes] = await Promise.all([
          supabase.from('pbpu_documents').select('*').order('created_at', { ascending: true }),
          supabase.from('pbpu_nik_history').select('*').order('created_at', { ascending: false }),
          supabase.from('pbpu_status_history').select('*').order('created_at', { ascending: false }),
        ]);

        const allDocs: PBPUDocument[] = docsRes.data || [];
        const allNikHist: PBPUNikHistory[] = nikHistRes.data || [];
        const allStatHist: PBPUStatusHistory[] = statHistRes.data || [];

        const enriched: PBPUSubmission[] = subData.map((s: any) => ({
          ...s,
          documents: allDocs.filter((d) => d.submission_id === s.id),
          nik_history: allNikHist.filter((nh) => nh.submission_id === s.id),
          status_history: allStatHist.filter((sh) => sh.submission_id === s.id),
        }));

        setSubmissions(enriched);
        saveLocalSubmissions(enriched);
      }
    } catch (err: any) {
      console.warn('Supabase PBPU table fetch notice (using cache/local fallback):', err.message);
      // Fallback ke local cache
      const cached = getLocalSubmissions();
      setSubmissions(cached);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();

    // Setup Supabase Realtime channel
    const channel = supabase
      .channel('realtime-pbpu')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pbpu_submissions' },
        () => fetchSubmissions(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubmissions]);

  // Generate Unique Registration No: PBPU-YYYYMM-XXXX
  const generateRegNo = useCallback(() => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PBPU-${yyyymm}-${rand}`;
  }, []);

  // 1. BUAT USULAN BARU (PIC Puskesmas / Dinsos)
  const submitNewApplication = async (payload: PBPUSubmissionPayload): Promise<{ success: boolean; regNo?: string; error?: string }> => {
    if (!user) return { success: false, error: 'User belum login' };
    setIsSubmitting(true);

    try {
      // Validasi NIK 16 digit
      const cleanNik = payload.nik.trim();
      if (!/^\d{16}$/.test(cleanNik)) {
        throw new Error('NIK harus terdiri dari tepat 16 digit angka.');
      }

      // Validasi KK jika diisi
      if (payload.no_kk && payload.no_kk.trim()) {
        const cleanKk = payload.no_kk.trim();
        if (!/^\d{16}$/.test(cleanKk)) {
          throw new Error('Nomor KK harus tepat 16 digit angka jika diisi.');
        }
      }

      // Validasi Dokumen sesuai Jalur & Kategori (Bagian 6 PRD)
      const docTypes = payload.attachedDocuments.map((d) => d.document_type);
      const hasIdCard = docTypes.includes('KK') || docTypes.includes('KTP');
      if (!hasIdCard) {
        throw new Error('Dokumen Identitas (KK atau KTP) wajib diunggah.');
      }

      if (payload.submission_channel === 'PUSKESMAS') {
        if (!payload.condition_category) {
          throw new Error('Kategori kondisi wajib dipilih untuk jalur Puskesmas.');
        }
        if (payload.condition_category.includes('Kondisi Tertentu')) {
          if (!docTypes.includes('DIAGNOSA_DPJP')) {
            throw new Error('Surat Keterangan Diagnosa DPJP wajib diunggah untuk kategori Kondisi Tertentu.');
          }
        } else {
          if (!docTypes.includes('SKTM')) {
            throw new Error('SKTM wajib diunggah untuk masyarakat sakit di luar kondisi tertentu.');
          }
        }
      } else if (payload.submission_channel === 'DINSOS') {
        if (!payload.desil || payload.desil < 1 || payload.desil > 5) {
          throw new Error('Tingkatan Desil (1–5) wajib dipilih untuk jalur Dinas Sosial.');
        }
        if (!docTypes.includes('BUKTI_DESIL')) {
          throw new Error('Bukti Desil 1–5 wajib diunggah untuk jalur Dinas Sosial.');
        }
      }

      const regNo = generateRegNo();
      const submissionId = generateUUID();
      const nowStr = new Date().toISOString();

      const newDocs: PBPUDocument[] = payload.attachedDocuments.map((doc) => ({
        id: generateUUID(),
        submission_id: submissionId,
        document_type: doc.document_type,
        file_name: doc.file_name,
        file_url: doc.file_url,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        uploaded_by: user.username,
        created_at: nowStr,
      }));

      const newSubmissionRecord: PBPUSubmission = {
        id: submissionId,
        registration_no: regNo,
        applicant_name: payload.applicant_name.trim(),
        nik: cleanNik,
        no_kk: payload.no_kk?.trim() || null,
        birth_place: payload.birth_place.trim(),
        birth_date: payload.birth_date,
        gender: payload.gender,
        address: payload.address.trim(),
        village: payload.village.trim(),
        district: payload.district,
        phone: payload.phone?.trim() || null,

        submission_channel: payload.submission_channel,
        submitter_username: user.username,
        submitter_email: null,
        submitter_unit: payload.submitter_unit || user.username,

        condition_category: payload.condition_category || null,
        health_facility: payload.health_facility || null,
        dpjp_name: payload.dpjp_name || null,
        desil: payload.desil || null,

        nik_status: payload.nik_status,
        nik_followup_note: payload.nik_status === 'BERMASALAH' ? 'Perlu tindak lanjut Dukcapil' : null,

        verification_status: 'MENUNGGU',
        rejection_reason: null,
        verifier_username: null,
        verifier_note: null,
        verified_at: null,

        notes: payload.notes || null,
        created_at: nowStr,
        updated_at: nowStr,

        documents: newDocs,

        nik_history:
          payload.nik_status === 'BERMASALAH'
            ? [
                {
                  id: generateUUID(),
                  submission_id: submissionId,
                  old_status: 'BERMASALAH',
                  new_status: 'BERMASALAH',
                  note: 'Pemeriksaan status NIK awal: Bermasalah saat pengajuan',
                  updated_by: user.username,
                  created_at: nowStr,
                },
              ]
            : [],

        status_history: [
          {
            id: generateUUID(),
            submission_id: submissionId,
            old_status: 'MENUNGGU',
            new_status: 'MENUNGGU',
            reason_or_note: 'Usulan baru diajukan ke Dinas Kesehatan',
            changed_by: user.username,
            created_at: nowStr,
          },
        ],
      };

      // 1. Simpan ke Supabase (Wajib sukses sebelum disimpan ke cache lokal)
      const { error: dbError } = await supabase.from('pbpu_submissions').insert([
        {
          id: newSubmissionRecord.id,
          registration_no: newSubmissionRecord.registration_no,
          applicant_name: newSubmissionRecord.applicant_name,
          nik: newSubmissionRecord.nik,
          no_kk: newSubmissionRecord.no_kk,
          birth_place: newSubmissionRecord.birth_place,
          birth_date: newSubmissionRecord.birth_date,
          gender: newSubmissionRecord.gender,
          address: newSubmissionRecord.address,
          village: newSubmissionRecord.village,
          district: newSubmissionRecord.district,
          phone: newSubmissionRecord.phone,
          submission_channel: newSubmissionRecord.submission_channel,
          submitter_username: newSubmissionRecord.submitter_username,
          submitter_unit: newSubmissionRecord.submitter_unit,
          condition_category: newSubmissionRecord.condition_category,
          health_facility: newSubmissionRecord.health_facility,
          dpjp_name: newSubmissionRecord.dpjp_name,
          desil: newSubmissionRecord.desil,
          nik_status: newSubmissionRecord.nik_status,
          nik_followup_note: newSubmissionRecord.nik_followup_note,
          verification_status: 'MENUNGGU',
          notes: newSubmissionRecord.notes,
          created_at: nowStr,
          updated_at: nowStr,
        },
      ]);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Insert Dokumen dengan ID UUID yang valid
      if (newDocs.length > 0) {
        const { error: dErr } = await supabase.from('pbpu_documents').insert(
          newDocs.map((d) => ({
            id: d.id,
            submission_id: d.submission_id,
            document_type: d.document_type,
            file_name: d.file_name,
            file_url: d.file_url,
            file_size: d.file_size,
            mime_type: d.mime_type,
            uploaded_by: d.uploaded_by,
            created_at: d.created_at,
          }))
        );
        if (dErr) {
          throw new Error(`Dokumen database error: ${dErr.message}`);
        }
      }

      // Insert Status History
      const { error: sErr } = await supabase.from('pbpu_status_history').insert([
        {
          id: generateUUID(),
          submission_id: newSubmissionRecord.id,
          old_status: 'MENUNGGU',
          new_status: 'MENUNGGU',
          reason_or_note: 'Usulan baru diajukan ke Dinas Kesehatan',
          changed_by: user.username,
          created_at: nowStr,
        },
      ]);
      if (sErr) {
        throw new Error(`Status history database error: ${sErr.message}`);
      }

      // Insert NIK History if Bermasalah
      if (payload.nik_status === 'BERMASALAH') {
        const { error: nErr } = await supabase.from('pbpu_nik_history').insert([
          {
            id: generateUUID(),
            submission_id: newSubmissionRecord.id,
            old_status: 'BERMASALAH',
            new_status: 'BERMASALAH',
            note: 'Pemeriksaan status NIK awal: Bermasalah saat pengajuan',
            updated_by: user.username,
            created_at: nowStr,
          },
        ]);
        if (nErr) {
          throw new Error(`NIK history database error: ${nErr.message}`);
        }
      }

      // Update state & local storage
      setSubmissions((prev) => {
        const next = [newSubmissionRecord, ...prev];
        saveLocalSubmissions(next);
        return next;
      });

      toast({
        title: 'Usulan Berhasil Dikirim',
        description:
          payload.nik_status === 'BERMASALAH'
            ? `Nomor Registrasi: ${regNo}. Karena NIK bermasalah, usulan masuk ke antrean Dukcapil terlebih dahulu sebelum masuk ke verifikasi Dinkes.`
            : `Nomor Registrasi: ${regNo}. Dokumen (${newDocs.length}) berhasil diunggah. Status: Menunggu Verifikasi Dinkes.`,
      });

      return { success: true, regNo };
    } catch (err: any) {
      toast({
        title: 'Gagal Mengirim Usulan',
        description: err.message || 'Terjadi kesalahan sistem',
        variant: 'destructive',
      });
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. PERBAIKI & AJUKAN ULANG USULAN (Pengusul Puskesmas & Dinsos saat usulan Ditolak Dinkes)
  const resubmitApplication = async (
    submissionId: string,
    payload: PBPUSubmissionPayload,
    revisionNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User belum login' };
    setIsSubmitting(true);

    try {
      const current = submissions.find((s) => s.id === submissionId);
      if (!current) throw new Error('Data usulan tidak ditemukan.');

      // Validasi NIK 16 digit
      const cleanNik = payload.nik.trim();
      if (!/^\d{16}$/.test(cleanNik)) {
        throw new Error('NIK harus terdiri dari tepat 16 digit angka.');
      }

      // Validasi KK jika diisi
      if (payload.no_kk && payload.no_kk.trim()) {
        const cleanKk = payload.no_kk.trim();
        if (!/^\d{16}$/.test(cleanKk)) {
          throw new Error('Nomor KK harus tepat 16 digit angka jika diisi.');
        }
      }

      // Validasi Dokumen sesuai Jalur & Kategori
      const docTypes = payload.attachedDocuments.map((d) => d.document_type);
      const hasIdCard = docTypes.includes('KK') || docTypes.includes('KTP');
      if (!hasIdCard) {
        throw new Error('Dokumen Identitas (KK atau KTP) wajib diunggah.');
      }

      if (payload.submission_channel === 'PUSKESMAS') {
        if (!payload.condition_category) {
          throw new Error('Kategori kondisi wajib dipilih untuk jalur Puskesmas.');
        }
        if (payload.condition_category.includes('Kondisi Tertentu')) {
          if (!docTypes.includes('DIAGNOSA_DPJP')) {
            throw new Error('Surat Keterangan Diagnosa DPJP wajib diunggah untuk kategori Kondisi Tertentu.');
          }
        } else {
          if (!docTypes.includes('SKTM')) {
            throw new Error('SKTM wajib diunggah untuk masyarakat sakit di luar kondisi tertentu.');
          }
        }
      } else if (payload.submission_channel === 'DINSOS') {
        if (!payload.desil || payload.desil < 1 || payload.desil > 5) {
          throw new Error('Tingkatan Desil (1–5) wajib dipilih untuk jalur Dinas Sosial.');
        }
        if (!docTypes.includes('BUKTI_DESIL')) {
          throw new Error('Bukti Desil 1–5 wajib diunggah untuk jalur Dinas Sosial.');
        }
      }

      const nowStr = new Date().toISOString();
      const noteMessage = revisionNote?.trim()
        ? `Perbaikan berkas diajukan ulang: ${revisionNote.trim()}`
        : 'Berkas dan data usulan telah diperbaiki oleh pengusul, diajukan ulang ke Dinkes';

      const newDocs: PBPUDocument[] = payload.attachedDocuments.map((d) => ({
        id: generateUUID(),
        submission_id: submissionId,
        document_type: d.document_type,
        file_name: d.file_name,
        file_url: d.file_url,
        file_size: d.file_size,
        mime_type: d.mime_type,
        uploaded_by: user.username,
        created_at: nowStr,
      }));

      // 1. Update di Supabase (Wajib sukses sebelum cache lokal)
      const { error: updateErr } = await supabase
        .from('pbpu_submissions')
        .update({
          applicant_name: payload.applicant_name.trim(),
          nik: cleanNik,
          no_kk: payload.no_kk?.trim() || null,
          birth_place: payload.birth_place.trim(),
          birth_date: payload.birth_date,
          gender: payload.gender,
          address: payload.address.trim(),
          village: payload.village.trim(),
          district: payload.district,
          phone: payload.phone?.trim() || null,
          condition_category: payload.condition_category || null,
          health_facility: payload.health_facility || null,
          dpjp_name: payload.dpjp_name || null,
          desil: payload.desil || null,
          nik_status: payload.nik_status,
          verification_status: 'MENUNGGU', // Reset status kembali ke MENUNGGU
          rejection_reason: null, // Bersihkan alasan penolakan aktif
          verifier_username: null,
          verifier_note: null,
          verified_at: null,
          notes: payload.notes || null,
          updated_at: nowStr,
        })
        .eq('id', submissionId);

      if (updateErr) {
        throw new Error(`Database error: ${updateErr.message}`);
      }

      // Hapus dokumen lama dan ganti dengan dokumen baru/revisi
      const { error: delErr } = await supabase.from('pbpu_documents').delete().eq('submission_id', submissionId);
      if (delErr) {
        throw new Error(`Gagal hapus dokumen lama di database: ${delErr.message}`);
      }

      if (newDocs.length > 0) {
        const { error: dErr } = await supabase.from('pbpu_documents').insert(
          newDocs.map((d) => ({
            id: d.id,
            submission_id: d.submission_id,
            document_type: d.document_type,
            file_name: d.file_name,
            file_url: d.file_url,
            file_size: d.file_size,
            mime_type: d.mime_type,
            uploaded_by: d.uploaded_by,
            created_at: d.created_at,
          }))
        );
        if (dErr) {
          throw new Error(`Gagal simpan dokumen baru di database: ${dErr.message}`);
        }
      }

      // Catat riwayat status
      const { error: histErr } = await supabase.from('pbpu_status_history').insert([
        {
          id: generateUUID(),
          submission_id: submissionId,
          old_status: 'DITOLAK',
          new_status: 'MENUNGGU',
          reason_or_note: noteMessage,
          changed_by: user.username,
          created_at: nowStr,
        },
      ]);
      if (histErr) {
        throw new Error(`Gagal catat riwayat status di database: ${histErr.message}`);
      }

      // 2. Update local state & storage
      const newHistoryItem: PBPUStatusHistory = {
        id: generateUUID(),
        submission_id: submissionId,
        old_status: 'DITOLAK',
        new_status: 'MENUNGGU',
        reason_or_note: noteMessage,
        changed_by: user.username,
        created_at: nowStr,
      };

      setSubmissions((prev) => {
        const next: PBPUSubmission[] = prev.map((item): PBPUSubmission => {
          if (item.id !== submissionId) return item;
          return {
            ...item,
            applicant_name: payload.applicant_name.trim(),
            nik: cleanNik,
            no_kk: payload.no_kk?.trim() || null,
            birth_place: payload.birth_place.trim(),
            birth_date: payload.birth_date,
            gender: payload.gender,
            address: payload.address.trim(),
            village: payload.village.trim(),
            district: payload.district,
            phone: payload.phone?.trim() || null,
            condition_category: payload.condition_category || null,
            health_facility: payload.health_facility || null,
            dpjp_name: payload.dpjp_name || null,
            desil: payload.desil || null,
            nik_status: payload.nik_status,
            verification_status: 'MENUNGGU',
            rejection_reason: null,
            verifier_username: null,
            verifier_note: null,
            verified_at: null,
            notes: payload.notes || null,
            updated_at: nowStr,
            documents: newDocs,
            status_history: [newHistoryItem, ...(item.status_history || [])],
          };
        });
        saveLocalSubmissions(next);
        return next;
      });

      toast({
        title: 'Usulan Berhasil Diajukan Ulang',
        description: `Berkas perbaikan untuk No. Registrasi ${current.registration_no} telah dikirim ke Dinkes. Status kembali: Menunggu Verifikasi.`,
      });

      return { success: true };
    } catch (err: any) {
      toast({
        title: 'Gagal Mengajukan Ulang Usulan',
        description: err.message,
        variant: 'destructive',
      });
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. VERIFIKASI DINKES (Khusus Bidang Yankes & Admin)
  const verifySubmission = async (
    submissionId: string,
    decision: 'TERVERIFIKASI' | 'DITOLAK',
    reasonOrNote?: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Sesuai FR-011 PRD: Alasan penolakan WAJIB jika ditolak
    if (decision === 'DITOLAK' && (!reasonOrNote || !reasonOrNote.trim())) {
      toast({
        title: 'Alasan Penolakan Wajib Diisi',
        description: 'Mohon tuliskan alasan penolakan secara jelas agar dapat ditindaklanjuti pengusul.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const nowStr = new Date().toISOString();
      const current = submissions.find((s) => s.id === submissionId);
      if (!current) throw new Error('Data usulan tidak ditemukan');

      const oldStatus = current.verification_status;

      // Update Supabase (Wajib sukses sebelum update state/storage)
      const { error: updErr } = await supabase
        .from('pbpu_submissions')
        .update({
          verification_status: decision,
          rejection_reason: decision === 'DITOLAK' ? reasonOrNote?.trim() : null,
          verifier_username: user.username,
          verifier_note: decision === 'TERVERIFIKASI' ? reasonOrNote?.trim() || null : null,
          verified_at: nowStr,
          updated_at: nowStr,
        })
        .eq('id', submissionId);

      if (updErr) {
        throw new Error(`Database error: ${updErr.message}`);
      }

      const { error: histErr } = await supabase.from('pbpu_status_history').insert([
        {
          id: generateUUID(),
          submission_id: submissionId,
          old_status: oldStatus,
          new_status: decision,
          reason_or_note: reasonOrNote?.trim() || (decision === 'TERVERIFIKASI' ? 'Disetujui Dinkes' : 'Ditolak Dinkes'),
          changed_by: user.username,
          created_at: nowStr,
        },
      ]);

      if (histErr) {
        throw new Error(`Riwayat status error: ${histErr.message}`);
      }

      // Update local state
      setSubmissions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== submissionId) return item;
          const updatedHistory: PBPUStatusHistory[] = [
            {
              id: generateUUID(),
              submission_id: submissionId,
              old_status: oldStatus,
              new_status: decision,
              reason_or_note: reasonOrNote?.trim() || (decision === 'TERVERIFIKASI' ? 'Disetujui Dinkes' : 'Ditolak Dinkes'),
              changed_by: user.username,
              created_at: nowStr,
            },
            ...(item.status_history || []),
          ];

          return {
            ...item,
            verification_status: decision,
            rejection_reason: decision === 'DITOLAK' ? reasonOrNote?.trim() : null,
            verifier_username: user.username,
            verifier_note: decision === 'TERVERIFIKASI' ? reasonOrNote?.trim() || null : null,
            verified_at: nowStr,
            updated_at: nowStr,
            status_history: updatedHistory,
          };
        });
        saveLocalSubmissions(next);
        return next;
      });

      toast({
        title: decision === 'TERVERIFIKASI' ? 'Usulan Terverifikasi' : 'Usulan Ditolak',
        description: `No. Registrasi ${current.registration_no} berhasil diperbarui statusnya.`,
      });

      return true;
    } catch (err: any) {
      toast({
        title: 'Gagal Memproses Verifikasi',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // 4. TINDAK LANJUT NIK DUKCAPIL
  const updateNikStatus = async (
    submissionId: string,
    newStatus: PBPUNikStatus,
    followUpNote: string
  ): Promise<boolean> => {
    if (!user) return false;

    // VALIDASI KEWENANGAN: Hanya Dukcapil yang berhak mengubah status NIK
    const uname = (user.username || '').toLowerCase();
    const isDukcapil = user.role === 'dukcapil' || uname === 'dukcapil';
    if (!isDukcapil) {
      toast({
        title: 'Akses Ditolak',
        description: 'Hanya akun Dukcapil yang berwenang mengubah status NIK calon peserta.',
        variant: 'destructive',
      });
      return false;
    }

    if (!followUpNote || !followUpNote.trim()) {
      toast({
        title: 'Catatan Wajib Diisi',
        description: 'Mohon cantumkan rincian hasil pemeriksaan atau tindak lanjut NIK.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const nowStr = new Date().toISOString();
      const current = submissions.find((s) => s.id === submissionId);
      if (!current) throw new Error('Data usulan tidak ditemukan');

      const oldStatus = current.nik_status;

      // Update Supabase (Wajib sukses sebelum update local state)
      const { error: updErr } = await supabase
        .from('pbpu_submissions')
        .update({
          nik_status: newStatus,
          nik_followup_note: followUpNote.trim(),
          updated_at: nowStr,
        })
        .eq('id', submissionId);

      if (updErr) {
        throw new Error(`Database error: ${updErr.message}`);
      }

      const { error: histErr } = await supabase.from('pbpu_nik_history').insert([
        {
          id: generateUUID(),
          submission_id: submissionId,
          old_status: oldStatus,
          new_status: newStatus,
          note: followUpNote.trim(),
          updated_by: user.username,
          created_at: nowStr,
        },
      ]);

      if (histErr) {
        throw new Error(`Riwayat NIK error: ${histErr.message}`);
      }

      // Update local state
      setSubmissions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== submissionId) return item;
          const updatedNikHistory: PBPUNikHistory[] = [
            {
              id: generateUUID(),
              submission_id: submissionId,
              old_status: oldStatus,
              new_status: newStatus,
              note: followUpNote.trim(),
              updated_by: user.username,
              created_at: nowStr,
            },
            ...(item.nik_history || []),
          ];

          return {
            ...item,
            nik_status: newStatus,
            nik_followup_note: followUpNote.trim(),
            updated_at: nowStr,
            nik_history: updatedNikHistory,
          };
        });
        saveLocalSubmissions(next);
        return next;
      });

      toast({
        title: 'Status NIK Berhasil Diperbarui',
        description:
          newStatus === 'TIDAK_BERMASALAH'
            ? `Status NIK kini: Valid/Tidak Bermasalah. Usulan otomatis masuk ke antrean Verifikasi Bidang Yankes Dinkes.`
            : `Status NIK tetap: Bermasalah (Masih dalam penanganan Dukcapil).`,
      });

      return true;
    } catch (err: any) {
      toast({
        title: 'Gagal Memperbarui Status NIK',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // KPI & Statistik Agregat untuk Dashboard (Bagian 11 PRD)
  const stats = useMemo(() => {
    const total = submissions.length;
    // Menunggu Verifikasi Yankes HANYA yang NIK-nya sudah TIDAK_BERMASALAH
    const menunggu = submissions.filter(
      (s) => s.verification_status === 'MENUNGGU' && s.nik_status === 'TIDAK_BERMASALAH'
    ).length;
    const terverifikasi = submissions.filter((s) => s.verification_status === 'TERVERIFIKASI').length;
    const ditolak = submissions.filter((s) => s.verification_status === 'DITOLAK').length;
    const nikBermasalah = submissions.filter((s) => s.nik_status === 'BERMASALAH').length;
    const nikClear = submissions.filter((s) => s.nik_status === 'TIDAK_BERMASALAH').length;
    const jalurRSUD = submissions.filter(
      (s) =>
        s.submitter_unit.toLowerCase().includes('rsud') ||
        s.submitter_unit.toLowerCase().includes('smart') ||
        s.submitter_unit.toLowerCase().includes('waru') ||
        s.submitter_unit.toLowerCase().includes('noer') ||
        Boolean(s.submitter_username && s.submitter_username.toLowerCase().includes('rsud'))
    ).length;
    const jalurPuskesmas = submissions.filter(
      (s) =>
        s.submission_channel === 'PUSKESMAS' &&
        !s.submitter_unit.toLowerCase().includes('rsud') &&
        !s.submitter_unit.toLowerCase().includes('smart') &&
        !s.submitter_unit.toLowerCase().includes('waru') &&
        !s.submitter_unit.toLowerCase().includes('noer') &&
        !(s.submitter_username && s.submitter_username.toLowerCase().includes('rsud'))
    ).length;
    const jalurDinsos = submissions.filter((s) => s.submission_channel === 'DINSOS').length;

    // Breakdown per Kecamatan
    const byDistrict: Record<string, number> = {};
    submissions.forEach((s) => {
      byDistrict[s.district] = (byDistrict[s.district] || 0) + 1;
    });

    // Breakdown per Puskesmas / Unit
    const byUnit: Record<string, number> = {};
    submissions.forEach((s) => {
      byUnit[s.submitter_unit] = (byUnit[s.submitter_unit] || 0) + 1;
    });

    return {
      total,
      menunggu,
      terverifikasi,
      ditolak,
      nikBermasalah,
      nikClear,
      jalurPuskesmas,
      jalurRSUD,
      jalurDinsos,
      byDistrict,
      byUnit,
    };
  }, [submissions]);

  return {
    submissions,
    isLoading,
    isSubmitting,
    stats,
    fetchSubmissions,
    submitNewApplication,
    resubmitApplication,
    verifySubmission,
    updateNikStatus,
  };
};

export default usePBPU;
