// src/components/Cleanliness/PhotoLightboxModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  ExternalLink,
  Download
} from "lucide-react";

export interface LightboxPhotoInfo {
  url: string;
  title?: string;
  subtitle?: string;
  date?: string;
  note?: string;
}

interface PhotoLightboxModalProps {
  photo: LightboxPhotoInfo | null;
  onClose: () => void;
}

export const PhotoLightboxModal = ({ photo, onClose }: PhotoLightboxModalProps) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset transform saat ganti foto
  useEffect(() => {
    if (photo) {
      setScale(1);
      setRotation(0);
    }
  }, [photo]);

  if (!photo) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.35, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.35, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `dokumentasi-kebersihan-${Date.now()}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={Boolean(photo)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl h-[90vh] p-0 overflow-hidden bg-slate-950/95 border-slate-800 text-white flex flex-col justify-between shadow-2xl backdrop-blur-md">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 z-10 shrink-0">
          <div className="flex flex-col truncate pr-2">
            <h4 className="text-sm md:text-base font-semibold text-slate-100 truncate">
              {photo.title || "Dokumentasi Foto Kebersihan"}
            </h4>
            {photo.subtitle && (
              <p className="text-xs text-slate-400 truncate">{photo.subtitle}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Perkecil (Zoom Out)"
            >
              <ZoomOut size={16} />
            </Button>
            <span className="text-xs text-slate-400 font-mono px-1 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Perbesar (Zoom In)"
            >
              <ZoomIn size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotate}
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Putar 90°"
            >
              <RotateCw size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Reset Tampilan"
            >
              <Maximize2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Download Gambar"
            >
              <Download size={16} />
            </Button>
            <div className="w-[1px] h-5 bg-slate-700 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-rose-400 hover:text-rose-200 hover:bg-rose-900/30"
              title="Tutup (ESC)"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Center Canvas / Image Container */}
        <div className="flex-1 relative overflow-auto flex items-center justify-center p-4 select-none cursor-grab active:cursor-grabbing">
          <img
            src={photo.url}
            alt={photo.title || "Foto Dokumentasi"}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
              maxHeight: "72vh",
              maxWidth: "85vw",
              objectFit: "contain",
            }}
            className="rounded-lg shadow-2xl transition-all"
            draggable={false}
          />
        </div>

        {/* Bottom Details Footer */}
        {photo.note && (
          <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2 shrink-0">
            <span className="font-semibold text-emerald-400 shrink-0">Catatan:</span>
            <p className="line-clamp-2">{photo.note}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
