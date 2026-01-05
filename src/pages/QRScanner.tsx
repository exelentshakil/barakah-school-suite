// FILE: src/pages/Attendance.tsx
import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import {
    CheckCircle2,
    Clock,
    Users,
    Loader2,
    History,
    RefreshCw,
    ShieldCheck,
    ListChecks,
    QrCode,
    ScanLine,
    AlertCircle,
    UserCheck,
    UserX,
    Timer,
    Download,
    Search,
    TrendingUp,
    Video,
    VideoOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanRecord {
    id: string;
    student_id: string;
    name_en: string;
    roll?: number;
    class_name?: string;
    time: string;
    status: 'success' | 'already_in' | 'not_found' | 'error';
    _timestamp: number;
}

export default function Attendance() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState("scanner");
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0, percentage: 0 });
    const [allowedClasses, setAllowedClasses] = useState<string[]>([]);

    // QR Scanner state
    const [scannerActive, setScannerActive] = useState(false);
    const [scannerInitializing, setScannerInitializing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const readerRef = useRef<BrowserQRCodeReader | null>(null);
    const lastScanRef = useRef<string>("");
    const lastScanTimeRef = useRef<number>(0);

    const todayScans = recentScans.filter(scan => scan.status === 'success').length;

    useEffect(() => { loadTeacherAccess(); }, [user]);
    useEffect(() => {
        if (user?.role === 'admin' || allowedClasses.length > 0) loadClasses();
    }, [allowedClasses, user]);

    useEffect(() => {
        if (selectedClass) {
            loadSections();
            loadStudentsAndAttendance();
        } else {
            setStudents([]);
        }
    }, [selectedClass, selectedSection, date]);

    useEffect(() => { calculateStats(); }, [attendance, students]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRecentScans(prev =>
                prev.filter(scan => (Date.now() - scan._timestamp) < 600000) // Keep 10 minutes
            );
        }, 60000);

        return () => clearInterval(interval);
    }, []);


    console.log(recentScans);

    // QR Scanner cleanup
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    const loadTeacherAccess = async () => {
        if (!user || user.role === 'admin' || user.role === 'accountant') return;
        if (user.role === 'teacher') {
            const { data } = await supabase.from('teacher_assignments').select('class_id').eq('user_id', user.id);
            if (data) setAllowedClasses(data.map(d => d.class_id));
        }
    };

    const loadClasses = async () => {
        let query = supabase.from('classes').select('*').order('display_order');
        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('id', allowedClasses);
        }
        const { data } = await query;
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        const { data } = await supabase.from('sections').select('*').eq('class_id', selectedClass);
        if (data) setSections(data);
    };

    const loadStudentsAndAttendance = async () => {
        if (!selectedClass) return;
        setLoading(true);
        try {
            let query = supabase.from('students')
                .select('id, name_en, student_id, roll, photo_url, class_id')
                .eq('class_id', selectedClass)
                .eq('status', 'active')
                .order('roll');

            if (selectedSection) query = query.eq('section_id', selectedSection);
            const { data: studentsData } = await query;
            if (studentsData) setStudents(studentsData);

            const { data: attendanceData } = await supabase.from('attendance')
                .select('student_id, status')
                .eq('date', date)
                .in('student_id', studentsData?.map(s => s.id) || []);

            const attendanceMap: Record<string, string> = {};
            attendanceData?.forEach(r => { attendanceMap[r.student_id] = r.status; });
            setAttendance(attendanceMap);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (students.length === 0) {
            setStats({ present: 0, absent: 0, late: 0, total: 0, percentage: 0 });
            return;
        }

        let p = 0, a = 0, l = 0;
        Object.values(attendance).forEach(status => {
            if (status === 'present') p++;
            if (status === 'absent') a++;
            if (status === 'late') l++;
        });

        const percentage = students.length > 0 ? Math.round((p / students.length) * 100) : 0;
        setStats({ present: p, absent: a, late: l, total: students.length, percentage });
    };

    const handleStatusChange = async (studentId: string, status: string) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
        setIsSyncing(true);
        try {
            await supabase.from('attendance').upsert(
                { student_id: studentId, date: date, status: status },
                { onConflict: 'student_id,date' }
            );
        } catch (error) {
            toast({ title: "Sync Error", variant: "destructive" });
        } finally {
            setTimeout(() => setIsSyncing(false), 500);
        }
    };

    const markAll = async (status: string) => {
        const newAttendance = { ...attendance };
        students.forEach(s => { newAttendance[s.id] = status; });
        setAttendance(newAttendance);
        setIsSyncing(true);
        try {
            const records = students.map(s => ({ student_id: s.id, date: date, status: status }));
            await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' });
            toast({ title: `✓ Marked ${students.length} students as ${status}` });
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

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

        setScannerActive(false);
    };

    const startScanner = async () => {
        if (!videoRef.current || controlsRef.current) return;

        setScannerInitializing(true);

        try {
            if (!readerRef.current) {
                readerRef.current = new BrowserQRCodeReader();
            }

            const controls = await readerRef.current.decodeFromVideoDevice(
                undefined,
                videoRef.current,
                (result, error) => {
                    if (result) {
                        const text = result.getText();
                        handleQRScan(text);
                    }
                }
            );

            controlsRef.current = controls;
            setScannerActive(true);
            setScannerInitializing(false);
        } catch (err) {
            console.error("Camera error:", err);
            setScannerInitializing(false);
            toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
        }
    };

    const toggleScanner = () => {
        if (scannerActive) {
            stopScanner();
        } else {
            startScanner();
        }
    };

    const handleQRScan = async (scannedText: string) => {
        const studentId = scannedText.trim();
        const now = Date.now();

        // Debounce - prevent same scan within 2 seconds
        if (studentId === lastScanRef.current && now - lastScanTimeRef.current < 2000) {
            return;
        }

        lastScanRef.current = studentId;
        lastScanTimeRef.current = now;

        const scanTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const scanId = `${studentId}-${now}`;

        try {
            const { data: dbStudent, error } = await supabase
                .from('students')
                .select(`
                    id, 
                    name_en, 
                    student_id, 
                    class_id, 
                    roll,
                    classes!inner(name)
                `)
                .eq('student_id', studentId)
                .single();

            if (error || !dbStudent) {
                const notFoundScan: ScanRecord = {
                    id: scanId,
                    student_id: studentId,
                    time: scanTime,
                    status: 'not_found',
                    name_en: 'Unknown Student',
                    _timestamp: now
                };
                setRecentScans(prev => [notFoundScan, ...prev.slice(0, 29)]);
                toast({
                    title: "❌ Not Found",
                    description: `Student ID: ${studentId}`,
                    variant: "destructive"
                });
                return;
            }

            if (user?.role === 'teacher' && allowedClasses.length > 0 && !allowedClasses.includes(dbStudent.class_id)) {
                toast({
                    title: "🚫 Restricted",
                    description: "Not in your assigned classes",
                    variant: "destructive"
                });
                return;
            }

            const { data: existingRecord } = await supabase
                .from('attendance')
                .select('status')
                .eq('student_id', dbStudent.id)
                .eq('date', date)
                .maybeSingle();

            if (existingRecord && existingRecord.status === 'present') {
                const alreadyScan: ScanRecord = {
                    id: scanId,
                    student_id: dbStudent.student_id,
                    name_en: dbStudent.name_en,
                    roll: dbStudent.roll,
                    class_name: dbStudent.classes?.name,
                    time: scanTime,
                    status: 'already_in',
                    _timestamp: now
                };
                setRecentScans(prev => [alreadyScan, ...prev.slice(0, 29)]);
                toast({
                    title: "ℹ️ Already Present",
                    description: dbStudent.name_en,
                    className: "bg-blue-50 border-blue-200"
                });
                return;
            }

            await supabase.from('attendance').upsert(
                { student_id: dbStudent.id, date: date, status: 'present' },
                { onConflict: 'student_id,date' }
            );

            if (students.find(s => s.id === dbStudent.id)) {
                setAttendance(prev => ({ ...prev, [dbStudent.id]: 'present' }));
            }

            const successScan: ScanRecord = {
                id: scanId,
                student_id: dbStudent.student_id,
                name_en: dbStudent.name_en,
                roll: dbStudent.roll,
                class_name: dbStudent.classes?.name,
                time: scanTime,
                status: 'success',
                _timestamp: now
            };

            setRecentScans(prev => [successScan, ...prev.slice(0, 29)]);

            toast({
                title: "✅ Welcome!",
                description: dbStudent.name_en,
                className: "bg-green-50 border-green-200 text-green-800"
            });
        } catch (error) {
            console.error("Scan error:", error);
        }
    };

    const exportAttendance = () => {
        if (students.length === 0) return;

        const data = students.map(s => ({
            Roll: s.roll,
            'Student ID': s.student_id,
            Name: s.name_en,
            Status: attendance[s.id] || 'unmarked'
        }));

        const csv = [
            Object.keys(data[0]).join(','),
            ...data.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${date}.csv`;
        a.click();

        toast({ title: "✓ Exported" });
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.student_id.toLowerCase().includes(searchQuery.toLowerCase());

        if (filterStatus === 'all') return matchesSearch;
        if (filterStatus === 'present') return matchesSearch && attendance[student.id] === 'present';
        if (filterStatus === 'absent') return matchesSearch && attendance[student.id] === 'absent';
        if (filterStatus === 'late') return matchesSearch && attendance[student.id] === 'late';
        if (filterStatus === 'unmarked') return matchesSearch && !attendance[student.id];

        return matchesSearch;
    });

    return (
        <MainLayout>
            <div className="flex flex-col gap-4 h-full">
                {/* Header */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    <UserCheck className="w-5 h-5" />
                                    Attendance
                                </h1>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    {isSyncing ? (
                                        <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing...</>
                                    ) : (
                                        <><ShieldCheck className="w-3 h-3 text-green-500" /> Saved</>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="border-0 bg-transparent h-auto w-auto p-0 focus-visible:ring-0 text-sm"
                                    />
                                </div>

                                {students.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={exportAttendance}>
                                        <Download className="w-3 h-3 mr-1" />
                                        Export
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        {selectedClass && students.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mt-4">
                                <div className="bg-blue-50 p-2 rounded-lg text-center">
                                    <p className="text-xl font-bold text-blue-900">{stats.total}</p>
                                    <p className="text-[10px] text-blue-700">Total</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg text-center">
                                    <p className="text-xl font-bold text-green-900">{stats.present}</p>
                                    <p className="text-[10px] text-green-700">Present</p>
                                </div>
                                <div className="bg-red-50 p-2 rounded-lg text-center">
                                    <p className="text-xl font-bold text-red-900">{stats.absent}</p>
                                    <p className="text-[10px] text-red-700">Absent</p>
                                </div>
                                <div className="bg-orange-50 p-2 rounded-lg text-center">
                                    <p className="text-xl font-bold text-orange-900">{stats.late}</p>
                                    <p className="text-[10px] text-orange-700">Late</p>
                                </div>
                                <div className="bg-indigo-50 p-2 rounded-lg text-center">
                                    <p className="text-xl font-bold text-indigo-900">{stats.percentage}%</p>
                                    <p className="text-[10px] text-indigo-700">Rate</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== 'scanner') stopScanner(); }} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="scanner" className="gap-2">
                            <QrCode className="w-4 h-4" /> QR Scanner
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="gap-2">
                            <ListChecks className="w-4 h-4" /> Manual
                        </TabsTrigger>
                    </TabsList>

                    {/* SCANNER TAB */}
                    <TabsContent value="scanner" className="flex-1 mt-4 min-h-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                            {/* Scanner Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>QR Scanner</span>
                                        <Button
                                            size="sm"
                                            variant={scannerActive ? "destructive" : "default"}
                                            onClick={toggleScanner}
                                            disabled={scannerInitializing}
                                        >
                                            {scannerInitializing ? (
                                                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Starting...</>
                                            ) : scannerActive ? (
                                                <><VideoOff className="w-4 h-4 mr-1" /> Stop</>
                                            ) : (
                                                <><Video className="w-4 h-4 mr-1" /> Start</>
                                            )}
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="aspect-square w-full bg-black rounded-lg overflow-hidden relative">
                                        {!scannerActive && !scannerInitializing && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                                <QrCode className="w-16 h-16 mb-3 opacity-30" />
                                                <p className="text-sm">Click Start to begin scanning</p>
                                            </div>
                                        )}

                                        {scannerInitializing && (
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

                                        {scannerActive && (
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

                                    <div className="mt-3 flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Today's scans</span>
                                        <Badge variant="secondary">{todayScans}</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Scans */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <History className="w-4 h-4" /> Live Feed
                                        </span>
                                        <Badge variant="secondary">{recentScans.length}</Badge>
                                    </CardTitle>
                                </CardHeader>

                                <ScrollArea className="h-[400px]">
                                    <CardContent>
                                        {recentScans.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <ScanLine className="w-12 h-12 mb-2 opacity-20" />
                                                <p className="text-sm">No scans yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {recentScans.map((scan) => (
                                                    <div
                                                        key={scan.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg border-2",
                                                            scan.status === 'success' && "bg-green-50 border-green-200",
                                                            scan.status === 'already_in' && "bg-blue-50 border-blue-200",
                                                            scan.status === 'not_found' && "bg-red-50 border-red-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                            scan.status === 'success' && "bg-green-500 text-white",
                                                            scan.status === 'already_in' && "bg-blue-500 text-white",
                                                            scan.status === 'not_found' && "bg-red-500 text-white"
                                                        )}>
                                                            {scan.status === 'success' && <CheckCircle2 className="w-5 h-5" />}
                                                            {scan.status === 'already_in' && <UserCheck className="w-5 h-5" />}
                                                            {scan.status === 'not_found' && <AlertCircle className="w-5 h-5" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold truncate">{scan.name_en}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {scan.class_name || scan.student_id}
                                                                {scan.roll && ` • Roll ${scan.roll}`}
                                                            </p>
                                                        </div>

                                                        <span className="text-xs text-muted-foreground shrink-0">{scan.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </ScrollArea>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* MANUAL TAB */}
                    <TabsContent value="manual" className="flex-1 mt-4 flex flex-col min-h-0 border rounded-lg">
                        <div className="p-3 border-b bg-muted/30">
                            <div className="flex flex-col lg:flex-row gap-2">
                                <div className="flex gap-2 flex-1">
                                    <div className="w-40">
                                        <SearchableSelect
                                            options={classes.map(c => ({ value: c.id, label: c.name }))}
                                            value={selectedClass}
                                            onValueChange={setSelectedClass}
                                            placeholder="Class..."
                                        />
                                    </div>
                                    <div className="w-28">
                                        <SearchableSelect
                                            options={[{ value: '', label: 'All' }, ...sections.map(s => ({ value: s.id, label: s.name }))]}
                                            value={selectedSection}
                                            onValueChange={setSelectedSection}
                                            placeholder="Section..."
                                            disabled={!selectedClass}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => markAll('present')} disabled={students.length === 0}>
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> All Present
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => markAll('absent')} disabled={students.length === 0}>
                                        <UserX className="w-3 h-3 mr-1" /> All Absent
                                    </Button>
                                </div>
                            </div>

                            {selectedClass && (
                                <div className="flex gap-2 mt-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                        <Input
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 h-8 text-sm"
                                        />
                                    </div>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="h-8 px-2 rounded-md border text-xs"
                                    >
                                        <option value="all">All</option>
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                        <option value="late">Late</option>
                                        <option value="unmarked">Unmarked</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            {!selectedClass ? (
                                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                                    <ListChecks className="w-16 h-16 mb-3 opacity-20" />
                                    <p>Select a class</p>
                                </div>
                            ) : loading ? (
                                <div className="flex flex-col items-center justify-center h-96">
                                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                    <p className="text-sm">Loading...</p>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                                    <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                                    <p>No students</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredStudents.map((student) => {
                                        const status = attendance[student.id];
                                        return (
                                            <div key={student.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                                        {student.roll}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold truncate">{student.name_en}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{student.student_id}</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'present')}
                                                        className={cn(
                                                            "w-8 h-8 rounded border-2 text-xs font-bold transition-all",
                                                            status === 'present' ? "bg-green-600 text-white border-green-600" : "hover:border-green-400"
                                                        )}
                                                    >
                                                        P
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'late')}
                                                        className={cn(
                                                            "w-8 h-8 rounded border-2 text-xs font-bold transition-all",
                                                            status === 'late' ? "bg-orange-500 text-white border-orange-500" : "hover:border-orange-400"
                                                        )}
                                                    >
                                                        L
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'absent')}
                                                        className={cn(
                                                            "w-8 h-8 rounded border-2 text-xs font-bold transition-all",
                                                            status === 'absent' ? "bg-red-600 text-white border-red-600" : "hover:border-red-400"
                                                        )}
                                                    >
                                                        A
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}