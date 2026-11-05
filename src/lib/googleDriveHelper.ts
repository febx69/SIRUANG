// src/lib/googleDriveHelper.ts

/**
 * Helper untuk integrasi penyimpanan dokumen ke Google Drive.
 * Mendukung ekstraksi file ID, URL preview untuk iframe, direct link untuk gambar (<img>),
 * serta fungsi upload via Google Apps Script (GAS) Web App.
 */

// URL endpoint default Google Apps Script Web App (bisa diisi via .env: VITE_GOOGLE_DRIVE_WEBAPP_URL)
export const DEFAULT_GAS_WEBAPP_URL =
  (import.meta as any).env?.VITE_GOOGLE_DRIVE_WEBAPP_URL ||
  'https://script.google.com/macros/s/AKfycbxemvjLQ2WHVx9ic5nUe8guzXhl0cLz1qgHCIII4riopT6wRHVtg_rrBR0K7414zZZ9/exec';

/**
 * Mengecek apakah URL berasal dari Google Drive
 */
export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.includes('drive.google.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('docs.google.com')
  );
}

/**
 * Mengekstrak File ID dari berbagai format URL Google Drive:
 * - https://drive.google.com/file/d/{FILE_ID}/view
 * - https://drive.google.com/file/d/{FILE_ID}/preview
 * - https://drive.google.com/uc?id={FILE_ID}
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://lh3.googleusercontent.com/d/{FILE_ID}
 */
export function extractGoogleDriveFileId(url?: string | null): string | null {
  if (!url) return null;
  // Format /d/{id}
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  // Format id={id}
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  // Jika URL adalah ID langsung (string alphanumeric 25-45 char)
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

/**
 * Menghasilkan URL Iframe Preview Google Drive yang valid (tidak terblokir X-Frame-Options)
 */
export function getGoogleDrivePreviewUrl(urlOrId: string): string {
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return urlOrId;
}

/**
 * Menghasilkan direct image stream URL untuk tag <img>
 */
export function getGoogleDriveDirectImageUrl(urlOrId: string): string {
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return urlOrId;
}

/**
 * Menghasilkan URL download langsung dari Google Drive
 */
export function getGoogleDriveDownloadUrl(urlOrId: string): string {
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return urlOrId;
}

export interface DriveUploadResponse {
  success: boolean;
  fileId?: string;
  previewUrl?: string;
  directUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Mengunggah file ke Google Drive via endpoint Google Apps Script
 */
export async function uploadFileToGoogleDrive(
  fileOrData: File | { filename: string; mimetype: string; base64: string },
  folderName: string = 'PBPU_BP_Dinkes_Pamekasan',
  webAppUrl: string = DEFAULT_GAS_WEBAPP_URL
): Promise<DriveUploadResponse> {
  if (!webAppUrl) {
    return {
      success: false,
      error: 'URL Web App Google Apps Script belum disetel.',
    };
  }

  try {
    let filename = '';
    let mimetype = 'application/octet-stream';
    let base64Data = '';

    if ('base64' in fileOrData) {
      filename = fileOrData.filename;
      mimetype = fileOrData.mimetype;
      base64Data = fileOrData.base64;
    } else {
      filename = fileOrData.name;
      mimetype = fileOrData.type || 'application/octet-stream';
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrData);
      });
    }

    const payload = {
      filename,
      mimetype,
      base64: base64Data,
      folderName,
    };

    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Hindari preflight CORS ketat pada Google Apps Script
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result && result.status === 'success' && result.fileId) {
      return {
        success: true,
        fileId: result.fileId,
        previewUrl: `https://drive.google.com/file/d/${result.fileId}/preview`,
        directUrl: `https://lh3.googleusercontent.com/d/${result.fileId}`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${result.fileId}`,
        fileName: filename,
      };
    }

    return {
      success: false,
      error: result?.message || 'Gagal mengunggah file ke Google Drive',
    };
  } catch (err: any) {
    console.error('Error uploadFileToGoogleDrive:', err);
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan jaringan saat mengunggah ke Google Drive',
    };
  }
}

