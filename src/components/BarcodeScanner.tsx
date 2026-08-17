import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose, lang }) => {
  const qrRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "reader-element";

  useEffect(() => {
    let started = false;

    // Start with a small timeout to let the modal animate and DOM container mount fully
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5Qrcode(scannerId);
        qrRef.current = scanner;
        const config = { 
          fps: 15, 
          qrbox: { width: 260, height: 260 } 
        };

        scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          () => {
            // Quiet fail for scan errors to keep UX smooth
          }
        ).then(() => {
          started = true;
        }).catch((err) => {
          console.error("Failed to start barcode scanner:", err);
        });
      } catch (e) {
        console.error("Barcode scanner initialization error:", e);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (qrRef.current) {
        try {
          if (qrRef.current.isScanning) {
            qrRef.current.stop().then(() => {
              qrRef.current?.clear();
            }).catch(e => console.error("Error stopping scanner:", e));
          }
        } catch (e) {
          console.error("Error cleaning up scanner:", e);
        }
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            {lang === 'ar' ? 'مسح الباركود للكاميرا' : 'Scan Product Barcode'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="p-6">
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-video flex items-center justify-center border-2 border-slate-950">
            
            {/* The html5-qrcode target element */}
            <div id={scannerId} className="w-full h-full object-cover" />

            {/* Glowing Scan Bar Animation */}
            <div className="absolute inset-x-8 top-12 h-0.5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
          </div>

          <p className="text-center text-sm font-medium text-slate-500 mt-4 leading-relaxed">
            {lang === 'ar' 
              ? 'وجه كاميرا هاتفك نحو ملصق الباركود الخاص بالمنتج' 
              : 'Hold your camera focused directly on the item\'s barcode'}
          </p>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-semibold border border-slate-200 transition-colors shadow-sm"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close Camera'}
          </button>
        </div>

      </div>
    </div>
  );
};
