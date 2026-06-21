import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onClear?: () => void;
    defaultValue?: string;
    height?: string;
}

export function SignaturePad({ onSave, onClear, defaultValue, height = 'h-64' }: SignaturePadProps) {
    const signatureRef = useRef<SignatureCanvas>(null);

    const handleClear = () => {
        if (signatureRef.current) {
            signatureRef.current.clear();
            if (onClear) onClear();
        }
    };

    const handleTrim = () => {
        if (signatureRef.current) {
            if (signatureRef.current.isEmpty()) {
                return;
            }
            try {
                // Try to get trimmed version (removes whitespace)
                const dataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
                onSave(dataUrl);
            } catch (err) {
                console.warn('Trim failed, falling back to full canvas:', err);
                // Fallback to full canvas if trimming fails
                const dataUrl = signatureRef.current.getCanvas().toDataURL('image/png');
                onSave(dataUrl);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative bg-surface-50 border border-surface-200 rounded-lg overflow-hidden">
                <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{
                        className: `signature-canvas w-full ${height} cursor-crosshair`,
                    }}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-2 bg-white border border-surface-200 rounded-md text-surface-500 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                        title="Clear Signature"
                    >
                        <Eraser size={16} />
                    </button>
                </div>
            </div>
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleTrim}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-emerald-700 transition-all shadow-sm"
                >
                    <Check size={14} /> Confirm Signature
                </button>
            </div>
        </div>
    );
}
