# PRD — Sistem Usulan Standar Harga Satuan (SHS)

| | |
|---|---|
| Versi | 0.1 (draft) |
| Tanggal | 28 September 2026 |
| Pengguna utama | Puskesmas / Dinkes (pengusul), Verifikator, Admin |

## 1. Latar Belakang & Tujuan

Usulan SHS saat ini rawan dikumpulkan lewat berkas terpisah (spreadsheet/WA/email): format tidak seragam, kode kategori dan rekening salah, sulit dilacak statusnya, dan tidak ada batas waktu yang tegas. Sistem ini memusatkan pengajuan, verifikasi, dan rekap usulan SHS dalam satu aplikasi.

**Tujuan**
1. Pengusul dapat mengunggah usulan SHS (input manual atau file) hanya pada periode yang dibuka.
2. Data seragam dan tervalidasi otomatis terhadap master kode kategori dan kode rekening.
3. Verifikator dapat menelaah, menyetujui, atau mengembalikan usulan dengan catatan.
4. Admin mengelola periode, pengguna, master data, dan rekap akhir.

**Bukan tujuan (fase 1):** integrasi langsung ke SIPD/e-katalog, perhitungan wajar-tidaknya harga otomatis, persetujuan berjenjang lebih dari satu tingkat verifikasi.

## 2. Peran & Hak Akses

| Peran | Hak utama |
|---|---|
| **Pengguna (Pengusul)** | Membuat, mengubah, menghapus usulan miliknya saat periode buka; import file; mengajukan; melihat status & catatan verifikator; merevisi usulan yang dikembalikan |
| **Verifikator** | Melihat semua usulan berstatus diajukan (dapat dibatasi per unit); menyetujui / mengembalikan / menolak per item atau massal; wajib mengisi catatan saat mengembalikan/menolak |
| **Admin** | Kelola akun & peran; kelola periode buka-tutup; kelola master (kategori, rekening, satuan, kelompok, unit); membuka kembali usulan; ekspor rekap; melihat log audit |

## 3. Fitur Fungsional

### 3.1 Autentikasi & Akun
- FR-01 Login username/email + password; akun dibuat/diaktifkan oleh Admin.
- FR-02 Setiap akun pengusul terikat ke satu unit (Puskesmas/Dinkes); nama pengusul dan unit terisi otomatis dari akun.
- FR-03 Reset password oleh Admin; sesi timeout.

### 3.2 Periode Buka-Tutup Upload
- FR-04 Admin membuat periode: nama, tahun, waktu buka (tanggal+jam), waktu tutup (tanggal+jam), status aktif.
- FR-05 Sistem menentukan status periode dari waktu server (zona WIB): **Belum dibuka / Dibuka / Ditutup**; tidak bergantung pada jam perangkat pengguna.
- FR-06 Saat periode tidak Dibuka, tombol tambah/import/edit/hapus/ajukan nonaktif dan API menolak (validasi di server, bukan hanya UI).
- FR-07 Penghitung mundur sisa waktu ditampilkan di dashboard pengusul.
- FR-08 Admin dapat memperpanjang/menutup lebih awal, dan membuka akses khusus (override) untuk unit tertentu; setiap perubahan tercatat di log audit.
- FR-09 Usulan yang telah diajukan sebelum penutupan tetap diproses verifikator setelah periode tutup. Perbaikan atas usulan yang dikembalikan diperbolehkan setelah tutup hanya jika Admin mengaktifkan masa revisi.

### 3.3 Input Manual Usulan
- FR-10 Form tambah/ubah satu item SHS dengan seluruh kolom pada bagian 4.
- FR-11 Daftar usulan: pencarian, filter (status, kategori, kelompok, unit), sortir, paginasi.
- FR-12 Simpan sebagai **Draft**; validasi penuh dijalankan saat **Ajukan**.
- FR-13 Ajukan per item atau semua Draft valid sekaligus.

