import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import {
    CheckCircle, XCircle, Clock, QrCode, Download,
    Users, Loader2, CheckCheck, Camera, StopCircle
} from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

export default function Attendance() {
    const { toast } = useToast();
    const { userRole, isAdmin, canAccessClass, getAssignedClasses, loading: roleLoading } = useUserRole();

    const [loading, setLoading] = useState(false);
    const [selectedDate] = useState<Date>(new Date());
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // QR Scanner States
    const [scannerEnabled, setScannerEnabled] = useState(false);
    const [lastScanned, setLastScanned] = useState<{name: string, roll: number | null, time: Date} | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const studentsRef = useRef<any[]>([]); // Ref to filtered students for scanner callback access

    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});

    // Sync students ref for scanner
    useEffect(() => {
        studentsRef.current = students;
    }, [students]);

    useEffect(() => { if (!roleLoading) loadClasses(); }, [roleLoading]);
    useEffect(() => { if (selectedClass) loadSections(); }, [selectedClass]);
    useEffect(() => { if (selectedClass) loadStudents(); }, [selectedClass, selectedSection, selectedDate]);

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(console.error);
                } catch (e) {
                    console.error("Error clearing scanner on unmount", e);
                }
                scannerRef.current = null;
            }
        };
    }, []);

    const loadClasses = async () => {
        let query = supabase.from('classes').select('*').order('display_order');
        if (!isAdmin && userRole) {
            const assignedClassIds = getAssignedClasses();
            if (assignedClassIds.length > 0) {
                query = query.in('id', assignedClassIds);
            } else {
                setClasses([]);
                return;
            }
        }
        const { data } = await query;
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        const { data } = await supabase.from('sections').select('*').eq('class_id', selectedClass).order('name');
        if (data) setSections(data);
    };

    const loadStudents = async () => {
        if (!isAdmin && !canAccessClass(selectedClass, selectedSection)) {
            toast({ title: "Access Denied", description: "You don't have permission for this class", variant: "destructive" });
            return;
        }

        setLoading(true);
        let query = supabase.from('students').select('*, classes(name), sections(name)').eq('status', 'active').eq('class_id', selectedClass).order('roll');
        if (selectedSection) query = query.eq('section_id', selectedSection);

        const { data } = await query;
        if (data) {
            setStudents(data);
            const dateStr = selectedDate.toISOString().split('T')[0];
            const { data: existingAttendance } = await supabase.from('attendance').select('student_id, status').eq('date', dateStr).in('student_id', data.map(s => s.id));

            const attendanceMap: Record<string, string> = {};
            existingAttendance?.forEach(a => { attendanceMap[a.student_id] = a.status; });
            setAttendance(attendanceMap);
        }
        setLoading(false);
    };

    const markAttendance = (studentId: string, status: string) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const markAll = (status: string) => {
        const newAttendance: Record<string, string> = {};
        students.forEach(s => { newAttendance[s.id] = status; });
        setAttendance(newAttendance);
        toast({ title: "✓ Marked All", description: `All ${status}` });
    };

    const saveAttendance = async () => {
        setLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data: { user } } = await supabase.auth.getUser();

        const records = Object.entries(attendance).map(([studentId, status]) => ({
            student_id: studentId,
            date: dateStr,
            status: status,
            marked_by: user?.id
        }));

        const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' });

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "✓ Saved", description: `${records.length} records saved to database` });
            loadStudents(); // Reload to confirm persistence
        }
        setLoading(false);
    };

    // --- Scanner Logic ---

    useEffect(() => {
        if (scannerEnabled && !scannerRef.current) {
            // Small timeout to ensure the div #qr-reader is mounted in DOM
            const timer = setTimeout(() => {
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    rememberLastUsedCamera: true,
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                };

                try {
                    const scanner = new Html5QrcodeScanner("qr-reader", config, false);
                    scannerRef.current = scanner;

                    let lastCode = "";
                    let lastTime = 0;

                    scanner.render((decodedText) => {
                        const now = Date.now();
                        // Debounce: Ignore same code if scanned within 3 seconds
                        if (decodedText === lastCode && (now - lastTime < 3000)) {
                            return;
                        }

                        lastCode = decodedText;
                        lastTime = now;
                        handleQRScan(decodedText);
                        // We DO NOT clear the scanner here, allowing continuous scanning
                    }, (error) => {
                        // Ignore transient scanning errors to prevent console spam
                    });
                } catch (err) {
                    console.error("Failed to start scanner", err);
                    toast({ title: "Scanner Error", description: "Could not initialize camera", variant: "destructive" });
                    setScannerEnabled(false);
                }
            }, 100);

            return () => clearTimeout(timer);
        } else if (!scannerEnabled && scannerRef.current) {
            try {
                scannerRef.current.clear().catch(console.error);
            } catch (e) {
                console.error("Error clearing scanner", e);
            }
            scannerRef.current = null;
        }
    }, [scannerEnabled]);

    const handleQRScan = (scannedId: string) => {
        const currentStudents = studentsRef.current;
        // Match against database ID or custom student_id field
        const student = currentStudents.find(s => s.student_id === scannedId || s.id === scannedId);

        if (student) {
            setAttendance(prev => {
                // Check if already present to provide different feedback
                if (prev[student.id] === 'present') {
                    toast({
                        title: "Already Scanned",
                        description: `${student.name_en} is already marked present.`,
                        className: "bg-blue-50 border-blue-200"
                    });
                    return prev;
                }

                toast({
                    title: "✓ Present",
                    description: `${student.name_en} (Roll: ${student.roll})`,
                    className: "bg-green-50 border-green-200"
                });
                return { ...prev, [student.id]: 'present' };
            });
            setLastScanned({ name: student.name_en, roll: student.roll, time: new Date() });
        } else {
            toast({
                title: "Student Not Found",
                description: `ID: ${scannedId} not found in this class list.`,
                variant: "destructive"
            });
        }
    };

    // --- Export Logic ---

    const exportCSV = () => {
        const dateStr = selectedDate.toLocaleDateString('en-GB');
        const csvData = students.map(s => ({ Roll: s.roll, Name: s.name_en, Class: s.classes?.name, Status: attendance[s.id] || 'Not Marked' }));
        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${dateStr}.csv`;
        a.click();
        toast({ title: "✓ Exported", description: "CSV downloaded" });
    };

    // --- Stats & Rendering ---

    const stats = {
        present: Object.values(attendance).filter(a => a === 'present').length,
        absent: Object.values(attendance).filter(a => a === 'absent').length,
        late: Object.values(attendance).filter(a => a === 'late').length,
        total: students.length
    };

    const percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(0) : '0';
    const filteredStudents = students.filter(s => s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || s.roll?.toString().includes(searchQuery));

    if (roleLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-[1600px] mx-auto space-y-4 px-2 sm:px-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <CheckCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Attendance</h1>
                            <p className="text-sm text-muted-foreground">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant={scannerEnabled ? "destructive" : "default"}
                            className="flex-1 sm:flex-none"
                            onClick={() => setScannerEnabled(!scannerEnabled)}
                        >
                            {scannerEnabled ? <><StopCircle className="w-4 h-4 mr-2"/>Stop Scanner</> : <><Camera className="w-4 h-4 mr-2"/>Start Scanner</>}
                        </Button>
                        {students.length > 0 && (
                            <Button variant="outline" onClick={exportCSV}>
                                <Download className="w-4 h-4 mr-2" />Export
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium">Total</span></div><span className="text-xl font-bold">{stats.total}</span></CardContent></Card>
                    <Card className="border-l-4 border-l-green-500"><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-medium">Present</span></div><div className="text-right"><span className="text-xl font-bold text-green-600">{stats.present}</span><span className="text-xs text-muted-foreground ml-2">({percentage}%)</span></div></CardContent></Card>
                    <Card className="border-l-4 border-l-red-500"><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-medium">Absent</span></div><span className="text-xl font-bold text-red-600">{stats.absent}</span></CardContent></Card>
                    <Card className="border-l-4 border-l-orange-500"><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-600" /><span className="text-sm font-medium">Late</span></div><span className="text-xl font-bold text-orange-600">{stats.late}</span></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Left Column: Filters & Scanner */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Class Selection Card */}
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base">Select Class</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <SearchableSelect
                                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                                    value={selectedClass}
                                    onValueChange={(val) => { setSelectedClass(val); setScannerEnabled(false); }}
                                    placeholder="Select Class..."
                                />
                                <SearchableSelect
                                    options={[{ value: '', label: 'All Sections' }, ...sections.map(s => ({ value: s.id, label: s.name }))]}
                                    value={selectedSection}
                                    onValueChange={setSelectedSection}
                                    placeholder="Section (Optional)"
                                />
                            </CardContent>
                        </Card>

                        {/* Scanner Card - Conditionally Visible/Active */}
                        <Card className={cn("overflow-hidden transition-all", scannerEnabled ? "ring-2 ring-primary shadow-lg" : "opacity-90")}>
                            <CardHeader className="bg-muted/30 pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2"><QrCode className="w-4 h-4"/> QR Scanner</div>
                                    {scannerEnabled && <Badge variant="default" className="bg-green-600 animate-pulse">Live</Badge>}
                                </CardTitle>
                                <CardDescription>Scan student ID cards to mark present</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {scannerEnabled ? (
                                    <div className="relative bg-black">
                                        <div id="qr-reader" className="w-full min-h-[300px]"></div>
                                        <div className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                                            Scanning...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[200px] bg-muted/10 text-muted-foreground p-6 text-center border-t border-b">
                                        <QrCode className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-sm">Scanner is paused</p>
                                        <Button variant="outline" size="sm" onClick={() => setScannerEnabled(true)} className="mt-3">
                                            Enable Camera
                                        </Button>
                                    </div>
                                )}

                                {/* Last Scanned Feedback */}
                                {lastScanned && (
                                    <div className="p-4 bg-green-50 border-t border-green-100 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-green-600 font-medium uppercase">Last Scanned</p>
                                                <p className="font-bold text-green-800">{lastScanned.name}</p>
                                                <p className="text-xs text-green-700">Roll: {lastScanned.roll} • {lastScanned.time.toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Student List */}
                    <div className="lg:col-span-8 space-y-4">
                        <Card className="min-h-[600px] flex flex-col">
                            <CardHeader className="border-b bg-gray-50/50 pb-3">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 w-full">
                                        <Input
                                            placeholder="Search by name or roll..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="max-w-sm"
                                        />
                                        <Badge variant="secondary" className="hidden sm:inline-flex whitespace-nowrap">
                                            {stats.present + stats.absent + stats.late} / {stats.total} Marked
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => markAll('present')} title="Mark All Present"><CheckCircle className="w-4 h-4 text-green-600"/></Button>
                                        <Button size="sm" variant="ghost" onClick={() => markAll('absent')} title="Mark All Absent"><XCircle className="w-4 h-4 text-red-600"/></Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                                {students.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                                        <Users className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="text-lg font-medium">No Students Found</p>
                                        <p className="text-sm">Select a class to view student list</p>
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[600px]">
                                        {filteredStudents.map(student => {
                                            const status = attendance[student.id];
                                            const isLastScanned = lastScanned?.roll === student.roll && lastScanned?.name === student.name_en;

                                            return (
                                                <div
                                                    key={student.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                                                        !status && "bg-white hover:bg-gray-50",
                                                        status === 'present' && "bg-green-50 border-green-200",
                                                        status === 'absent' && "bg-red-50 border-red-200",
                                                        status === 'late' && "bg-orange-50 border-orange-200",
                                                        isLastScanned && "ring-2 ring-primary ring-offset-2 scale-[1.01]"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                            <AvatarFallback className={cn(
                                                                "font-bold text-xs",
                                                                status === 'present' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                                            )}>
                                                                {student.roll || '#'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold truncate text-sm">{student.name_en}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{student.name_bn}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant={status === 'present' ? 'default' : 'ghost'}
                                                            size="icon"
                                                            className={cn("h-8 w-8", status === 'present' && "bg-green-600 hover:bg-green-700")}
                                                            onClick={() => markAttendance(student.id, 'present')}
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant={status === 'absent' ? 'destructive' : 'ghost'}
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => markAttendance(student.id, 'absent')}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant={status === 'late' ? 'secondary' : 'ghost'}
                                                            size="icon"
                                                            className={cn("h-8 w-8", status === 'late' && "bg-orange-500 hover:bg-orange-600 text-white")}
                                                            onClick={() => markAttendance(student.id, 'late')}
                                                        >
                                                            <Clock className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>

                            {/* Footer Action */}
                            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                <div className="text-xs text-muted-foreground hidden sm:block">
                                    Changes are saved locally until you click Save
                                </div>
                                <Button onClick={saveAttendance} disabled={loading || Object.keys(attendance).length === 0} className="w-full sm:w-auto min-w-[150px]">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCheck className="w-4 h-4 mr-2" />}
                                    Save to Database
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}