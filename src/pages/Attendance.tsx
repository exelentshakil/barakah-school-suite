// FILE: src/pages/Attendance.tsx
import { useState, useEffect } from 'react';
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
import { AttendanceScanner } from '@/components/AttendanceScanner';
import { AttendanceKiosk } from '@/components/AttendanceKiosk';
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
    Video,
    VideoOff,
    Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function Attendance() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState("scanner");
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isKioskMode, setIsKioskMode] = useState(false);

    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0, percentage: 0 });
    const [allowedClasses, setAllowedClasses] = useState<string[]>([]);
    const [scannerActive, setScannerActive] = useState(false);

    const todayScans = todayAttendance.filter(a => a.status === 'present').length;

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

    useEffect(() => {
        calculateStats();
        loadTodayAttendance();
    }, [attendance, students, date]);

    // Auto-refresh today's attendance every 5 seconds when scanner is active
    useEffect(() => {
        if (scannerActive || isKioskMode) {
            const interval = setInterval(() => {
                loadTodayAttendance();
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [scannerActive, isKioskMode, date]);

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

    const loadTodayAttendance = async () => {
        try {
            const { data } = await supabase
                .from('attendance')
                .select(`
                    id,
                    student_id,
                    status,
                    created_at,
                    students!inner(
                        student_id,
                        name_en,
                        roll,
                        classes(name)
                    )
                `)
                .eq('date', date)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                const records: AttendanceRecord[] = data.map(record => ({
                    id: record.id,
                    student_id: record.students.student_id,
                    name_en: record.students.name_en,
                    roll: record.students.roll,
                    class_name: record.students.classes?.name,
                    status: record.status,
                    created_at: record.created_at,
                    time: new Date(record.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })
                }));
                setTodayAttendance(records);
            }
        } catch (error) {
            console.error("Load today attendance error:", error);
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
            loadTodayAttendance();
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
            loadTodayAttendance();
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleQRScan = async (studentId: string) => {
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
                toast({
                    title: "ℹ️ Already Present",
                    description: dbStudent.name_en,
                    className: "bg-blue-50 border-blue-200"
                });
                loadTodayAttendance();
                return;
            }

            await supabase.from('attendance').upsert(
                { student_id: dbStudent.id, date: date, status: 'present' },
                { onConflict: 'student_id,date' }
            );

            if (students.find(s => s.id === dbStudent.id)) {
                setAttendance(prev => ({ ...prev, [dbStudent.id]: 'present' }));
            }

            await loadTodayAttendance();

            toast({
                title: "✅ Welcome!",
                description: dbStudent.name_en,
                className: "bg-green-50 border-green-200 text-green-800"
            });
        } catch (error) {
            console.error("Scan error:", error);
            toast({
                title: "Error",
                description: "Failed to mark attendance",
                variant: "destructive"
            });
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

    // KIOSK MODE
    if (isKioskMode) {
        return (
            <AttendanceKiosk
                date={date}
                todayAttendance={todayAttendance}
                todayScans={todayScans}
                onScan={handleQRScan}
                onExit={() => setIsKioskMode(false)}
            />
        );
    }

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
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== 'scanner') setScannerActive(false); }} className="flex-1 flex flex-col min-h-0">
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
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIsKioskMode(true)}
                                            >
                                                <Maximize2 className="w-4 h-4 mr-1" /> Kiosk
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={scannerActive ? "destructive" : "default"}
                                                onClick={() => setScannerActive(!scannerActive)}
                                            >
                                                {scannerActive ? (
                                                    <><VideoOff className="w-4 h-4 mr-1" /> Stop</>
                                                ) : (
                                                    <><Video className="w-4 h-4 mr-1" /> Start</>
                                                )}
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AttendanceScanner
                                        onScan={handleQRScan}
                                        isActive={scannerActive}
                                    />

                                    <div className="mt-3 flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Today's check-ins</span>
                                        <Badge variant="secondary">{todayScans}</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Today's Attendance */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <History className="w-4 h-4" /> Today's Attendance
                                        </span>
                                        <Badge variant="secondary">{todayAttendance.length}</Badge>
                                    </CardTitle>
                                </CardHeader>

                                <ScrollArea className="h-[400px]">
                                    <CardContent>
                                        {todayAttendance.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <ScanLine className="w-12 h-12 mb-2 opacity-20" />
                                                <p className="text-sm">No attendance marked yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {todayAttendance.map((record) => (
                                                    <div
                                                        key={record.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg border-2",
                                                            record.status === 'present' && "bg-green-50 border-green-200",
                                                            record.status === 'late' && "bg-orange-50 border-orange-200",
                                                            record.status === 'absent' && "bg-red-50 border-red-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                            record.status === 'present' && "bg-green-500 text-white",
                                                            record.status === 'late' && "bg-orange-500 text-white",
                                                            record.status === 'absent' && "bg-red-500 text-white"
                                                        )}>
                                                            {record.status === 'present' && <CheckCircle2 className="w-5 h-5" />}
                                                            {record.status === 'late' && <Timer className="w-5 h-5" />}
                                                            {record.status === 'absent' && <UserX className="w-5 h-5" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold truncate">{record.name_en}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {record.class_name || record.student_id}
                                                                {record.roll && ` • Roll ${record.roll}`}
                                                            </p>
                                                        </div>

                                                        <span className="text-xs text-muted-foreground shrink-0">{record.time}</span>
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