### 3.4 Upload File (Import)
- FR-14 Format: `.xlsx` dan `.csv` (UTF-8). Sistem menyediakan **template unduhan** dengan header kolom baku, dan sheet referensi kategori/rekening/satuan.
- FR-15 Alur: pilih file → pratinjau → validasi per baris → laporan hasil → konfirmasi simpan.
- FR-16 Laporan validasi menampilkan nomor baris, kolom, dan pesan kesalahan; dapat diunduh sebagai file. Mode simpan: **semua-atau-tidak** (default) atau **simpan baris valid saja** (pilihan pengguna).
- FR-17 Batas ukuran file dan jumlah baris (usulan awal: 5 MB, 5.000 baris per unggahan).
- FR-18 Kolom `nama pengusul` dan `puskesmas/dinkes` pada file diabaikan atau dicocokkan dengan akun; pengusul tidak boleh mengunggah atas nama unit lain (Admin boleh).
- FR-19 Setiap unggahan dicatat sebagai batch (file, waktu, pengguna, jumlah berhasil/gagal) agar dapat ditelusuri.
- FR-20 Deteksi duplikat (lihat 4.2).

### 3.5 Verifikasi
- FR-21 Antrean verifikasi dengan filter unit, kategori, tanggal ajuan.
- FR-22 Tampilan detail item: seluruh kolom, tautan katalog dapat dibuka, riwayat status.
- FR-23 Keputusan: **Setujui**, **Kembalikan (perlu perbaikan)**, **Tolak**; catatan wajib untuk dua yang terakhir. Tersedia aksi massal.
- FR-24 Verifikator tidak dapat mengubah isi data usulan; koreksi dilakukan pengusul (menjaga akuntabilitas).
- FR-25 Notifikasi in-app ke pengusul saat status berubah (email opsional).

### 3.6 Administrasi & Rekap
- FR-26 CRUD master: kode kategori, kode rekening, satuan, kelompok, unit.
- FR-27 Impor master dari file, dengan versi dan tanggal berlaku (lihat 4.3).
- FR-28 Rekap usulan disetujui per tahun/unit/kategori; ekspor `.xlsx`/`.csv`.
- FR-29 Log audit: siapa, kapan, aksi, nilai sebelum/sesudah (tidak dapat diubah).
- FR-30 Dashboard Admin: jumlah usulan per status, per unit, unit yang belum mengusulkan.

## 4. Spesifikasi Data Usulan

### 4.1 Kolom & Validasi

| # | Kolom | Wajib | Tipe | Aturan validasi |
|---|---|---|---|---|
| 1 | kode_kategori | Ya | Referensi master | Harus ada di master kode pengelompokan barang (Kepmendagri, lihat 4.3) dan aktif |
| 2 | uraian | Ya | Teks | Nama barang/jasa; maks 255 karakter |
| 3 | spek | Ya | Teks panjang | Spesifikasi teknis; maks 2.000 karakter |
| 4 | satuan | Ya | Referensi master | Dari master satuan (pilihan, bukan teks bebas) |
| 5 | harga | Ya | Rupiah (bilangan bulat) | > 0 |
| 6 | ongkir | Ya | Rupiah (bilangan bulat) | ≥ 0 (nilai 0 diperbolehkan, kolom tidak boleh kosong) |
| 7 | total | Otomatis | Rupiah | = harga + ongkir; dihitung server, dikunci; nilai dari file diabaikan atau dicek konsistensinya |
| 8 | rekening 1 | Ya | Referensi master | Kode rekening belanja terbaru (lihat 4.3) |
| 9 | rekening 2 | Tidak | Referensi master | Bila diisi harus valid; tidak boleh sama dengan rekening 1 |
| 10 | rekening 3 | Tidak | Referensi master | Bila diisi harus valid; rekening 2 harus terisi lebih dulu; tidak boleh duplikat |
| 11 | kelompok | Ya | Referensi master | Dari master kelompok |
| 12 | tahun | Ya | Angka 4 digit | Sama dengan tahun periode yang dibuka |
| 13 | link_katalog_1 | Ya | URL | Diawali `http://` atau `https://`, valid, maks 500 karakter |
| 14 | link_katalog_2 | Ya | URL | Sama seperti link 1 |
| 15 | link_katalog_3 | Ya | URL | Sama seperti link 1 |
| 16 | tkdn_1 | Ya | Persen | 0–100, maks 2 desimal |
| 17 | tkdn_2 | Tidak | Persen | 0–100 bila diisi |
| 18 | tkdn_3 | Tidak | Persen | 0–100 bila diisi |
| 19 | nama_pengusul | Ya | Teks | Otomatis dari akun; dapat diedit bila kebijakan mengizinkan |
| 20 | puskesmas/dinkes | Ya | Referensi master unit | Otomatis dari akun pengusul |

