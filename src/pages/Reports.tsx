// FILE: src/pages/Reports.tsx - WORLD CLASS REPORTS PAGE
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    FileText,
    Loader2,
    Download,
    TrendingUp,
    Users,
    Award,
    Calendar,
    DollarSign,
    UserCheck,
    BookOpen,
    ClipboardList,
    BarChart3,
    PieChart,
    LineChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Reports() {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [generatingReportCards, setGeneratingReportCards] = useState(false);
    const [generatingAttendance, setGeneratingAttendance] = useState(false);
    const [generatingFees, setGeneratingFees] = useState(false);

    // Data
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [schoolSettings, setSchoolSettings] = useState<any>(null);

    // Filters
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [attendanceStartDate, setAttendanceStartDate] = useState('');
    const [attendanceEndDate, setAttendanceEndDate] = useState('');
    const [feeStatusFilter, setFeeStatusFilter] = useState('');

    // Analytics Data
    const [analytics, setAnalytics] = useState({
        totalStudents: 0,
        totalRevenue: 0,
        avgAttendance: 0,
        avgGrade: 0,
        classWiseStudents: [] as any[],
        monthlyRevenue: [] as any[],
        attendanceTrend: [] as any[],
        topPerformers: [] as any[]
    });

    // Teacher access
    const [allowedClasses, setAllowedClasses] = useState<string[]>([]);

    useEffect(() => {
        loadTeacherAccess();
    }, [user]);

    useEffect(() => {
        if (allowedClasses.length > 0 || user?.role === 'admin' || user?.role === 'accountant') {
            loadInitialData();
        }
    }, [allowedClasses, user]);

    useEffect(() => {
        if (selectedClass) {
            loadSections();
        } else {
            setSections([]);
            setSelectedSection('');
        }
    }, [selectedClass]);

    const loadTeacherAccess = async () => {
        if (!user || user.role === 'admin' || user.role === 'accountant') return;

        const { data: assignments } = await supabase
            .from('teacher_assignments')
            .select('class_id')
            .eq('user_id', user.id);

        if (assignments) {
            setAllowedClasses([...new Set(assignments.map(a => a.class_id))]);
        }
    };

    const loadInitialData = async () => {
        setLoading(true);
        await Promise.all([
            loadClasses(),
            loadExams(),
            loadAnalytics(),
            loadSchoolSettings()
        ]);
        setLoading(false);
    };

    const loadSchoolSettings = async () => {
        const { data } = await supabase
            .from('school_settings')
            .select('*')
            .single();
        if (data) setSchoolSettings(data);
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
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', selectedClass)
            .order('name');
        if (data) setSections(data);
    };

    const loadExams = async () => {
        let query = supabase
            .from('exams')
            .select('*, classes(name)')
            .order('created_at', { ascending: false });

        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('class_id', allowedClasses);
        }

        const { data } = await query;
        if (data) setExams(data);
    };

    const loadAnalytics = async () => {
        // Total Students
        let studentQuery = supabase.from('students').select('id', { count: 'exact', head: true });
        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            studentQuery = studentQuery.in('class_id', allowedClasses);
        }
        const { count: totalStudents } = await studentQuery;

        // Total Revenue
        const { data: invoices } = await supabase
            .from('invoices')
            .select('paid_amount');
        const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || '0'), 0) || 0;

        // Average Attendance (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
        const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
        const avgAttendance = attendance?.length ? (presentCount / attendance.length) * 100 : 0;

        // Class-wise Students
        const { data: classWise } = await supabase
            .from('students')
            .select('class_id, classes(name)')
            .eq('status', 'active');

        const classWiseMap = new Map();
        classWise?.forEach(s => {
            const className = s.classes?.name || 'Unknown';
            classWiseMap.set(className, (classWiseMap.get(className) || 0) + 1);
        });
        const classWiseStudents = Array.from(classWiseMap.entries()).map(([name, count]) => ({ name, count }));

        setAnalytics({
            totalStudents: totalStudents || 0,
            totalRevenue,
            avgAttendance,
            avgGrade: 0,
            classWiseStudents,
            monthlyRevenue: [],
            attendanceTrend: [],
            topPerformers: []
        });
    };

    const handleGenerateReportCards = async () => {
        if (!selectedExam) {
            toast({ title: "Please select an exam", variant: "destructive" });
            return;
        }

        setGeneratingReportCards(true);
        try {
            navigate(`/report-cards/${selectedExam}`);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingReportCards(false);
        }
    };

    const handleDownloadAttendanceReport = async () => {
        if (!selectedClass) {
            toast({ title: "Please select a class", variant: "destructive" });
            return;
        }

        setGeneratingAttendance(true);
        try {
            // Get class info
            const classInfo = classes.find(c => c.id === selectedClass);

            // Get students in class
            const { data: studentsData } = await supabase
                .from('students')
                .select('*, classes(name), sections(name)')
                .eq('class_id', selectedClass)
                .eq('status', 'active')
                .order('roll');

            if (!studentsData || studentsData.length === 0) {
                toast({ title: "No students found", variant: "destructive" });
                return;
            }

            // Get attendance data for date range
            const startDate = attendanceStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = attendanceEndDate || new Date().toISOString().split('T')[0];

            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .in('student_id', studentsData.map(s => s.id))
                .gte('date', startDate)
                .lte('date', endDate);

            // Generate PDF
            const { generateAttendanceReport } = await import('@/lib/reports-lib');
            const doc = await generateAttendanceReport(
                studentsData,
                attendanceData || [],
                classInfo,
                schoolSettings,
                { start: startDate, end: endDate }
            );

            doc.save(`Attendance_Report_${classInfo?.name}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast({ title: "✓ Report generated!", description: "Attendance report downloaded" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingAttendance(false);
        }
    };

    const handleDownloadFeeReport = async () => {
        setGeneratingFees(true);
        try {
            // Get all students (or filtered by class if selected)
            let studentsQuery = supabase
                .from('students')
                .select('*, classes(name), sections(name)')
                .eq('status', 'active')
                .order('roll');

            if (selectedClass) {
                studentsQuery = studentsQuery.eq('class_id', selectedClass);
            }

            const { data: studentsData } = await studentsQuery;

            if (!studentsData || studentsData.length === 0) {
                toast({ title: "No students found", variant: "destructive" });
                return;
            }

            // Get all invoices for these students
            const { data: invoicesData } = await supabase
                .from('invoices')
                .select('*')
                .in('student_id', studentsData.map(s => s.id));

            // Generate PDF
            const { generateFeeReport } = await import('@/lib/reports-lib');
            const doc = await generateFeeReport(
                studentsData,
                invoicesData || [],
                schoolSettings,
                { class: selectedClass, status: feeStatusFilter }
            );

            const className = selectedClass ? classes.find(c => c.id === selectedClass)?.name : 'All';
            doc.save(`Fee_Report_${className}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast({ title: "✓ Report generated!", description: "Fee collection report downloaded" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingFees(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                        <p className="text-muted-foreground mt-1">Generate reports and view analytics</p>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Students</p>
                                    <p className="text-2xl font-bold">{analytics.totalStudents}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                                    <p className="text-2xl font-bold">৳{analytics.totalRevenue.toFixed(0)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <UserCheck className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Avg Attendance</p>
                                    <p className="text-2xl font-bold">{analytics.avgAttendance.toFixed(0)}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <Award className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Exams Conducted</p>
                                    <p className="text-2xl font-bold">{exams.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="generate" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="generate">Generate Reports</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    {/* Generate Reports Tab */}
                    <TabsContent value="generate" className="space-y-6">
                        {/* Report Cards */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Report Cards
                                </CardTitle>
                                <CardDescription>Generate student report cards for exams</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Class</Label>
                                        <SearchableSelect
                                            options={classes.map(c => ({ value: c.id, label: c.name }))}
                                            value={selectedClass}
                                            onValueChange={setSelectedClass}
                                            placeholder="Select class..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Section</Label>
                                        <SearchableSelect
                                            options={sections.map(s => ({ value: s.id, label: s.name }))}
                                            value={selectedSection}
                                            onValueChange={setSelectedSection}
                                            placeholder="All sections..."
                                            disabled={!selectedClass || sections.length === 0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Exam *</Label>
                                        <SearchableSelect
                                            options={exams
                                                .filter(e => !selectedClass || e.class_id === selectedClass)
                                                .map(e => ({ value: e.id, label: `${e.name} (${e.classes?.name})` }))}
                                            value={selectedExam}
                                            onValueChange={setSelectedExam}
                                            placeholder="Select exam..."
                                        />
                                    </div>
                                </div>
                                <Button
                                    variant="hero"
                                    onClick={handleGenerateReportCards}
                                    disabled={!selectedExam || generatingReportCards}
                                >
                                    {generatingReportCards ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Generate Report Cards
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Attendance Report */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserCheck className="w-5 h-5" />
                                    Attendance Report
                                </CardTitle>
                                <CardDescription>Download attendance summary reports</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Class</Label>
                                        <SearchableSelect
                                            options={classes.map(c => ({ value: c.id, label: c.name }))}
                                            value={selectedClass}
                                            onValueChange={setSelectedClass}
                                            placeholder="Select class..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Section</Label>
                                        <SearchableSelect
                                            options={sections.map(s => ({ value: s.id, label: s.name }))}
                                            value={selectedSection}
                                            onValueChange={setSelectedSection}
                                            placeholder="All sections..."
                                            disabled={!selectedClass || sections.length === 0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Month</Label>
                                        <Input type="month" />
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadAttendanceReport}
                                    disabled={generatingAttendance}
                                >
                                    {generatingAttendance ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Attendance Report
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Fee Collection Report */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Fee Collection Report
                                </CardTitle>
                                <CardDescription>Download fee collection and payment reports</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>From Date</Label>
                                        <Input type="date" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>To Date</Label>
                                        <Input type="date" />
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadFeeReport}
                                    disabled={generatingFees}
                                >
                                    {generatingFees ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Fee Report
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        {/* Class-wise Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="w-5 h-5" />
                                    Student Distribution by Class
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Students</TableHead>
                                            <TableHead>Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analytics.classWiseStudents.map(item => (
                                            <TableRow key={item.name}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.count}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {((item.count / analytics.totalStudents) * 100).toFixed(1)}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/students')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <Users className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Student Database</p>
                                            <p className="text-sm text-muted-foreground">View all students</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/attendance')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-100 rounded-lg">
                                            <Calendar className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Attendance Records</p>
                                            <p className="text-sm text-muted-foreground">View attendance</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/exams')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-yellow-100 rounded-lg">
                                            <BookOpen className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Exam Results</p>
                                            <p className="text-sm text-muted-foreground">View exam data</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}