// FILE: src/pages/Attendance.tsx - WITH ROLE RESTRICTIONS
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import {
    CheckCircle, XCircle, Clock, QrCode, Download,
    Users, Loader2, CheckCheck, Activity, Zap
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
    const [qrOpen, setQrOpen] = useState(false);
    const [qrScanning, setQrScanning] = useState(false);

    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});

    useEffect(() => { if (!roleLoading) loadClasses(); }, [roleLoading]);
    useEffect(() => { if (selectedClass) loadSections(); }, [selectedClass]);
    useEffect(() => { if (selectedClass) loadStudents(); }, [selectedClass, selectedSection, selectedDate]);

    const loadClasses = async () => {
        let query = supabase.from('classes').select('*').order('display_order');

        // Teacher: only assigned classes
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
        // Check permission
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
            toast({ title: "✓ Saved", description: `${records.length} records` });
            loadStudents();
        }
        setLoading(false);
    };

    const handleQRScan = (studentId: string) => {
        const student = students.find(s => s.student_id === studentId || s.id === studentId);
        if (student) {
            markAttendance(student.id, 'present');
            toast({ title: "✓ Present", description: `${student.name_en} - Roll ${student.roll}`, duration: 2000 });
        } else {
            toast({ title: "Not Found", description: "Student not in class", variant: "destructive" });
        }
    };

    const startQRScanner = () => {
        setQrScanning(true);
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] }, false);
            scanner.render((decodedText) => { handleQRScan(decodedText); scanner.clear(); setQrScanning(false); }, () => {});
        }, 100);
    };

    useEffect(() => { if (qrOpen && !qrScanning) startQRScanner(); }, [qrOpen]);

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
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Attendance</h1>
                            <p className="text-sm text-muted-foreground">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                            <QrCode className="w-4 h-4 mr-2" />Scan QR
                        </Button>
                        {students.length > 0 && (
                            <Button variant="outline" size="sm" onClick={exportCSV}>
                                <Download className="w-4 h-4 mr-2" />Export
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <Card><CardContent className="p-3"><div className="flex items-center justify-between"><Users className="w-5 h-5 text-blue-600" /><div className="text-right"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total</div></div></div></CardContent></Card>
                    <Card className="border-l-4 border-l-green-500"><CardContent className="p-3"><div className="flex items-center justify-between"><CheckCircle className="w-5 h-5 text-green-600" /><div className="text-right"><div className="text-2xl font-bold text-green-600">{stats.present}</div><div className="text-xs text-muted-foreground">{percentage}%</div></div></div></CardContent></Card>
                    <Card className="border-l-4 border-l-red-500"><CardContent className="p-3"><div className="flex items-center justify-between"><XCircle className="w-5 h-5 text-red-600" /><div className="text-right"><div className="text-2xl font-bold text-red-600">{stats.absent}</div><div className="text-xs text-muted-foreground">Absent</div></div></div></CardContent></Card>
                    <Card className="border-l-4 border-l-orange-500"><CardContent className="p-3"><div className="flex items-center justify-between"><Clock className="w-5 h-5 text-orange-600" /><div className="text-right"><div className="text-2xl font-bold text-orange-600">{stats.late}</div><div className="text-xs text-muted-foreground">Late</div></div></div></CardContent></Card>
                </div>

                {/* Main Card */}
                <Card>
                    <CardHeader className="border-b bg-gray-50/50 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Mark Attendance</CardTitle>
                            {students.length > 0 && <Badge variant="outline" className="text-sm">{stats.present + stats.absent + stats.late} / {stats.total}</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {/* Filters */}
                        <div className="grid grid-cols-3 gap-3">
                            <SearchableSelect options={classes.map(c => ({ value: c.id, label: c.name }))} value={selectedClass} onValueChange={setSelectedClass} placeholder="Select class *" />
                            <SearchableSelect options={[{ value: '', label: 'All Sections' }, ...sections.map(s => ({ value: s.id, label: s.name }))]} value={selectedSection} onValueChange={setSelectedSection} placeholder="All sections" />
                            <Input placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>

                        {students.length > 0 && (
                            <>
                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Quick:</span>
                                    <Button variant="ghost" size="sm" onClick={() => markAll('present')} className="h-7 text-xs"><CheckCircle className="w-3 h-3 mr-1 text-green-600" />All Present</Button>
                                    <Button variant="ghost" size="sm" onClick={() => markAll('absent')} className="h-7 text-xs"><XCircle className="w-3 h-3 mr-1 text-red-600" />All Absent</Button>
                                    <Button variant="ghost" size="sm" onClick={() => markAll('late')} className="h-7 text-xs"><Clock className="w-3 h-3 mr-1 text-orange-600" />All Late</Button>
                                </div>

                                {/* Student List */}
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {filteredStudents.map(student => {
                                        const studentAttendance = attendance[student.id];
                                        return (
                                            <div key={student.id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-all", !studentAttendance && "bg-white hover:bg-gray-50", studentAttendance === 'present' && "bg-green-50 border-green-200", studentAttendance === 'absent' && "bg-red-50 border-red-200", studentAttendance === 'late' && "bg-orange-50 border-orange-200")}>
                                                <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary font-bold">{student.roll || student.name_en.charAt(0)}</AvatarFallback></Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold truncate">{student.name_en}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Roll {student.roll}</span>
                                                        {student.sections?.name && <span>• {student.sections.name}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant={studentAttendance === 'present' ? 'default' : 'ghost'} size="sm" onClick={() => markAttendance(student.id, 'present')} className={cn("h-8 w-8 p-0", studentAttendance === 'present' && "bg-green-600 hover:bg-green-700")}><CheckCircle className="w-4 h-4" /></Button>
                                                    <Button variant={studentAttendance === 'absent' ? 'destructive' : 'ghost'} size="sm" onClick={() => markAttendance(student.id, 'absent')} className="h-8 w-8 p-0"><XCircle className="w-4 h-4" /></Button>
                                                    <Button variant={studentAttendance === 'late' ? 'secondary' : 'ghost'} size="sm" onClick={() => markAttendance(student.id, 'late')} className={cn("h-8 w-8 p-0", studentAttendance === 'late' && "bg-orange-500 hover:bg-orange-600 text-white")}><Clock className="w-4 h-4" /></Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Save */}
                                <div className="flex items-center justify-between pt-3 border-t">
                                    <div className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{stats.present + stats.absent + stats.late}</span> / {stats.total} marked</div>
                                    <Button onClick={saveAttendance} disabled={loading || Object.keys(attendance).length === 0} size="lg" className="min-w-[200px]">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCheck className="w-4 h-4 mr-2" />}Save Attendance</Button>
                                </div>
                            </>
                        )}

                        {!selectedClass && <div className="text-center py-12 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Select a class to begin</p></div>}
                        {selectedClass && loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                    </CardContent>
                </Card>

                {/* QR Scanner Dialog */}
                <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" />Scan Student QR Code</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                            <div id="qr-reader" className="w-full"></div>
                            <p className="text-sm text-muted-foreground text-center">Position QR code within frame</p>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}