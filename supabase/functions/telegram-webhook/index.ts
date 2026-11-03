// supabase/functions/telegram-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = "8492974047:AAEprLxEloHOs7I3TYwEUMrqjpIESMAm4Fc";
const CHAT_IDS = ["-5231337539"];
const SUPABASE_URL = "https://kgufceeudnsrgfamzeuj.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndWZjZWV1ZG5zcmdmYW16ZXVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODE1NTM0MiwiZXhwIjoyMDczNzMxMzQyfQ.KwcQyzHQxd22NLVxx-JN-BDv_w5LxZi4GTmd_bkapW4";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const table = payload.table;

    if (payload.type !== "INSERT") return new Response("ok");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. NOTIFIKASI LAYANAN TIKET IT
    if (table === "it_tickets" || record?.ticket_number) {
      const tanggal = new Date(record.created_at || Date.now()).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const jam = new Date(record.created_at || Date.now()).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const kategoriLabel =
        record.category === "hardware" ? "Perangkat Keras (Hardware)" : "Aplikasi / Sistem (Software)";

      const pesan = `🔔 <b>Pengajuan Layanan Tiket IT Baru</b>

📌 <b>No. Tiket:</b> <code>${record.ticket_number}</code>
👤 <b>Pelapor:</b> ${record.penanggung_jawab}
🏢 <b>Bidang:</b> ${record.bidang}
💻 <b>Perangkat:</b> ${record.unit_name}
⚙️ <b>Kategori:</b> ${kategoriLabel}
📋 <b>Kendala:</b> ${record.description}
📅 <b>Tanggal:</b> ${tanggal}
🕐 <b>Waktu:</b> ${jam} WIB

<i>Notifikasi otomatis dari Sistem SIRUANG IT Support. Mohon segera ditindaklanjuti.</i>`.trim();

      await Promise.all(
        CHAT_IDS.map(async (chatId) => {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: pesan,
              parse_mode: "HTML",
            }),
          });
        })
      );

      return new Response("ok");
    }

    // 2. NOTIFIKASI PEMINJAMAN MOBIL DINAS
    if (table === "car_bookings" || (record?.keperluan && !record?.acara)) {
      let tanggal = record.date;
      try {
        const parts = String(record.date).split("-");
        if (parts.length === 3) {
          const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          tanggal = dt.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        } else {
          tanggal = new Date(record.date).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      } catch {
        tanggal = record.date;
      }

      const jam = `${(record.start_time || "00:00").slice(0, 5)} - ${(record.end_time || "00:00").slice(0, 5)} WIB`;
      const pesan = `🚗 <b>Pengajuan Peminjaman Mobil Dinas Baru</b>

👤 <b>Peminjam:</b> ${record.name}
🏢 <b>Seksi / Bidang:</b> ${record.seksi || "-"}
📋 <b>Keperluan:</b> ${record.keperluan}
📅 <b>Tanggal:</b> ${tanggal}
🕐 <b>Waktu:</b> ${jam}
⏳ <b>Status:</b> Menunggu Persetujuan (Pending)

<i>Notifikasi otomatis dari Sistem SIRUANG Peminjaman Mobil Dinas Dinkes.</i>`.trim();

      await Promise.all(
        CHAT_IDS.map(async (chatId) => {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: pesan,
              parse_mode: "HTML",
            }),
          });
        })
      );

      return new Response("ok");
    }

    // 3. NOTIFIKASI PEMINJAMAN ZOOM (Existing)
    const tanggal = new Date(record.date).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const pesan = `🔔 *Pengajuan Zoom Baru*

👤 *Peminjam:* ${record.name}
🏢 *Seksi:* ${record.seksi || "-"}
📋 *Acara:* ${record.acara}
📅 *Tanggal:* ${tanggal}
🕐 *Waktu:* ${record.start_time?.slice(0, 5)} - ${record.end_time?.slice(0, 5)} WIB

Reply pesan ini dengan:
✅ *acc* — Setujui & generate link Zoom otomatis
❌ *tolak* — Tolak pengajuan`.trim();

    // Kirim ke semua admin, simpan message_id untuk mapping
    await Promise.all(
      CHAT_IDS.map(async (chatId) => {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: pesan,
            parse_mode: "Markdown",
          }),
        });
        const data = await res.json();

        // Simpan mapping message_id → zoom_booking_id
        if (data.ok && data.result?.message_id) {
          try {
            await supabase.from("telegram_message_map").insert({
              message_id: data.result.message_id,
              zoom_booking_id: record.id,
              chat_id: chatId,
            });
          } catch (e) {
            console.warn("Could not insert telegram_message_map:", e);
          }
        }
      })
    );

    return new Response("ok");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
