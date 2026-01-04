// FILE: src/pages/Attendance.tsx - WORLD CLASS ATTENDANCE SYSTEM
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRScanner } from '@/components/QRScanner';
import {
    Save,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    Loader2,
    Search,
    Filter,
    CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function Attendance() {
    const { toast } = useToast();

    // State
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');

    // Data
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});

    // Loading States
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Stats
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

    useEffect(() => { loadClasses(); }, []);

    useEffect(() => {
        if (selectedClass) {
            loadSections();
            loadStudentsAndAttendance();
        } else {
            setStudents([]);
        }
    }, [selectedClass, selectedSection, date]);

    useEffect(() => { calculateStats(); }, [attendance, students]);

    const loadClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('display_order');
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        const { data } = await supabase.from('sections').select('*').eq('class_id', selectedClass);
        if (data) setSections(data);
    };

    const loadStudentsAndAttendance = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('students')
                .select('id, name_en, student_id, roll, photo_url')
                .eq('class_id', selectedClass)
                .eq('status', 'active')
                .order('roll');

            if (selectedSection) query = query.eq('section_id', selectedSection);

            const { data: studentsData } = await query;
            if (studentsData) setStudents(studentsData);

            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('student_id, status')
                .eq('date', date)
                .in('student_id', studentsData?.map(s => s.id) || []);

            const attendanceMap: Record<string, string> = {};
            attendanceData?.forEach(r => { attendanceMap[r.student_id] = r.status; });
            setAttendance(attendanceMap);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const calculateStats = () => {
        if (students.length === 0) {
            setStats({ present: 0, absent: 0, late: 0, total: 0 });
            return;
        }
        let p = 0, a = 0, l = 0;
        Object.values(attendance).forEach(status => {
            if (status === 'present') p++;
            if (status === 'absent') a++;
            if (status === 'late') l++;
        });
        setStats({ present: p, absent: a, late: l, total: students.length });
    };

    const markAll = (status: string) => {
        const newAttendance = { ...attendance };
        students.forEach(s => { newAttendance[s.id] = status; });
        setAttendance(newAttendance);
    };

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const records = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: studentId, date: date, status: status
            }));

            if (records.length === 0) return;

            const { error } = await supabase
                .from('attendance')
                .upsert(records, { onConflict: 'student_id,date' });

            if (error) throw error;
            toast({ title: "✓ Saved", description: "Attendance records updated." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleQRScan = async (scannedText: string) => {
        const studentId = scannedText.trim();
        const localStudent = students.find(s => s.student_id === studentId);

        if (localStudent) {
            setAttendance(prev => ({ ...prev, [localStudent.id]: 'present' }));
            toast({ title: "Marked Present", description: `${localStudent.name_en}`, className: "bg-green-50 border-green-200" });
            await supabase.from('attendance').upsert({ student_id: localStudent.id, date: date, status: 'present' }, { onConflict: 'student_id,date' });
            return;
        }

        try {
            const { data: dbStudent } = await supabase
                .from('students')
                .select('id, name_en, student_id, classes(name)')
                .eq('student_id', studentId)
                .single();

            if (dbStudent) {
                await supabase.from('attendance').upsert({ student_id: dbStudent.id, date: date, status: 'present' }, { onConflict: 'student_id,date' });
                toast({ title: "✓ Present (Other Class)", description: `${dbStudent.name_en} - ${dbStudent.classes?.name}`, className: "bg-blue-50 border-blue-200" });
            } else {
                toast({ title: "Student Not Found", description: `ID: ${studentId}`, variant: "destructive" });
            }
        } catch (error) { console.error("Scan error", error); }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* IMPROVED HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <CalendarCheck className="w-8 h-8 text-primary" />
                            Daily Attendance
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Manage records for <span className="font-semibold text-foreground">{format(new Date(date), 'EEEE, MMMM do, yyyy')}</span>
                        </p>
                    </div>

                    {/* ACTION TOOLBAR: SCANNER & SAVE */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <QRScanner
                            onScan={handleQRScan}
                            className="w-1/2 md:w-auto h-11 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                            variant="outline"
                        />
                        <Button
                            variant="hero"
                            onClick={saveAttendance}
                            disabled={saving || students.length === 0}
                            className="w-1/2 md:w-auto h-11 shadow-lg shadow-primary/20"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Records
                        </Button>
                    </div>
                </div>

                {/* Filters & Stats */}
                <div className="grid gap-6 md:grid-cols-4">
                    <Card className="md:col-span-3 border shadow-sm">
                        <CardHeader className="pb-3 border-b bg-gray-50/50">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                <Filter className="w-4 h-4" />
                                Selection Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3 pt-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <SearchableSelect
                                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                                    value={selectedClass}
                                    onValueChange={setSelectedClass}
                                    placeholder="Select Class..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <SearchableSelect
                                    options={[{ value: '', label: 'All Sections' }, ...sections.map(s => ({ value: s.id, label: s.name }))]}
                                    value={selectedSection}
                                    onValueChange={setSelectedSection}
                                    placeholder="Select Section..."
                                    disabled={!selectedClass}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-white to-primary/5 border-primary/20 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Total Students</span>
                                <Badge variant="secondary" className="font-bold">{stats.total}</Badge>
                            </div>
                            <Separator className="bg-primary/10" />
                            <div className="grid grid-cols-3 gap-1 text-center">
                                <div className="p-1 rounded bg-green-50">
                                    <div className="text-xl font-bold text-green-600">{stats.present}</div>
                                    <div className="text-[10px] font-bold text-green-700">Present</div>
                                </div>
                                <div className="p-1 rounded bg-red-50">
                                    <div className="text-xl font-bold text-red-600">{stats.absent}</div>
                                    <div className="text-[10px] font-bold text-red-700">Absent</div>
                                </div>
                                <div className="p-1 rounded bg-orange-50">
                                    <div className="text-xl font-bold text-orange-600">{stats.late}</div>
                                    <div className="text-[10px] font-bold text-orange-700">Late</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Attendance Table */}
                <Card className="min-h-[500px] flex flex-col border shadow-md">
                    <CardHeader className="border-b bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <Users className="w-5 h-5 text-gray-500" />
                                Student List
                            </CardTitle>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="outline" size="sm" onClick={() => markAll('present')} disabled={students.length === 0} className="flex-1 sm:flex-none h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200">
                                    Mark All Present
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => markAll('absent')} disabled={students.length === 0} className="flex-1 sm:flex-none h-8 text-xs text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200">
                                    Mark All Absent
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="flex-1">
                        {!selectedClass ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-in fade-in zoom-in duration-500">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Search className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="font-medium">Please select a class to begin</p>
                                <p className="text-xs text-gray-400">Use the filters above</p>
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                                <p className="text-sm font-medium text-muted-foreground">Loading student list...</p>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Users className="w-12 h-12 mb-4 opacity-20" />
                                <p>No students found in this class</p>
                            </div>
                        ) : (
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 w-20">Roll</th>
                                        <th className="px-6 py-3">Student Info</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                    {students.map((student) => {
                                        const status = attendance[student.id];
                                        return (
                                            <tr key={student.id} className={cn("bg-white hover:bg-gray-50 transition-colors", status === 'absent' && "bg-red-50/30")}>
                                                <td className="px-6 py-4 font-mono font-medium text-gray-500">
                                                    #{student.roll}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden border shadow-sm">
                                                            {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" /> : student.name_en.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">{student.name_en}</div>
                                                            <div className="text-xs text-muted-foreground font-mono">{student.student_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-0.5 bg-gray-100/50 p-1 rounded-lg w-fit mx-auto border">
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, 'present')}
                                                            className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", status === 'present' ? "bg-white text-green-700 shadow-sm border border-green-200 ring-1 ring-green-100" : "text-gray-500 hover:bg-gray-200/50")}
                                                        >
                                                            Present
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, 'late')}
                                                            className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", status === 'late' ? "bg-white text-orange-700 shadow-sm border border-orange-200 ring-1 ring-orange-100" : "text-gray-500 hover:bg-gray-200/50")}
                                                        >
                                                            Late
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                                            className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", status === 'absent' ? "bg-white text-red-700 shadow-sm border border-red-200 ring-1 ring-red-100" : "text-gray-500 hover:bg-gray-200/50")}
                                                        >
                                                            Absent
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {status === 'present' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Present</Badge>}
                                                    {status === 'absent' && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Absent</Badge>}
                                                    {status === 'late' && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="w-3 h-3 mr-1" /> Late</Badge>}
                                                    {!status && <span className="text-xs text-muted-foreground italic">Not marked</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
}