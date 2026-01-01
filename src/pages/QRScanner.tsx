// FILE: src/components/QRScanner.tsx - USING html5-qrcode (NO DEPENDENCY ISSUES)
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, Loader2 } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

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

    useEffect(() => {
        if (isOpen && !scannerRef.current) {
            setInitializing(true);

            setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "qr-reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                    },
                    false
                );

                scanner.render(
                    (decodedText) => {
                        if (!scanning) {
                            setScanning(true);
                            onScan(decodedText);

                            setTimeout(() => {
                                setScanning(false);
                                if (scannerRef.current) {
                                    scannerRef.current.clear().catch(() => {});
                                    scannerRef.current = null;
                                }
                                setIsOpen(false);
                            }, 1500);
                        }
                    },
                    () => {
                        // Ignore scan errors
                    }
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
                    <Button variant="outline">
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Scanner
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-md">
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

                <div id="qr-reader" className="w-full"></div>

                {scanning && (
                    <div className="text-center py-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold">Scanned Successfully!</span>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}