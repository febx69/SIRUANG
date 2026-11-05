/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: Webhook Upload Berkas PBPU BP SIRUANG ke Google Drive
 * ==============================================================================
 * 
 * PANDUAN PEMASANGAN (Cukup 1 Menit):
 * 1. Buka https://script.google.com di akun Google Drive Dinkes / Admin.
 * 2. Klik "Proyek Baru" (New Project).
 * 3. Hapus kode yang ada, lalu salin dan tempel SELURUH KODE di file ini.
 * 4. Klik "Terapkan" (Deploy) -> "Penerapan Baru" (New deployment).
 * 5. Pilih jenis: "Aplikasi Web" (Web App).
 * 6. Konfigurasi:
 *    - Deskripsi: Upload Berkas PBPU BP SIRUANG
 *    - Jalankan sebagai (Execute as): "Saya" (Akun Google Anda)
 *    - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone)
 * 7. Klik "Terapkan", berikan izin akses (Authorize access).
 * 8. Salin "URL Aplikasi Web" (Web App URL) yang dihasilkan.
 * 9. Tempelkan URL tersebut ke konfigurasi SIRUANG (.env: VITE_GOOGLE_DRIVE_WEBAPP_URL).
 * ==============================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Tidak ada data yang dikirim.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var filename = payload.filename || ('Berkas_' + new Date().getTime());
    var mimetype = payload.mimetype || 'application/octet-stream';
    var base64Data = payload.base64;
    var folderName = payload.folderName || 'PBPU_BP_Dinkes_Pamekasan';

    if (!base64Data) {
      return responseJSON({ status: 'error', message: 'Data base64 file kosong.' });
    }

    // Bersihkan header Data URL jika ada (contoh: "data:image/jpeg;base64,")
    var cleanBase64 = base64Data;
    if (base64Data.indexOf(';base64,') !== -1) {
      cleanBase64 = base64Data.split(';base64,')[1];
    }

    // Decode base64 menjadi file Blob
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, mimetype, filename);

    // Cari atau buat folder induk PBPU_BP di Google Drive
    var parentFolder = getOrCreateFolder(folderName);

    // Buat sub-folder berdasarkan tahun & bulan (contoh: 2026/November) agar rapi
    var now = new Date();
    var yearFolder = getOrCreateSubFolder(parentFolder, String(now.getFullYear()));
    var monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var monthFolder = getOrCreateSubFolder(yearFolder, monthNames[now.getMonth()]);

    // Simpan file ke dalam sub-folder
    var file = monthFolder.createFile(blob);

    // Atur izin file agar bisa dilihat oleh siapapun yang memiliki link (agar bisa tampil di aplikasi)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var previewUrl = 'https://drive.google.com/file/d/' + fileId + '/preview';
    var directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    var viewUrl = file.getUrl();

    return responseJSON({
      status: 'success',
      fileId: fileId,
      previewUrl: previewUrl,
      directUrl: directUrl,
      viewUrl: viewUrl,
      fileName: filename,
      folder: folderName + '/' + now.getFullYear() + '/' + monthNames[now.getMonth()]
    });

  } catch (error) {
    return responseJSON({
      status: 'error',
      message: error.toString()
    });
  }
}

// Endpoint GET untuk pengetesan koneksi (Health Check)
function doGet(e) {
  return responseJSON({
    status: 'ok',
    service: 'SIRUANG Google Drive Upload Gateway',
    timestamp: new Date().toISOString()
  });
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateSubFolder(parentFolder, subFolderName) {
  var folders = parentFolder.getFoldersByName(subFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subFolderName);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

