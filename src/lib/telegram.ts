// src/lib/telegram.ts
import { ITTicket, TicketStatus } from "@/hooks/useITTickets";

// Token & Chat ID resmi SIRUANG (@siruangdinkes_bot)
export const DEFAULT_TELEGRAM_BOT_TOKEN = "8492974047:AAEprLxEloHOs7I3TYwEUMrqjpIESMAm4Fc";
export const DEFAULT_TELEGRAM_CHAT_ID = "-5231337539";
export const EDGE_FUNCTION_WEBHOOK_URL = "https://kgufceeudnsrgfamzeuj.supabase.co/functions/v1/telegram-webhook";

const STORAGE_KEYS = {
  BOT_TOKEN: "siruang_telegram_bot_token",
  CHAT_ID: "siruang_telegram_chat_id",
  ENABLED: "siruang_telegram_enabled",
  STATUS_NOTIF_ENABLED: "siruang_telegram_status_notif_enabled",
};

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  statusNotifEnabled: boolean;
}

export interface TelegramChatInfo {
  id: string;
  title: string;
  type: string;
  username?: string;
}

/**
 * Membaca konfigurasi Telegram dari localStorage / Environment Variables / Default
 */
export function getTelegramConfig(): TelegramConfig {
  const envToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
  const envChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;

  let localToken = "";
  let localChatId = "";
  let localEnabled = true;
  let localStatusEnabled = true;

  try {
    localToken = localStorage.getItem(STORAGE_KEYS.BOT_TOKEN) || "";
    localChatId = localStorage.getItem(STORAGE_KEYS.CHAT_ID) || "";
    const savedEnabled = localStorage.getItem(STORAGE_KEYS.ENABLED);
    if (savedEnabled !== null) localEnabled = savedEnabled === "true";
    const savedStatus = localStorage.getItem(STORAGE_KEYS.STATUS_NOTIF_ENABLED);
    if (savedStatus !== null) localStatusEnabled = savedStatus === "true";
  } catch (e) {
    console.warn("Could not read localStorage for telegram config:", e);
  }

  return {
    botToken: localToken.trim() || envToken?.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
    chatId: localChatId.trim() || envChatId?.trim() || DEFAULT_TELEGRAM_CHAT_ID,
    enabled: localEnabled,
    statusNotifEnabled: localStatusEnabled,
  };
}

/**
 * Menyimpan konfigurasi Telegram ke localStorage
 */
export function saveTelegramConfig(config: Partial<TelegramConfig>): void {
  try {
    if (config.botToken !== undefined) {
      localStorage.setItem(STORAGE_KEYS.BOT_TOKEN, config.botToken.trim());
    }
    if (config.chatId !== undefined) {
      localStorage.setItem(STORAGE_KEYS.CHAT_ID, config.chatId.trim());
    }
    if (config.enabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ENABLED, String(config.enabled));
    }
    if (config.statusNotifEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.STATUS_NOTIF_ENABLED, String(config.statusNotifEnabled));
    }
  } catch (e) {
    console.error("Failed to save telegram config:", e);
  }
}

/**
 * Mengirim pesan langsung ke Telegram via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  customToken?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  const token = (customToken || getTelegramConfig().botToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  const targetChatId = (chatId || getTelegramConfig().chatId || DEFAULT_TELEGRAM_CHAT_ID).trim();

  if (!token) {
    return { success: false, error: "Bot token belum dikonfigurasi." };
  }
  if (!targetChatId) {
    return { success: false, error: "Chat ID Telegram belum diisi." };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      const errMsg = data.description || "Gagal mengirim pesan Telegram";
      console.warn("Telegram sendMessage error:", errMsg);
      return { success: false, error: errMsg, data };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Network exception sending telegram message:", err);
    return { success: false, error: err.message || "Gagal menghubungi server Telegram" };
  }
}

/**
 * Mendeteksi chat ID terbaru yang pernah berinteraksi dengan Bot Telegram
 */
