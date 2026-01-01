// FILE: src/pages/Dashboard.tsx - WOW DASHBOARD WITH INSIGHTS
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    Users,
    UserCheck,
    DollarSign,
    TrendingUp,
    Award,
    Calendar,
    AlertCircle,
    Activity,
    Zap,
    MessageSquare,
    GraduationCap,
    Loader2,
    Maximize,
    X,
    TrendingDown,
    Target,
    Crown
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ScatterChart,
    Scatter,
    ZAxis
} from 'recharts';

const COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#6366f1',
    purple: '#a855f7',
    pink: '#ec4899',
    teal: '#14b8a6'
};

export default function Dashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        presentToday: 0,
        collectedThisMonth: 0,
        pendingFees: 0,
        smsBalance: 0,
        attendanceRate: 0,
        feeCollectionRate: 0
    });

    // Chart Data
    const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
    const [classRankings, setClassRankings] = useState<any[]>([]);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);
    const [attendanceByClass, setAttendanceByClass] = useState<any[]>([]);
    const [feeCollectionByClass, setFeeCollectionByClass] = useState<any[]>([]);
    const [performanceComparison, setPerformanceComparison] = useState<any[]>([]);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        await Promise.all([
            loadStats(),
            loadAttendanceTrend(),
            loadMonthlyRevenue(),
            loadClassRankings(),
            loadTopPerformers(),
            loadAttendanceByClass(),
            loadFeeCollectionByClass(),
            loadPerformanceComparison(),
            loadRecentActivities()
        ]);
        setLoading(false);
    };

    const loadStats = async () => {
        const { count: totalStudents } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });

        const { count: activeStudents } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        const today = new Date().toISOString().split('T')[0];
        const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('date', today);

        const presentToday = attendance?.filter(a => a.status === 'present').length || 0;

        const { data: payments } = await supabase
            .from('payments')
            .select('amount, created_at');

        const thisMonth = new Date();
        const collectedThisMonth = payments?.filter(p => {
            const pDate = new Date(p.created_at);
            return pDate.getMonth() === thisMonth.getMonth() && pDate.getFullYear() === thisMonth.getFullYear();
        }).reduce((sum, p) => sum + p.amount, 0) || 0;

        const { data: invoices } = await supabase
            .from('invoices')
            .select('total, status');

        const pendingFees = invoices?.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0) || 0;

        const { data: smsCredits } = await supabase
            .from('sms_credits')
            .select('balance')
            .single();

        const attendanceRate = activeStudents ? ((presentToday / activeStudents) * 100) : 0;
        const totalInvoiceAmount = invoices?.reduce((sum, i) => sum + i.total, 0) || 0;
        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const feeCollectionRate = totalInvoiceAmount ? ((totalRevenue / totalInvoiceAmount) * 100) : 0;

        setStats({
            totalStudents: totalStudents || 0,
            activeStudents: activeStudents || 0,
            presentToday,
            collectedThisMonth,
            pendingFees,
            smsBalance: smsCredits?.balance || 0,
            attendanceRate,
            feeCollectionRate
        });
    };

    const loadAttendanceTrend = async () => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const { data } = await supabase
                .from('attendance')
                .select('status')
                .eq('date', dateStr);

            const present = data?.filter(a => a.status === 'present').length || 0;
            const total = data?.length || 0;
            const rate = total > 0 ? (present / total) * 100 : 0;

            days.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rate: rate.toFixed(1),
                present,
                total
            });
        }
        setAttendanceTrend(days);
    };

    const loadMonthlyRevenue = async () => {
        const months = [];
        const currentDate = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

            const { data } = await supabase
                .from('payments')
                .select('amount')
                .gte('created_at', date.toISOString())
                .lt('created_at', nextMonth.toISOString());

            const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;

            months.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                revenue: total
            });
        }
        setMonthlyRevenue(months);
    };

    const loadClassRankings = async () => {
        const { data: classes } = await supabase
            .from('classes')
            .select('id, name')
            .order('display_order');

        const rankings = await Promise.all(
            (classes || []).map(async (cls) => {
                // Get top 10 students by roll
                const { data: students } = await supabase
                    .from('students')
                    .select('id, name_en, roll')
                    .eq('class_id', cls.id)
                    .eq('status', 'active')
                    .lte('roll', 10)
                    .order('roll');

                // Get their recent exam average
                const studentPerformance = await Promise.all(
                    (students || []).map(async (student) => {
                        const { data: marks } = await supabase
                            .from('marks')
                            .select('obtained_marks, exams(total_marks)')
                            .eq('student_id', student.id)
                            .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

                        const avgPercentage = marks && marks.length > 0
                            ? marks.reduce((sum, m) => sum + (m.obtained_marks / m.exams.total_marks) * 100, 0) / marks.length
                            : 0;

                        return {
                            roll: student.roll,
                            name: student.name_en,
                            performance: avgPercentage.toFixed(1)
                        };
                    })
                );

                return {
                    class: cls.name,
                    students: studentPerformance
                };
            })
        );

        setClassRankings(rankings.filter(r => r.students.length > 0));
    };

    const loadTopPerformers = async () => {
        const { data: marks } = await supabase
            .from('marks')
            .select(`
        student_id,
        obtained_marks,
        exams(total_marks),
        students(name_en, roll, classes(name))
      `)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const studentMap = new Map();
        marks?.forEach(mark => {
            const studentId = mark.student_id;
            if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                    name: mark.students?.name_en,
                    class: mark.students?.classes?.name,
                    roll: mark.students?.roll,
                    totalMarks: 0,
                    obtainedMarks: 0
                });
            }
            const student = studentMap.get(studentId);
            student.totalMarks += mark.exams.total_marks;
            student.obtainedMarks += mark.obtained_marks;
        });

        const performers = Array.from(studentMap.values())
            .map(s => ({
                name: s.name,
                class: s.class,
                roll: s.roll,
                percentage: ((s.obtainedMarks / s.totalMarks) * 100).toFixed(1)
            }))
            .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
            .slice(0, 10);

        setTopPerformers(performers);
    };

    const loadAttendanceByClass = async () => {
        const { data: classes } = await supabase
            .from('classes')
            .select('id, name');

        const today = new Date().toISOString().split('T')[0];

        const classAttendance = await Promise.all(
            (classes || []).map(async (cls) => {
                const { data: students } = await supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', cls.id)
                    .eq('status', 'active');

                const studentIds = students?.map(s => s.id) || [];

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('status')
                    .in('student_id', studentIds)
                    .eq('date', today);

                const present = attendance?.filter(a => a.status === 'present').length || 0;
                const total = studentIds.length;
                const rate = total > 0 ? (present / total) * 100 : 0;

                return {
                    class: cls.name,
                    rate: rate.toFixed(1),
                    present,
                    total
                };
            })
        );

        setAttendanceByClass(classAttendance.filter(c => c.total > 0));
    };

    const loadFeeCollectionByClass = async () => {
        const { data: classes } = await supabase
            .from('classes')
            .select('id, name');

        const classCollection = await Promise.all(
            (classes || []).map(async (cls) => {
                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('total, status, students!inner(class_id)')
                    .eq('students.class_id', cls.id);

                const total = invoices?.reduce((sum, i) => sum + i.total, 0) || 0;
                const collected = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0) || 0;
                const rate = total > 0 ? (collected / total) * 100 : 0;

                return {
                    class: cls.name,
                    rate: rate.toFixed(1),
                    collected,
                    total
                };
            })
        );

        setFeeCollectionByClass(classCollection.filter(c => c.total > 0));
    };

    const loadPerformanceComparison = async () => {
        const { data: classes } = await supabase
            .from('classes')
            .select('id, name');

        const comparison = await Promise.all(
            (classes || []).slice(0, 6).map(async (cls) => {
                // Attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: students } = await supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', cls.id)
                    .eq('status', 'active');

                const studentIds = students?.map(s => s.id) || [];

                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('status')
                    .in('student_id', studentIds)
                    .eq('date', today);

                const attendanceRate = studentIds.length > 0
                    ? ((attendance?.filter(a => a.status === 'present').length || 0) / studentIds.length) * 100
                    : 0;

                // Performance
                const { data: marks } = await supabase
                    .from('marks')
                    .select('obtained_marks, exams(total_marks), students!inner(class_id)')
                    .eq('students.class_id', cls.id)
                    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

                const performanceRate = marks && marks.length > 0
                    ? marks.reduce((sum, m) => sum + (m.obtained_marks / m.exams.total_marks) * 100, 0) / marks.length
                    : 0;

                // Fee Collection
                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('total, status, students!inner(class_id)')
                    .eq('students.class_id', cls.id);

                const totalFees = invoices?.reduce((sum, i) => sum + i.total, 0) || 0;
                const collected = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0) || 0;
                const collectionRate = totalFees > 0 ? (collected / totalFees) * 100 : 0;

                return {
                    class: cls.name,
                    attendance: attendanceRate.toFixed(0),
                    performance: performanceRate.toFixed(0),
                    collection: collectionRate.toFixed(0)
                };
            })
        );

        setPerformanceComparison(comparison);
    };

    const loadRecentActivities = async () => {
        const activities = [];

        const { data: payments } = await supabase
            .from('payments')
            .select('amount, created_at, invoices(students(name_en))')
            .order('created_at', { ascending: false })
            .limit(3);

        payments?.forEach(p => {
            activities.push({
                icon: DollarSign,
                color: 'text-green-600',
                bg: 'bg-green-100',
                title: 'Payment Received',
                description: `৳${p.amount} from ${p.invoices?.students?.name_en}`,
                time: new Date(p.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            });
        });

        setRecentActivities(activities.slice(0, 5));
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

    const DashboardContent = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Real-time insights and analytics</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadDashboardData}>
                        <Activity className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={() => setFullscreen(!fullscreen)}>
                        <Maximize className="w-4 h-4 mr-2" />
                        {fullscreen ? 'Exit' : 'Fullscreen'}
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-green-600 font-semibold">{stats.activeStudents}</span> active
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                            <DollarSign className="w-4 h-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">৳{stats.collectedThisMonth.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-orange-600 font-semibold">৳{stats.pendingFees.toLocaleString()}</span> pending
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Today</CardTitle>
                            <UserCheck className="w-4 h-4 text-purple-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.attendanceRate.toFixed(0)}%</div>
                        <Progress value={stats.attendanceRate} className="mt-2" />
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">SMS Balance</CardTitle>
                            <MessageSquare className="w-4 h-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.smsBalance}</div>
                        {stats.smsBalance < 100 && (
                            <p className="text-xs text-red-600 font-semibold mt-1">Low - Recharge now</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Attendance Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>14-Day Attendance Trend</CardTitle>
                        <CardDescription>Daily attendance percentage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={attendanceTrend}>
                                <defs>
                                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="rate" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorRate)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Revenue Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>12-Month Revenue Trend</CardTitle>
                        <CardDescription>Monthly collection overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Class Performance Matrix */}
            <Card>
                <CardHeader>
                    <CardTitle>Class Performance Matrix</CardTitle>
                    <CardDescription>Attendance, Academic Performance & Fee Collection by Class</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={performanceComparison}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="class" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} />
                            <Radar name="Attendance" dataKey="attendance" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                            <Radar name="Performance" dataKey="performance" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.6} />
                            <Radar name="Fee Collection" dataKey="collection" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.6} />
                            <Legend />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Class-wise Rankings */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-yellow-500" />
                            Top 10 Rankings by Class
                        </CardTitle>
                        <CardDescription>Roll 1-10 performance overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            {classRankings.map((ranking, idx) => (
                                <div key={idx} className="mb-6">
                                    <h3 className="font-semibold text-sm mb-3 text-primary">{ranking.class}</h3>
                                    <div className="space-y-2">
                                        {ranking.students.map((student: any, studentIdx: number) => (
                                            <div key={studentIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={studentIdx === 0 ? 'default' : 'secondary'}>
                                                        #{student.roll}
                                                    </Badge>
                                                    <span className="text-sm">{student.name}</span>
                                                </div>
                                                <Badge className={
                                                    parseFloat(student.performance) >= 80 ? 'bg-green-500' :
                                                        parseFloat(student.performance) >= 60 ? 'bg-blue-500' :
                                                            'bg-orange-500'
                                                }>
                                                    {student.performance}%
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            School Top Performers
                        </CardTitle>
                        <CardDescription>Last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {topPerformers.map((student, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className={
                                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-gray-200 text-gray-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'
                                        }>
                                            #{index + 1}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">{student.class} • Roll {student.roll}</p>
                                    </div>
                                    <Badge variant="default" className="font-bold">
                                        {student.percentage}%
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Class Comparisons */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance by Class</CardTitle>
                        <CardDescription>Today's attendance rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={attendanceByClass}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="class" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="rate" fill={COLORS.primary} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Fee Collection by Class</CardTitle>
                        <CardDescription>Collection rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={feeCollectionByClass}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="class" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="rate" fill={COLORS.success} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 bg-white z-50 overflow-auto">
                <div className="p-6">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" onClick={() => setFullscreen(false)}>
                            <X className="w-4 h-4 mr-2" />
                            Exit Fullscreen
                        </Button>
                    </div>
                    <DashboardContent />
                </div>
            </div>
        );
    }

    return (
        <MainLayout>
            <DashboardContent />
        </MainLayout>
    );
}