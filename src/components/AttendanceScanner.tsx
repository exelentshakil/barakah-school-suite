// FILE: src/components/AttendanceScanner.tsx
import { useRef, useEffect, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Loader2, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface AttendanceScannerProps {
    onScan: (studentId: string) => void;
    isActive: boolean;
    className?: string;
}

export function AttendanceScanner({ onScan, isActive, className }: AttendanceScannerProps) {
    const [initializing, setInitializing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const readerRef = useRef<BrowserQRCodeReader | null>(null);
    const lastScanRef = useRef<string>("");
    const lastScanTimeRef = useRef<number>(0);

    useEffect(() => {
        if (isActive) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isActive]);

    const stopScanner = async () => {
        if (controlsRef.current) {
            try {
                controlsRef.current.stop();
                controlsRef.current = null;
            } catch (err) {
                console.error("Stop error:", err);
            }
        }

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const startScanner = async () => {
        if (!videoRef.current || controlsRef.current) return;

        setInitializing(true);

        try {
            if (!readerRef.current) {
                readerRef.current = new BrowserQRCodeReader();
            }

            const controls = await readerRef.current.decodeFromVideoDevice(
                undefined,
                videoRef.current,
                (result) => {
                    if (result) {
                        const text = result.getText();
                        const now = Date.now();

                        // Debounce - prevent same scan within 2 seconds
                        if (text === lastScanRef.current && now - lastScanTimeRef.current < 2000) {
                            return;
                        }

                        lastScanRef.current = text;
                        lastScanTimeRef.current = now;

                        onScan(text.trim());
                    }
                }
            );

            controlsRef.current = controls;
            setInitializing(false);
        } catch (err) {
            console.error("Camera error:", err);
            setInitializing(false);
        }
    };

    return (
        <div className={cn("aspect-square w-full bg-black rounded-lg overflow-hidden relative", className)}>
            {!isActive && !initializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <QrCode className="w-16 h-16 mb-3 opacity-30" />
                    <p className="text-sm">Scanner inactive</p>
                </div>
            )}

            {initializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">Starting camera...</p>
                </div>
            )}

            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
            />

            {isActive && !initializing && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-green-500 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
                    </div>
                </div>
            )}
        </div>
    );
}