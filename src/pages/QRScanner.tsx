// FILE: src/components/QRScanner.tsx
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, Loader2, Volume2 } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

// Simple beep sound data URI to avoid external file dependencies
const BEEP_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU";

interface QRScannerProps {
    onScan: (data: string) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function QRScanner({ onScan, open, onOpenChange }: QRScannerProps) {
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

            // Small delay to ensure DOM is ready
            setTimeout(() => {
                // Ensure previous instance is cleared if it exists in DOM but not ref
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

                            // 1. Play Sound
                            playBeep();

                            // 2. Return Data
                            onScan(decodedText);

                            // 3. Close with delay for visual feedback
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
                    (errorMessage) => {
                        // console.log(errorMessage); // Ignore scan errors to keep console clean
                    }
                );

                scannerRef.current = scanner;
                setInitializing(false);
            }, 100);
        }

        // Cleanup on unmount or close
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
                    <Button variant="outline">
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Scanner
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

                <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>

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