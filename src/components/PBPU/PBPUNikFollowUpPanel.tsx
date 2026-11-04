// src/components/PBPU/PBPUNikFollowUpPanel.tsx
import React, { useState } from 'react';
import { PBPUSubmission, PBPUNikStatus } from '@/types/pbpu';
import { User } from '@/hooks/useSupabaseAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  Search,
  User as UserIcon,
  MapPin,
  Clock,
  History,
  FileCheck,
} from 'lucide-react';

interface PBPUNikFollowUpPanelProps {
  submissions: PBPUSubmission[];
  user: User | null;
  onUpdateNik: (
    submissionId: string,
    newStatus: PBPUNikStatus,
    note: string
  ) => Promise<boolean>;
  canUpdateNik?: boolean;
}

export const PBPUNikFollowUpPanel: React.FC<PBPUNikFollowUpPanelProps> = ({
  submissions,
  user,
  onUpdateNik,
  canUpdateNik,
}) => {
  const uname = (user?.username || '').toLowerCase();
  const isDukcapil = user?.role === 'dukcapil' || uname === 'dukcapil';
  const isYankesOrAdmin = uname === 'yankes' || user?.role === 'admin';
  // Hanya Dukcapil (atau Yankes/Admin jika perlu) yang dapat memperbarui status NIK
  const allowUpdate = canUpdateNik !== undefined ? canUpdateNik : (isDukcapil || isYankesOrAdmin);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'BERMASALAH' | 'ALL'>('BERMASALAH');

  // Selected submission for follow-up dialog
  const [selectedSub, setSelectedSub] = useState<PBPUSubmission | null>(null);
  const [newNikStatus, setNewNikStatus] = useState<PBPUNikStatus>('TIDAK_BERMASALAH');
  const [followUpNote, setFollowUpNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const nikList = submissions.filter((sub) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      sub.applicant_name.toLowerCase().includes(term) ||
      sub.nik.includes(term) ||
      sub.registration_no.toLowerCase().includes(term);

    const matchStatus = filterType === 'ALL' || sub.nik_status === 'BERMASALAH';
    return matchSearch && matchStatus;
  });

  const handleOpenFollowUp = (sub: PBPUSubmission) => {
    setSelectedSub(sub);
    setNewNikStatus('TIDAK_BERMASALAH');
    setFollowUpNote(sub.nik_followup_note || '');
  };

  const handleSaveFollowUp = async () => {
    if (!selectedSub) return;
    setIsUpdating(true);

    const ok = await onUpdateNik(selectedSub.id, newNikStatus, followUpNote);
    setIsUpdating(false);

    if (ok) {
      setSelectedSub(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Informasi Dukcapil */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-slate-800 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-rose-600 text-white shadow-sm mt-0.5">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Antrean Tindak Lanjut NIK Bermasalah (Dukcapil / Verifikator)
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Sesuai PRD Bagian 6.3 & FR-008, usulan dengan NIK yang bermasalah (tidak aktif, ganda, atau anomali SIAK) memerlukan konfirmasi & pembaruan catatan oleh petugas sebelum kepesertaan diproses lebih lanjut.
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Cari NIK 16 digit, Nama, atau No. Reg..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={filterType}
            onValueChange={(val: any) => setFilterType(val)}
          >
            <SelectTrigger className="w-[180px] text-xs h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BERMASALAH">Hanya NIK Bermasalah</SelectItem>
              <SelectItem value="ALL">Semua Data NIK</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LIST KARTU NIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nikList.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 size={42} className="mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-base font-semibold text-slate-700">Tidak ada NIK bermasalah dalam antrean</p>
            <p className="text-xs text-slate-400 mt-1">
              Seluruh usulan saat ini memiliki status NIK Valid/Tidak Bermasalah.
            </p>
          </div>
        ) : (
          nikList.map((sub) => {
            const isBermasalah = sub.nik_status === 'BERMASALAH';

            return (
              <div
                key={sub.id}
                className={`p-5 rounded-2xl border transition-all bg-white shadow-sm flex flex-col justify-between ${
                  isBermasalah
                    ? 'border-rose-200 hover:border-rose-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {sub.registration_no}
                    </span>
                    {isBermasalah ? (
                      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 gap-1 font-semibold text-[11px]">
                        <AlertCircle size={12} /> NIK Bermasalah
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 gap-1 font-semibold text-[11px]">
                        <CheckCircle2 size={12} /> NIK Selesai / Valid
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">{sub.applicant_name}</h4>
                    <p className="font-mono text-xs font-bold text-slate-700 mt-0.5">
                      NIK: {sub.nik} {sub.no_kk ? `• KK: ${sub.no_kk}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {sub.district}, {sub.village} • Unit Pengusul: {sub.submitter_unit}
                    </p>
                  </div>

                  {sub.nik_followup_note && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong className="text-slate-800 block text-[11px] mb-0.5">Catatan Tindak Lanjut:</strong>
                      {sub.nik_followup_note}
                    </div>
                  )}

                  {sub.nik_history && sub.nik_history.length > 0 && (
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t">
                      <p className="font-semibold text-slate-500">Riwayat Penanganan:</p>
                      {sub.nik_history.slice(0, 2).map((nh) => (
                        <p key={nh.id} className="truncate">
                          • {new Date(nh.created_at).toLocaleDateString('id-ID')}: {nh.note} ({nh.updated_by})
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    {sub.nik_status === 'BERMASALAH' ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle size={12} /> Menunggu penanganan Dukcapil
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Masalah NIK selesai diatasi
                      </span>
                    )}
                  </div>
                  {allowUpdate ? (
                    <Button
                      size="sm"
                      onClick={() => handleOpenFollowUp(sub)}
                      className="text-xs font-bold gap-1 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <FileCheck size={14} /> Tindak Lanjut NIK
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      Wewenang Dukcapil
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DIALOG PEMBARUAN STATUS NIK */}
      <Dialog
        open={Boolean(selectedSub)}
        onOpenChange={(open) => !open && setSelectedSub(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileCheck size={18} className="text-teal-600" />
              <span>Tindak Lanjut Status NIK Dukcapil</span>
            </DialogTitle>
          </DialogHeader>

          {selectedSub && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p>
                  <span className="text-slate-500">Nama:</span> <strong>{selectedSub.applicant_name}</strong>
                </p>
                <p>
                  <span className="text-slate-500">NIK:</span> <strong className="font-mono">{selectedSub.nik}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Alamat:</span> {selectedSub.address}, {selectedSub.village}, {selectedSub.district}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Pembaruan Status NIK *</Label>
                <Select
                  value={newNikStatus}
                  onValueChange={(val: PBPUNikStatus) => setNewNikStatus(val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIDAK_BERMASALAH">Tidak Bermasalah (Valid / SIAK Sesuai)</SelectItem>
                    <SelectItem value="BERMASALAH">Masih Bermasalah (Perlu Penanganan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Catatan Tindak Lanjut Dukcapil (Wajib) *
                </Label>
                <Textarea
                  rows={3}
                  required
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Contoh: NIK telah diaktifkan kembali di SIAK Pusat per 03/11/2026..."
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSub(null)}
              disabled={isUpdating}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isUpdating || !followUpNote.trim()}
              onClick={handleSaveFollowUp}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
            >
              {isUpdating ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

