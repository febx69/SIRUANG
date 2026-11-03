// src/components/ITSupport/TelegramConfigModal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  Smartphone,
  Check,
} from "lucide-react";
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  detectRecentTelegramChats,
  TelegramChatInfo,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramConfigModal = ({ isOpen, onClose }: TelegramConfigModalProps) => {
  const { toast } = useToast();

  const [botToken, setBotToken] = useState(DEFAULT_TELEGRAM_BOT_TOKEN);
  const [chatId, setChatId] = useState(DEFAULT_TELEGRAM_CHAT_ID);
  const [enabled, setEnabled] = useState(true);
  const [statusNotifEnabled, setStatusNotifEnabled] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedChats, setDetectedChats] = useState<TelegramChatInfo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getTelegramConfig();
      setBotToken(cfg.botToken || DEFAULT_TELEGRAM_BOT_TOKEN);
      setChatId(cfg.chatId || DEFAULT_TELEGRAM_CHAT_ID);
      setEnabled(cfg.enabled);
      setStatusNotifEnabled(cfg.statusNotifEnabled);
      setTestResult(null);
      setDetectedChats([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveTelegramConfig({
      botToken: botToken.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
      chatId: chatId.trim(),
      enabled,
      statusNotifEnabled,
    });

    toast({
      title: "Pengaturan Disimpan",
      description: "Konfigurasi notifikasi Telegram IT Support berhasil disimpan.",
    });
    onClose();
  };

  const handleDetectChats = async () => {
    setIsDetecting(true);
    setHasSearched(true);
    setTestResult(null);
    try {
      const res = await detectRecentTelegramChats(botToken.trim());
      if (res.success && res.chats.length > 0) {
        setDetectedChats(res.chats);
        toast({
          title: "Chat Ditemukan",
          description: `Berhasil mendeteksi ${res.chats.length} riwayat chat dari Bot Telegram.`,
        });
      } else {
        setDetectedChats([]);
        toast({
          title: "Belum Ada Pesan Masuk",
          description: res.error || "Kirim pesan ke bot atau grup bot terlebih dahulu.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Gagal Deteksi",
        description: e.message || "Gagal menghubungi Telegram API",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!chatId.trim()) {
      setTestResult({
        success: false,
        message: "Harap isi ID Chat / Grup Telegram terlebih dahulu sebelum melakukan tes.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testText = `✅ <b>TES KONEKSI TELEGRAM — SIRUANG IT SUPPORT</b>
━━━━━━━━━━━━━━━━━━━━
Sistem notifikasi Telegram untuk Layanan Tiket IT Dinas Kesehatan telah <b>TERHUBUNG DENGAN BAIK</b>.

🕒 <i>Waktu pengujian: ${new Date().toLocaleString("id-ID")}</i>
━━━━━━━━━━━━━━━━━━━━
<i>Tiket kendala IT yang diajukan pegawai akan otomatis dikirimkan ke obrolan ini.</i>`;

    const res = await sendTelegramMessage(chatId.trim(), testText, botToken.trim());
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: "Pesan tes berhasil terkirim ke Telegram! Cek aplikasi Telegram Anda sekarang.",
      });
      toast({
        title: "Pesan Tes Terkirim",
        description: "Notifikasi Telegram berhasil diterima oleh chat target.",
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || "Gagal mengirim pesan ke Telegram.",
      });
      toast({
        title: "Gagal Kirim Pesan Tes",
        description: res.error || "Pastikan Bot sudah di-start atau dimasukkan ke grup.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-7">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Send size={20} className="-ml-0.5 mt-0.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                Notifikasi Telegram IT Support
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Hubungkan tiket aduan IT Dinkes langsung ke obrolan atau grup Telegram tim teknisi
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Status Bot Banner */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-1.5 text-xs text-sky-900">
            <div className="flex items-center gap-1.5 font-bold text-sky-800">
              <ShieldCheck size={16} className="text-sky-600" />
              Bot Resmi: @siruangdinkes_bot (SIRUANG)
            </div>
            <p className="text-[11px] leading-relaxed text-sky-700">
              Sistem menggunakan Bot resmi Telegram SIRUANG. Pesan secara otomatis dikirimkan ke grup <b>SIRUANG</b> (ID: <code>-5231337539</code>) yang sama dengan notifikasi Peminjaman Zoom.
            </p>
          </div>

          {/* Form Konfigurasi */}
          <div className="space-y-4">
            {/* Target Chat ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-slate-500" />
                  ID Chat / ID Grup Telegram <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={handleDetectChats}
                  disabled={isDetecting}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isDetecting ? "animate-spin" : ""} />
                  {isDetecting ? "Mencari..." : "Deteksi Otomatis"}
                </button>
              </div>

              <Input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Contoh: -5231337539 (Grup SIRUANG)"
                className="font-mono text-xs h-10 border-slate-300"
              />

              <p className="text-[11px] text-slate-500 leading-normal">
                Default: <code>-5231337539</code> (Grup Telegram SIRUANG).
              </p>
            </div>

            {/* Hasil Deteksi Chat */}
            {hasSearched && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Pilihan Chat Terdeteksi:
                </div>
                {detectedChats.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {detectedChats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setChatId(c.id);
                          toast({ title: "ID Chat Dipilih", description: `${c.title} (${c.id})` });
                        }}
                        className={`w-full p-2 text-left rounded-lg text-xs flex items-center justify-between border transition-all ${
                          chatId === c.id
                            ? "bg-sky-50 border-sky-300 text-sky-900 font-bold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="block truncate">{c.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {c.type === "group" || c.type === "supergroup" ? "👥 Grup" : "👤 Kontak"}: {c.id}
                          </span>
                        </div>
                        {chatId === c.id ? (
                          <Check size={14} className="text-sky-600 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-bold text-sky-600 underline shrink-0">Pilih</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <p>Tidak menemukan chat baru di Bot Telegram.</p>
                    <p className="text-[10px] text-slate-400">
                      <strong>Tips:</strong> Buka bot <code>@PemantauanPuskesmasbot</code> di Telegram, klik <strong>Start</strong> atau ketik pesan apa saja (atau masukkan bot ke grup Anda dan kirim pesan di grup), lalu klik <strong>Deteksi Otomatis</strong> lagi.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Custom Bot Token (Collapsible/Advanced) */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Bot Token Telegram (Opsional / Tingkat Lanjut)
              </Label>
              <Input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Token bot dari @BotFather"
                className="font-mono text-xs h-9 border-slate-300"
              />
              <p className="text-[10px] text-slate-400">
                Biarkan default jika menggunakan bot standar Dinas Kesehatan.
              </p>
            </div>

            {/* Checklist Opsi Notifikasi */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>Kirim notifikasi otomatis saat <strong>Tiket IT Baru</strong> dibuat</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={statusNotifEnabled}
                  onChange={(e) => setStatusNotifEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>Kirim notifikasi saat <strong>Status Tiket</strong> diperbarui (Dikerjakan / Selesai)</span>
              </label>
            </div>

            {/* Test Message Feedback Alert */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.success ? "Berhasil!" : "Pengujian Gagal"}</div>
                  <div className="text-[11px] mt-0.5">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendTestMessage}
            disabled={isTesting || !chatId.trim()}
            className="w-full sm:w-auto text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Send size={12} className={isTesting ? "animate-pulse" : ""} />
            {isTesting ? "Mengirim Tes..." : "🧪 Tes Kirim Pesan"}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold px-4"
            >
              Simpan Pengaturan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
