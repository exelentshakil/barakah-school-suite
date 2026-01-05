// FILE: src/components/AttendanceKiosk.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { X, History, TrendingUp, CheckCircle2, Timer, UserX, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { AttendanceScanner } from './AttendanceScanner.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';

interface AttendanceRecord {
    id: string;
    student_id: string;
    name_en: string;
    roll?: number;
    class_name?: string;
    status: string;
    created_at: string;
    time: string;
}

interface AttendanceKioskProps {
    date: string;
    todayAttendance: AttendanceRecord[];
    todayScans: number;
    onScan: (studentId: string) => void;
    onExit: () => void;
}

export function AttendanceKiosk({ date, todayAttendance, todayScans, onScan, onExit }: AttendanceKioskProps) {
    return (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col lg:flex-row">
            {/* Toast container for kiosk mode */}
            <Toaster />

            {/* Left: Scanner */}
            <div className="flex-1 flex flex-col p-4 lg:p-8 relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white border-0 h-10 w-10"
                    onClick={onExit}
                >
                    <X className="w-5 h-5" />
                </Button>

                <div className="flex-1 flex flex-col items-center justify-center space-y-4 lg:space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl lg:text-5xl font-black">Attendance Check-In</h1>
                        <p className="text-slate-400 text-lg">Scan your student ID card</p>
                        <Badge variant="outline" className="bg-indigo-950/50 text-indigo-200 border-indigo-800 mt-2">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </Badge>
                    </div>

                    <div className="w-full max-w-md lg:max-w-lg">
                        <AttendanceScanner
                            onScan={onScan}
                            isActive={true}
                            className="rounded-2xl lg:rounded-3xl border-2 lg:border-4 border-slate-700"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-green-400 bg-green-950/50 px-4 lg:px-6 py-2 lg:py-3 rounded-full border border-green-800 animate-pulse">
                            <div className="w-2 lg:w-3 h-2 lg:h-3 bg-green-500 rounded-full"></div>
                            <span className="font-semibold text-sm lg:text-base">Scanner Active</span>
                        </div>
                        <Badge className="bg-indigo-950/50 text-indigo-300 border-indigo-800 px-3 lg:px-4 py-1.5 lg:py-2">
                            <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 mr-2" />
                            {todayScans} today
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Right: Live Feed */}
            <div className="w-full lg:w-[400px] bg-slate-900/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-slate-700 p-4 lg:p-6 flex flex-col max-h-[40vh] lg:max-h-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
                        <History className="w-5 h-5" /> Live Feed
                    </h2>
                    <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {todayAttendance.length}
                    </Badge>
                </div>

                <ScrollArea className="flex-1">
                    {todayAttendance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                            <ScanLine className="w-12 h-12 mb-2 opacity-20" />
                            <p>Waiting for scans...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {todayAttendance.slice(0, 20).map((record) => (
                                <div
                                    key={record.id}
                                    className={cn(
                                        "bg-slate-800/80 p-3 lg:p-4 rounded-xl border-2 flex items-center gap-3 animate-in slide-in-from-right-5 fade-in",
                                        record.status === 'present' && "border-green-700",
                                        record.status === 'late' && "border-orange-700",
                                        record.status === 'absent' && "border-red-700"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center shrink-0",
                                        record.status === 'present' && "bg-green-600",
                                        record.status === 'late' && "bg-orange-600",
                                        record.status === 'absent' && "bg-red-600"
                                    )}>
                                        {record.status === 'present' && <CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6" />}
                                        {record.status === 'late' && <Timer className="w-5 h-5 lg:w-6 lg:h-6" />}
                                        {record.status === 'absent' && <UserX className="w-5 h-5 lg:w-6 lg:h-6" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate text-sm lg:text-base">{record.name_en}</p>
                                        <p className="text-xs lg:text-sm text-slate-400 truncate">
                                            {record.class_name || record.student_id}
                                            {record.roll && ` • Roll ${record.roll}`}
                                        </p>
                                    </div>

                                    <span className="text-xs text-slate-500 shrink-0">{record.time}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}