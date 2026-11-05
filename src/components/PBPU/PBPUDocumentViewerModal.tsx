// src/components/PBPU/PBPUDocumentViewerModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, FileText, Image as ImageIcon, Cloud } from 'lucide-react';
import { PBPUDocument } from '@/types/pbpu';
import {
  isGoogleDriveUrl,
  extractGoogleDriveFileId,
  getGoogleDrivePreviewUrl,
  getGoogleDriveDirectImageUrl,
  getGoogleDriveDownloadUrl,
} from '@/lib/googleDriveHelper';

interface PBPUDocumentViewerModalProps {
  document: PBPUDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PBPUDocumentViewerModal: React.FC<PBPUDocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!document) return null;

  const [imageError, setImageError] = useState(false);

  const isFromDrive = isGoogleDriveUrl(document.file_url);
  const driveFileId = isFromDrive ? extractGoogleDriveFileId(document.file_url) : null;

  const isImage =
    document.file_url.startsWith('data:image/') ||
    document.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(document.file_name);

  const isPdf =
    document.file_url.startsWith('data:application/pdf') ||
    document.mime_type === 'application/pdf' ||
    /\.pdf$/i.test(document.file_name);

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'KK':
        return 'Kartu Keluarga (KK)';
      case 'KTP':
        return 'Kartu Tanda Penduduk (KTP)';
      case 'DIAGNOSA_DPJP':
        return 'Surat Keterangan Diagnosa DPJP';
      case 'SKTM':
        return 'Surat Keterangan Tidak Mampu (SKTM)';
      case 'BUKTI_DESIL':
        return 'Bukti Desil 1–5';
      default:
        return 'Dokumen Pendukung';
    }
  };

  const handleDownload = () => {
    if (isFromDrive && driveFileId) {
      const downloadLink = getGoogleDriveDownloadUrl(document.file_url);
      window.open(downloadLink, '_blank');
      return;
    }

    const a = window.document.createElement('a');
    a.href = document.file_url;
    a.download = document.file_name || `dokumen-${document.document_type.toLowerCase()}`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  // Tentukan URL untuk rendering
  const renderImageUrl = isFromDrive
    ? getGoogleDriveDirectImageUrl(document.file_url)
    : document.file_url;

  const renderIframeUrl = isFromDrive
    ? getGoogleDrivePreviewUrl(document.file_url)
    : document.file_url;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                {getDocTypeLabel(document.document_type)}
              </span>
              {isFromDrive && (
                <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-bold gap-1">
                  <Cloud size={11} className="text-sky-600" />
                  Google Drive Storage
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-800">
              {document.file_name}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2 pr-6 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download size={14} /> Unduh
            </Button>
            {document.file_url.startsWith('http') && (
              <a
                href={document.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border text-xs font-semibold text-slate-700 hover:bg-slate-100 gap-1"
              >
                <ExternalLink size={14} /> {isFromDrive ? 'Buka di Drive' : 'Buka Tab'}
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-3 flex items-center justify-center min-h-[420px] bg-slate-900/5 rounded-2xl border border-slate-200/80 p-2">
          {/* 1. JIKA GAMBAR (KTP / KK) */}
          {isImage && !imageError ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <img
                src={renderImageUrl}
                alt={document.file_name}
                onError={() => setImageError(true)}
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-md border bg-white"
              />
            </div>
          ) : isPdf || (isFromDrive && imageError) ? (
            /* 2. JIKA PDF ATAU DOKUMEN GOOGLE DRIVE (EMBED IFRAME) */
            <div className="w-full h-full min-h-[460px] flex flex-col">
              <iframe
                src={renderIframeUrl}
                title={document.file_name}
                className="w-full h-[68vh] rounded-xl border border-slate-300 bg-white shadow-sm"
                allow="autoplay"
              />
            </div>
          ) : (
            /* 3. FORMAT LAINNYA */
            <div className="text-center p-8">
              <FileText size={48} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700">{document.file_name}</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Pratinjau langsung tidak tersedia untuk format file ini.
              </p>
              <Button size="sm" onClick={handleDownload} className="gap-2">
                <Download size={14} /> Unduh File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PBPUDocumentViewerModal;
