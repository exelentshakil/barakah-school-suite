// FILE: src/pages/Attendance.tsx - WORLD CLASS ATTENDANCE SYSTEM
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRScanner } from '@/components/QRScanner'; // Using your updated Scanner
import {
    Calendar as CalendarIcon,
    Save,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    Loader2,
    Search,
    Filter
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
    const [attendance, setAttendance] = useState<Record<string, string>>({}); // { student_id: 'present' | 'absent' }

    // Loading States
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Stats
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            loadSections();
            loadStudentsAndAttendance();
        } else {
            setStudents([]);
        }
    }, [selectedClass, selectedSection, date]);

    // Recalculate stats whenever attendance changes
    useEffect(() => {
        calculateStats();
    }, [attendance, students]);

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
            // 1. Fetch Students
            let query = supabase
                .from('students')
                .select('id, name_en, student_id, roll, photo_url')
                .eq('class_id', selectedClass)
                .eq('status', 'active')
                .order('roll');

            if (selectedSection) {
                query = query.eq('section_id', selectedSection);
            }

            const { data: studentsData } = await query;
            if (studentsData) setStudents(studentsData);

            // 2. Fetch Existing Attendance for this Date
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('student_id, status')
                .eq('date', date)
                .in('student_id', studentsData?.map(s => s.id) || []);

            const attendanceMap: Record<string, string> = {};
            // Default all to 'absent' or null if you prefer, usually schools prefer explicit marking
            // Here we map existing. If not found, it's undefined (not marked yet)
            attendanceData?.forEach(r => {
                attendanceMap[r.student_id] = r.status;
            });

            setAttendance(attendanceMap);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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

        setStats({
            present: p,
            absent: a,
            late: l,
            total: students.length
        });
    };

    const markAll = (status: string) => {
        const newAttendance = { ...attendance };
        students.forEach(s => {
            newAttendance[s.id] = status;
        });
        setAttendance(newAttendance);
    };

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const records = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: studentId,
                date: date,
                status: status,
                // optional: recorded_by: user.id
            }));

            if (records.length === 0) return;

            // Upsert: Insert or Update if matches (student_id, date)
            const { error } = await supabase
                .from('attendance')
                .upsert(records, { onConflict: 'student_id,date' });

            if (error) throw error;

            toast({ title: "✓ Attendance Saved", description: `${records.length} records updated.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // --- GLOBAL QR SCAN LOGIC ---
    const handleQRScan = async (scannedText: string) => {
        // 1. Clean the ID (remove spaces, etc if needed)
        const studentId = scannedText.trim();

        // 2. Check if student is in CURRENT view (Local check - fast)
        const localStudent = students.find(s => s.student_id === studentId);

        if (localStudent) {
            // Update UI instantly
            setAttendance(prev => ({ ...prev, [localStudent.id]: 'present' }));
            toast({
                title: "Marked Present",
                description: `${localStudent.name_en} (Roll: ${localStudent.roll})`,
                className: "bg-green-50 border-green-200"
            });
            // Auto-save this single record to DB to be safe
            await supabase.from('attendance').upsert({
                student_id: localStudent.id,
                date: date,
                status: 'present'
            }, { onConflict: 'student_id,date' });
            return;
        }

        // 3. If NOT in current view, find in Database (Global check)
        try {
            const { data: dbStudent } = await supabase
                .from('students')
                .select('id, name_en, student_id, classes(name)')
                .eq('student_id', studentId)
                .single();

            if (dbStudent) {
                // Mark in DB
                await supabase.from('attendance').upsert({
                    student_id: dbStudent.id,
                    date: date,
                    status: 'present'
                }, { onConflict: 'student_id,date' });

                toast({
                    title: "✓ Present (Other Class)",
                    description: `${dbStudent.name_en} - ${dbStudent.classes?.name}`,
                    className: "bg-blue-50 border-blue-200"
                });
            } else {
                toast({
                    title: "Student Not Found",
                    description: `ID: ${studentId}`,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Scan error", error);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Daily Attendance</h1>
                        <p className="text-muted-foreground mt-1">
                            {format(new Date(date), 'EEEE, MMMM do, yyyy')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <QRScanner onScan={handleQRScan} />
                        <Button
                            variant="hero"
                            onClick={saveAttendance}
                            disabled={saving || students.length === 0}
                            className="min-w-[120px]"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save
                        </Button>
                    </div>
                </div>

                {/* Filters & Stats */}
                <div className="grid gap-6 md:grid-cols-4">
                    <Card className="md:col-span-3">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                Selection Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
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

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-primary">Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total</span>
                                <span className="font-bold">{stats.total}</span>
                            </div>
                            <Separator className="bg-primary/10" />
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                                    <div className="text-[10px] uppercase font-bold text-green-700/60">Present</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                                    <div className="text-[10px] uppercase font-bold text-red-700/60">Absent</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
                                    <div className="text-[10px] uppercase font-bold text-orange-700/60">Late</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Attendance Table */}
                <Card className="min-h-[500px] flex flex-col">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="w-5 h-5" />
                                Student List
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => markAll('present')} disabled={students.length === 0} className="h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50">
                                    Mark All Present
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => markAll('absent')} disabled={students.length === 0} className="h-8 text-xs text-red-700 hover:text-red-800 hover:bg-red-50">
                                    Mark All Absent
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="flex-1">
                        {!selectedClass ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                <p>Please select a class to view students</p>
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                <p className="text-sm text-muted-foreground">Loading students...</p>
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
                                    <tbody>
                                    {students.map((student) => {
                                        const status = attendance[student.id];
                                        return (
                                            <tr key={student.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    #{student.roll}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {/* Avatar */}
                                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden border">
                                                            {student.photo_url ? (
                                                                <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.name_en.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{student.name_en}</div>
                                                            <div className="text-xs text-muted-foreground">{student.student_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, 'present')}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-l-md text-xs font-medium border transition-all",
                                                                status === 'present'
                                                                    ? "bg-green-600 text-white border-green-600 shadow-sm"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            Present
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, 'late')}
                                                            className={cn(
                                                                "px-3 py-1.5 text-xs font-medium border-t border-b border-r transition-all",
                                                                status === 'late'
                                                                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            Late
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-r-md text-xs font-medium border-t border-b border-r transition-all",
                                                                status === 'absent'
                                                                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            Absent
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {status === 'present' && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />}
                                                    {status === 'absent' && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                                                    {status === 'late' && <Clock className="w-5 h-5 text-orange-500 ml-auto" />}
                                                    {!status && <div className="w-5 h-5 rounded-full border-2 border-gray-200 ml-auto" />}
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