export async function detectRecentTelegramChats(
  customToken?: string
): Promise<{ success: boolean; chats: TelegramChatInfo[]; error?: string }> {
  const token = (customToken || getTelegramConfig().botToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  if (!token) return { success: false, chats: [], error: "Token bot kosong" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, chats: [], error: data.description || "Gagal membaca updates dari Telegram" };
    }

    const chatsMap = new Map<string, TelegramChatInfo>();
    const updates = Array.isArray(data.result) ? data.result : [];

    for (const update of updates) {
      const msg = update.message || update.channel_post || update.my_chat_member?.chat;
      const chat = msg?.chat || msg;
      if (chat && chat.id) {
        const idStr = String(chat.id);
        const name =
          chat.title ||
          [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
          chat.username ||
          `Chat ${idStr}`;

        chatsMap.set(idStr, {
          id: idStr,
          title: name,
          type: chat.type || "unknown",
          username: chat.username,
        });
      }
    }

    return { success: true, chats: Array.from(chatsMap.values()) };
  } catch (e: any) {
    return { success: false, chats: [], error: e.message || "Gagal koneksi ke Telegram" };
  }
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format template notifikasi tiket baru (gaya konsisten dengan notif Zoom)
 */
export function buildITTicketCreatedMessage(ticket: ITTicket): string {
  const tanggal = new Date(ticket.created_at).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const jam = new Date(ticket.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  });
  const categoryLabel =
    ticket.category === "hardware"
      ? "Perangkat Keras (Hardware)"
      : "Aplikasi / Sistem (Software)";

  return `🔔 <b>Pengajuan Layanan Tiket IT Baru</b>

📌 <b>No. Tiket:</b> <code>${escapeHtml(ticket.ticket_number)}</code>
👤 <b>Pelapor:</b> ${escapeHtml(ticket.penanggung_jawab)}
🏢 <b>Bidang:</b> ${escapeHtml(ticket.bidang)}
💻 <b>Perangkat:</b> ${escapeHtml(ticket.unit_name)}
⚙️ <b>Kategori:</b> ${categoryLabel}
📋 <b>Kendala:</b> ${escapeHtml(ticket.description)}
📅 <b>Tanggal:</b> ${tanggal}
🕐 <b>Waktu:</b> ${jam} WIB

<i>Notifikasi otomatis dari Sistem SIRUANG IT Support. Mohon admin segera menindaklanjuti.</i>`.trim();
}

/**
 * Format template notifikasi update status tiket
 */
export function buildITTicketStatusUpdateMessage(
  ticket: ITTicket,
  newStatus: TicketStatus,
  handlerNotes?: string,
  handlerName?: string
): string {
  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const jam = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  });

  const statusLabels: Record<TicketStatus, string> = {
    pending: "Menunggu Antrean",
    in_progress: "Sedang Dikerjakan",
    completed: "Selesai (Sudah Diperbaiki)",
    cancelled: "Dibatalkan",
  };

  const statusLabel = statusLabels[newStatus] || newStatus.toUpperCase();

  return `🛠️ <b>Update Status Tiket IT</b>

📌 <b>No. Tiket:</b> <code>${escapeHtml(ticket.ticket_number)}</code>
👤 <b>Pelapor:</b> ${escapeHtml(ticket.penanggung_jawab)} (${escapeHtml(ticket.bidang)})
💻 <b>Perangkat:</b> ${escapeHtml(ticket.unit_name)}
🔄 <b>Status:</b> ${statusLabel}
👨‍💻 <b>Teknisi:</b> ${escapeHtml(handlerName || "Tim IT")}
${handlerNotes ? `💬 <b>Catatan / Solusi:</b> ${escapeHtml(handlerNotes)}\n` : ""}📅 <b>Waktu:</b> ${tanggal}, ${jam} WIB

<i>Status penanganan layanan tiket IT SIRUANG.</i>`.trim();
}

/**
 * Kirim notifikasi pembuatan tiket baru
 */
export async function sendITTicketNotification(ticket: ITTicket): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig();

  // 1. Panggil webhook edge function Supabase (pola yang sama dengan zoom booking)
  try {
    fetch(EDGE_FUNCTION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "INSERT",
        table: "it_tickets",
        record: ticket,
      }),
    }).catch((e) => console.warn("Supabase edge function trigger skipped/error:", e));
  } catch (e) {
    // Non-blocking
  }

  // 2. Direct Telegram notification jika enabled
  if (!config.enabled) {
    return { success: true };
  }

  const targetChatId = config.chatId || DEFAULT_TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    console.warn("Telegram Chat ID is not configured yet. Direct notification skipped.");
    return { success: false, error: "Chat ID Telegram belum diatur." };
  }

  const message = buildITTicketCreatedMessage(ticket);
  return await sendTelegramMessage(targetChatId, message, config.botToken);
}

/**
 * Kirim notifikasi pembaruan status tiket
 */
export async function sendITTicketStatusNotification(
  ticket: ITTicket,
  newStatus: TicketStatus,
  handlerNotes?: string,
  handlerName?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig();
  if (!config.enabled || !config.statusNotifEnabled) {
    return { success: true };
  }

  const targetChatId = config.chatId || DEFAULT_TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    return { success: false, error: "Chat ID Telegram belum diatur." };
  }

  const message = buildITTicketStatusUpdateMessage(ticket, newStatus, handlerNotes, handlerName);
  return await sendTelegramMessage(targetChatId, message, config.botToken);
}

