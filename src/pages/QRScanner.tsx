// FILE: src/components/QRScanner.tsx
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, Loader2, Volume2, ScanLine } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { cn } from '@/lib/utils';

// Beep sound
const BEEP_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU";

interface QRScannerProps {
    onScan: (data: string) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string; // NEW: Allow custom styling
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "hero"; // NEW: Allow custom variants
}

export function QRScanner({ onScan, open, onOpenChange, className, variant = "outline" }: QRScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    const playBeep = () => {
        try {
            const audio = new Audio(BEEP_SOUND);
            audio.play().catch(e => console.error("Audio play failed", e));
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    useEffect(() => {
        if (isOpen && !scannerRef.current) {
            setInitializing(true);
            setTimeout(() => {
                const element = document.getElementById("qr-reader");
                if (element) element.innerHTML = "";

                const scanner = new Html5QrcodeScanner(
                    "qr-reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                        showTorchButtonIfSupported: true
                    },
                    false
                );

                scanner.render(
                    (decodedText) => {
                        if (!scanning) {
                            setScanning(true);
                            playBeep();
                            onScan(decodedText);
                            setTimeout(() => {
                                setScanning(false);
                                if (scannerRef.current) {
                                    scannerRef.current.clear().catch(() => {});
                                    scannerRef.current = null;
                                }
                                setIsOpen(false);
                            }, 1000);
                        }
                    },
                    () => {}
                );

                scannerRef.current = scanner;
                setInitializing(false);
            }, 100);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {open === undefined && (
                <DialogTrigger asChild>
                    <Button variant={variant} className={cn("gap-2", className)}>
                        <ScanLine className="w-4 h-4" />
                        <span className="hidden sm:inline">Scan ID</span>
                        <span className="inline sm:hidden">Scan</span>
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Scan Student ID Card
                    </DialogTitle>
                </DialogHeader>

                {initializing && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                <div id="qr-reader" className="w-full rounded-lg overflow-hidden border-2 border-slate-100"></div>

                {scanning && (
                    <div className="text-center py-4 animate-in fade-in zoom-in">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg shadow-sm border border-green-200">
                            <Volume2 className="w-4 h-4" />
                            <span className="font-semibold">Scanned Successfully!</span>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}