### 4.2 Aturan Tambahan
- **Duplikat:** kombinasi (unit + kode_kategori + uraian + spek + satuan + tahun) yang identik ditandai peringatan/ditolak; keputusan tegas atau peringatan ditentukan pada bagian pertanyaan terbuka.
- **Kelengkapan tautan:** tiap tautan katalog diharapkan berpasangan dengan TKDN yang sesuai (katalog 1 ↔ TKDN 1, dst.). Lihat pertanyaan terbuka nomor 2.
- **Normalisasi file:** pemisah ribuan, spasi ekstra, dan huruf besar/kecil pada kode dibersihkan otomatis sebelum validasi; angka dengan format Rupiah (`Rp 1.500.000`) dikonversi.

### 4.3 Master Data Berbasis Regulasi
Kode kategori dan kode rekening **tidak ditanam di kode program**, melainkan disimpan sebagai master data berversi supaya dapat diperbarui Admin tanpa rilis ulang.

- **Kode rekening** — mengacu klasifikasi, kodefikasi, dan nomenklatur keuangan daerah pada Permendagri 90/2019 sebagaimana ditetapkan dalam Kepmendagri 050-5889 Tahun 2021 beserta perubahannya. Perubahan terakhir yang ditemukan saat draft ini disusun adalah Kepmendagri 900.1-861 Tahun 2026 (Perubahan Keempat). Master dimuat dari lampiran versi terbaru.
- **Kode kategori** — mengacu Kepmendagri tentang kodefikasi/pengelompokan barang milik daerah (Kepmendagri 118 Tahun 2018 dan perubahannya, jika ada). Tim harus memastikan versi terbaru sebelum master dimuat.
- Setiap entri master memiliki: kode, uraian, status aktif/nonaktif, dasar hukum, tanggal berlaku. Kode yang dinonaktifkan tidak dapat dipilih untuk usulan baru, tetapi usulan lama tetap menyimpan riwayatnya.
- Kombinasi kategori ↔ rekening yang diperbolehkan dapat dibuat sebagai aturan pemetaan opsional (fase 2) untuk menangkap salah pasang kode.

## 5. Status & Alur Usulan

```
Draft ──ajukan──▶ Diajukan ──▶ Dalam Verifikasi ──┬─▶ Disetujui
  ▲                                               ├─▶ Perlu Perbaikan ──(pengusul revisi & ajukan ulang)──┐
  └──────────────────────────────────────────────┘                                                        │
                                                  └─▶ Ditolak                        ◀───────────────────┘
```

- Hanya status Draft dan Perlu Perbaikan yang dapat diubah pengusul.
- Disetujui bersifat terkunci; hanya Admin dapat membukanya kembali (dengan alasan tercatat).
- Riwayat setiap perubahan status disimpan beserta pelaku, waktu, dan catatan.

## 6. Kebutuhan Non-Fungsional

- **Keamanan:** kata sandi di-hash; kontrol akses berbasis peran diterapkan di server; pengusul hanya melihat data unitnya; HTTPS; proteksi unggahan (cek tipe MIME, ukuran, pemindaian makro pada xlsx, tanpa eksekusi rumus).
- **Kinerja:** validasi import 5.000 baris selesai di bawah 30 detik; daftar usulan dimuat di bawah 2 detik.
- **Ketersediaan:** tersedia selama jam kerja periode pengusulan, pencadangan harian.
- **Audit:** seluruh aksi penting dicatat dan tidak dapat dihapus melalui antarmuka.
- **Kompatibilitas:** peramban modern desktop; tampilan responsif untuk peninjauan di ponsel.
- **Waktu:** seluruh logika periode memakai waktu server WIB.