/**
 * Format tanggal Indonesia secara aman tanpa timezone shift
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return dt.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format template notifikasi peminjaman mobil dinas baru
 */
export function buildCarBookingCreatedMessage(booking: {
  name: string;
  seksi: string;
  date: string;
  start_time: string;
  end_time: string;
  keperluan: string;
}): string {
  const tanggal = formatIndonesianDate(booking.date);
  const jam = `${(booking.start_time || "00:00").slice(0, 5)} - ${(booking.end_time || "00:00").slice(0, 5)} WIB`;

  return `🚗 <b>Pengajuan Peminjaman Mobil Dinas Baru</b>

👤 <b>Peminjam:</b> ${escapeHtml(booking.name)}
🏢 <b>Seksi / Bidang:</b> ${escapeHtml(booking.seksi || "-")}
📋 <b>Keperluan:</b> ${escapeHtml(booking.keperluan)}
📅 <b>Tanggal:</b> ${tanggal}
🕐 <b>Waktu:</b> ${jam}
⏳ <b>Status:</b> Menunggu Persetujuan (Pending)

<i>Notifikasi otomatis dari Sistem SIRUANG Peminjaman Mobil Dinas Dinkes. Mohon admin segera menindaklanjuti.</i>`.trim();
}

/**
 * Format template notifikasi update status peminjaman mobil (Disetujui / Ditolak)
 */
export function buildCarBookingStatusUpdateMessage(
  booking: {
    name: string;
    seksi: string;
    date: string;
    start_time: string;
    end_time: string;
    keperluan: string;
  },
  status: "pending" | "approved" | "rejected" | string,
  adminNote?: string
): string {
  const tanggal = formatIndonesianDate(booking.date);
  const jam = `${(booking.start_time || "00:00").slice(0, 5)} - ${(booking.end_time || "00:00").slice(0, 5)} WIB`;

  const statusLabel =
    status === "approved"
      ? "✅ DISETUJUI (ACC)"
      : status === "rejected"
      ? "❌ DITOLAK"
      : "⏳ MENUNGGU PERSETUJUAN (PENDING)";

  return `🚗 <b>Update Status Peminjaman Mobil Dinas</b>

👤 <b>Peminjam:</b> ${escapeHtml(booking.name)} (${escapeHtml(booking.seksi || "-")})
📋 <b>Keperluan:</b> ${escapeHtml(booking.keperluan)}
📅 <b>Tanggal:</b> ${tanggal}
🕐 <b>Waktu:</b> ${jam}
🔄 <b>Status:</b> ${statusLabel}
${adminNote ? `💬 <b>Catatan Admin:</b> ${escapeHtml(adminNote)}\n` : ""}
<i>Status peminjaman kendaraan dinas SIRUANG Dinkes.</i>`.trim();
}

/**
 * Kirim notifikasi pengajuan peminjaman mobil baru ke Telegram
 */
export async function sendCarBookingNotification(
  booking: {
    name: string;
    seksi: string;
    date: string;
    start_time: string;
    end_time: string;
    keperluan: string;
    [key: string]: any;
  }
): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig();

  // 1. Panggil webhook edge function Supabase (non-blocking)
  try {
    fetch(EDGE_FUNCTION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "INSERT",
        table: "car_bookings",
        record: booking,
      }),
    }).catch((e) => console.warn("Supabase edge function trigger car booking error:", e));
  } catch (e) {
    // Non-blocking
  }

  // 2. Direct Telegram notification jika enabled
  if (!config.enabled) {
    return { success: true };
  }

  const targetChatId = config.chatId || DEFAULT_TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    console.warn("Telegram Chat ID is not configured yet. Direct notification skipped.");
    return { success: false, error: "Chat ID Telegram belum diatur." };
  }

  const message = buildCarBookingCreatedMessage(booking);
  return await sendTelegramMessage(targetChatId, message, config.botToken);
}

/**
 * Kirim notifikasi update status peminjaman mobil ke Telegram (ACC / Tolak)
 */
export async function sendCarBookingStatusNotification(
  booking: {
    name: string;
    seksi: string;
    date: string;
    start_time: string;
    end_time: string;
    keperluan: string;
    [key: string]: any;
  },
  status: "pending" | "approved" | "rejected" | string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig();
  if (!config.enabled || !config.statusNotifEnabled) {
    return { success: true };
  }

  const targetChatId = config.chatId || DEFAULT_TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    return { success: false, error: "Chat ID Telegram belum diatur." };
  }

  const message = buildCarBookingStatusUpdateMessage(booking, status, adminNote);
  return await sendTelegramMessage(targetChatId, message, config.botToken);
}

