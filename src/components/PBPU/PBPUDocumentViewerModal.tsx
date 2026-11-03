// src/components/PBPU/PBPUDocumentViewerModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { PBPUDocument } from '@/types/pbpu';

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

  const isImage =
    document.file_url.startsWith('data:image/') ||
    document.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(document.file_name);

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
    const a = window.document.createElement('a');
    a.href = document.file_url;
    a.download = document.file_name || `dokumen-${document.document_type.toLowerCase()}`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-full">
              {getDocTypeLabel(document.document_type)}
            </span>
            <DialogTitle className="text-lg font-bold text-slate-800 mt-1">
              {document.file_name}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 pr-6">
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
                className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border text-xs font-semibold text-slate-600 hover:bg-slate-100 gap-1"
              >
                <ExternalLink size={14} /> Buka Tab
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 flex items-center justify-center min-h-[300px] bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          {isImage ? (
            <img
              src={document.file_url}
              alt={document.file_name}
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : isPdf ? (
            <iframe
              src={document.file_url}
              title={document.file_name}
              className="w-full h-[65vh] rounded-lg border border-slate-200"
            />
          ) : (
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