## 7. Model Data (Ringkas)

- `users` (id, nama, email, password_hash, role, unit_id, aktif)
- `units` (id, nama, jenis: puskesmas/dinkes)
- `periods` (id, nama, tahun, buka_at, tutup_at, masa_revisi_sampai, aktif)
- `period_overrides` (id, period_id, unit_id, sampai)
- `shs_items` (id, period_id, unit_id, user_id, kode_kategori, uraian, spek, satuan_id, harga, ongkir, total, rekening_1, rekening_2, rekening_3, kelompok_id, tahun, link_katalog_1..3, tkdn_1..3, nama_pengusul, status, created_at, updated_at)
- `verifications` (id, item_id, verifikator_id, keputusan, catatan, created_at)
- `import_batches` (id, user_id, period_id, nama_file, total_baris, berhasil, gagal, created_at) dan `import_errors` (batch_id, baris, kolom, pesan)
- `master_kategori`, `master_rekening`, `master_satuan`, `master_kelompok` (kode, uraian, aktif, dasar_hukum, berlaku_mulai)
- `audit_logs` (id, user_id, aksi, entitas, sebelum, sesudah, created_at)

## 8. Layar Utama

1. Login
2. Dashboard pengusul (status periode + hitung mundur, ringkasan status usulan)
3. Daftar usulan + form tambah/ubah
4. Import file (unduh template → unggah → pratinjau → hasil validasi)
5. Antrean & detail verifikasi
6. Admin: periode, pengguna, master data, rekap & ekspor, log audit

## 9. Kriteria Penerimaan (Contoh)

- Saat periode Ditutup, percobaan tambah/import via UI maupun API ditolak dengan pesan jelas.
- Unggahan berisi baris dengan rekening 1 kosong menghasilkan galat pada baris dan kolom tersebut; baris dengan rekening 2/3 dan TKDN 2/3 kosong tetap lolos.
- Total selalu sama dengan harga + ongkir dan tidak dapat diubah manual.
- Kode kategori/rekening yang tidak ada di master atau nonaktif ditolak.
- Pengusul unit A tidak dapat melihat atau mengubah usulan unit B.
- Usulan yang dikembalikan tampil dengan catatan verifikator dan dapat direvisi lalu diajukan ulang.

## 10. Metrik Keberhasilan

- ≥ 90% baris import lolos validasi pada percobaan kedua.
- Seluruh unit mengajukan sebelum penutupan periode tanpa perpanjangan.
- Waktu rata-rata verifikasi per item turun dibanding proses manual.

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Kepmendagri berubah di tengah periode | Master berversi + tanggal berlaku; Admin dapat memperbarui tanpa rilis |
| Pengusul mengunggah file dengan format kacau | Template baku, pratinjau, laporan galat yang dapat diunduh |
| Beban puncak menjelang penutupan | Validasi import berjalan asinkron; batas ukuran file |
| Tautan katalog mati | Pengecekan format saat input; pengecekan ketersediaan tautan sebagai fase 2 |

## 12. Pertanyaan Terbuka

1. Duplikat: ditolak keras atau hanya peringatan?
2. Link katalog 2 dan 3 wajib, tetapi TKDN 2 dan 3 opsional — apakah memang disengaja? Bila katalog 2/3 ada, TKDN pasangannya semestinya juga ada.
3. Apakah verifikasi bertingkat (mis. verifikator Dinkes lalu tim SHS/TAPD) diperlukan?
4. Apakah verifikator dibatasi per wilayah/unit atau melihat semua?
5. Apakah pengusul boleh mengedit `nama_pengusul` atau selalu mengikuti akun?
6. Berapa lama data lama (tahun sebelumnya) harus dapat diakses, dan apakah usulan tahun lalu boleh disalin sebagai dasar usulan baru?
7. Apakah diperlukan notifikasi email/WhatsApp selain notifikasi dalam aplikasi?
8. Daftar resmi kelompok dan satuan yang dipakai — apakah sudah ada?
