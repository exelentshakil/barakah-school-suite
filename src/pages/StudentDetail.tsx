// FILE: src/pages/StudentDetail.tsx - COMPLETE STUDENT PROFILE PAGE
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Users,
    BookOpen,
    Award,
    DollarSign,
    FileText,
    Edit,
    Trash2,
    Download,
    MessageSquare,
    ArrowLeft,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
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
    Radar
} from 'recharts';

interface StudentData {
    id: string;
    student_id: string;
    name_en: string;
    name_bn: string;
    dob: string;
    gender: string;
    blood_group: string;
    religion: string;
    admission_date: string;
    roll: number;
    status: string;
    photo_url?: string;
    classes: { name: string };
    sections: { name: string };
    guardians: {
        father_name: string;
        father_phone: string;
        father_occupation: string;
        mother_name: string;
        mother_phone: string;
        mother_occupation: string;
        address: string;
    };
}

export default function StudentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<StudentData | null>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [attendanceStats, setAttendanceStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        percentage: 0
    });
    const [feeStats, setFeeStats] = useState({
        total: 0,
        paid: 0,
        pending: 0
    });
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            loadStudentData();
        }
    }, [id]);

    const loadStudentData = async () => {
        setLoading(true);
        await Promise.all([
            loadStudent(),
            loadAttendance(),
            loadMarks(),
            loadInvoices(),
            loadCertificates()
        ]);
        setLoading(false);
    };

    const loadStudent = async () => {
        const { data, error } = await supabase
            .from('students')
            .select(`
        *,
        classes(name),
        sections(name),
        guardians(*)
      `)
            .eq('id', id)
            .single();

        if (error) {
            toast({ title: "Error loading student", description: error.message, variant: "destructive" });
            navigate('/students');
            return;
        }

        setStudent(data);
    };

    const loadAttendance = async () => {
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', id)
            .order('date', { ascending: false })
            .limit(30);

        if (data) {
            setAttendance(data);

            const present = data.filter(a => a.status === 'present').length;
            const absent = data.filter(a => a.status === 'absent').length;
            const late = data.filter(a => a.status === 'late').length;
            const total = data.length;

            setAttendanceStats({
                present,
                absent,
                late,
                total,
                percentage: total > 0 ? (present / total) * 100 : 0
            });

            // Last 7 days chart data
            const last7Days = data.slice(0, 7).reverse().map(a => ({
                date: new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }),
                status: a.status === 'present' ? 1 : 0
            }));
            setPerformanceData(last7Days);
        }
    };

    const loadMarks = async () => {
        const { data } = await supabase
            .from('marks')
            .select(`
        *,
        exams(name, exam_date, total_marks),
        subjects(name, code)
      `)
            .eq('student_id', id)
            .order('created_at', { ascending: false });

        if (data) {
            setMarks(data);

            // Subject-wise performance
            const subjectMap = new Map();
            data.forEach(mark => {
                const subject = mark.subjects?.name || 'Unknown';
                if (!subjectMap.has(subject)) {
                    subjectMap.set(subject, { total: 0, count: 0 });
                }
                const stats = subjectMap.get(subject);
                const percentage = (mark.obtained_marks / mark.exams.total_marks) * 100;
                stats.total += percentage;
                stats.count += 1;
            });

            const subjectPerf = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
                subject,
                percentage: (stats.total / stats.count).toFixed(1)
            }));
            setSubjectPerformance(subjectPerf);
        }
    };

    const loadInvoices = async () => {
        const { data } = await supabase
            .from('invoices')
            .select('*, payments(amount)')
            .eq('student_id', id)
            .order('created_at', { ascending: false });

        if (data) {
            setInvoices(data);

            const total = data.reduce((sum, inv) => sum + inv.total, 0);
            const paid = data
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + inv.total, 0);

            setFeeStats({
                total,
                paid,
                pending: total - paid
            });
        }
    };

    const loadCertificates = async () => {
        const { data: passingCerts } = await supabase
            .from('passing_certificates')
            .select('*, exams(name)')
            .eq('student_id', id);

        const { data: otherCerts } = await supabase
            .from('other_certificates')
            .select('*')
            .eq('student_id', id);

        const allCerts = [
            ...(passingCerts || []).map(c => ({ ...c, cert_type: 'Passing' })),
            ...(otherCerts || []).map(c => ({ ...c, cert_type: c.type }))
        ];

        setCertificates(allCerts);
    };

    const handleSendSMS = () => {
        navigate('/sms', {
            state: {
                preselectedStudent: student?.id,
                studentName: student?.name_en
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-red-100 text-red-800';
            case 'graduated': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getAttendanceColor = (status: string) => {
        switch(status) {
            case 'present': return 'text-green-600';
            case 'absent': return 'text-red-600';
            case 'late': return 'text-orange-600';
            default: return 'text-gray-600';
        }
    };

    const getAttendanceIcon = (status: string) => {
        switch(status) {
            case 'present': return CheckCircle;
            case 'absent': return XCircle;
            case 'late': return Clock;
            default: return AlertCircle;
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

    if (!student) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Student not found</p>
                    <Button onClick={() => navigate('/students')} className="mt-4">
                        Back to Students
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">{student.name_en}</h1>
                            <p className="text-muted-foreground">Student Profile</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSendSMS}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send SMS
                        </Button>
                        <Button variant="outline" onClick={() => navigate(`/students/edit/${id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{attendanceStats.percentage.toFixed(0)}%</div>
                            <Progress value={attendanceStats.percentage} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                {attendanceStats.present}/{attendanceStats.total} days present
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Fee Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">৳{feeStats.paid.toLocaleString()}</div>
                            <Progress value={(feeStats.paid / feeStats.total) * 100} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                ৳{feeStats.pending.toLocaleString()} pending
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Exams Taken</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{marks.length}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {subjectPerformance.length} subjects
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Certificates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{certificates.length}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Total earned
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Student Info */}
                    <div className="space-y-6">
                        {/* Basic Info Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        {student.photo_url ? (
                                            <img src={student.photo_url} alt={student.name_en} className="object-cover" />
                                        ) : (
                                            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                                {student.name_en.charAt(0)}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold">{student.name_en}</h2>
                                        {student.name_bn && (
                                            <p className="text-sm text-muted-foreground font-bengali">{student.name_bn}</p>
                                        )}
                                        <Badge className={getStatusColor(student.status)} variant="secondary">
                                            {student.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">ID:</span>
                                    <span className="font-mono">{student.student_id}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">Class:</span>
                                    <span>{student.classes?.name} - {student.sections?.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Award className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">Roll:</span>
                                    <span>{student.roll}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">DOB:</span>
                                    <span>{new Date(student.dob).toLocaleDateString('en-GB')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">Admission:</span>
                                    <span>{new Date(student.admission_date).toLocaleDateString('en-GB')}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Guardian Info Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Guardian Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium mb-2">Father</p>
                                    <div className="space-y-2 pl-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            <span>{student.guardians?.father_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-3 h-3 text-muted-foreground" />
                                            <span>{student.guardians?.father_phone}</span>
                                        </div>
                                        {student.guardians?.father_occupation && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <BookOpen className="w-3 h-3 text-muted-foreground" />
                                                <span>{student.guardians.father_occupation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <p className="text-sm font-medium mb-2">Mother</p>
                                    <div className="space-y-2 pl-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            <span>{student.guardians?.mother_name}</span>
                                        </div>
                                        {student.guardians?.mother_phone && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="w-3 h-3 text-muted-foreground" />
                                                <span>{student.guardians.mother_phone}</span>
                                            </div>
                                        )}
                                        {student.guardians?.mother_occupation && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <BookOpen className="w-3 h-3 text-muted-foreground" />
                                                <span>{student.guardians.mother_occupation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {student.guardians?.address && (
                                    <>
                                        <Separator />
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <span>{student.guardians.address}</span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Tabs */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="attendance" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                                <TabsTrigger value="academics">Academics</TabsTrigger>
                                <TabsTrigger value="fees">Fees</TabsTrigger>
                                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                            </TabsList>

                            {/* Attendance Tab */}
                            <TabsContent value="attendance" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Attendance Overview</CardTitle>
                                        <CardDescription>Last 30 days</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                                                <p className="text-xs text-muted-foreground">Present</p>
                                            </div>
                                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                                <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                                                <p className="text-xs text-muted-foreground">Absent</p>
                                            </div>
                                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                                <div className="text-2xl font-bold text-orange-600">{attendanceStats.late}</div>
                                                <p className="text-xs text-muted-foreground">Late</p>
                                            </div>
                                        </div>

                                        <ScrollArea className="h-[400px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Time</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {attendance.map((record) => {
                                                        const Icon = getAttendanceIcon(record.status);
                                                        return (
                                                            <TableRow key={record.id}>
                                                                <TableCell>{new Date(record.date).toLocaleDateString('en-GB')}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon className={cn("w-4 h-4", getAttendanceColor(record.status))} />
                                                                        <span className="capitalize">{record.status}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground">
                                                                    {record.time || '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Academics Tab */}
                            <TabsContent value="academics" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Subject Performance</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={subjectPerformance}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="subject" />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="percentage" fill="#3b82f6" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Exam Results</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[400px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Exam</TableHead>
                                                        <TableHead>Subject</TableHead>
                                                        <TableHead>Marks</TableHead>
                                                        <TableHead>%</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {marks.map((mark) => {
                                                        const percentage = ((mark.obtained_marks / mark.exams.total_marks) * 100).toFixed(1);
                                                        return (
                                                            <TableRow key={mark.id}>
                                                                <TableCell className="font-medium">{mark.exams.name}</TableCell>
                                                                <TableCell>{mark.subjects.name}</TableCell>
                                                                <TableCell>
                                                                    {mark.obtained_marks}/{mark.exams.total_marks}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={parseFloat(percentage) >= 60 ? 'default' : 'destructive'}>
                                                                        {percentage}%
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Fees Tab */}
                            <TabsContent value="fees" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Fee Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">৳{feeStats.total.toLocaleString()}</div>
                                                <p className="text-xs text-muted-foreground">Total</p>
                                            </div>
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">৳{feeStats.paid.toLocaleString()}</div>
                                                <p className="text-xs text-muted-foreground">Paid</p>
                                            </div>
                                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                                <div className="text-2xl font-bold text-red-600">৳{feeStats.pending.toLocaleString()}</div>
                                                <p className="text-xs text-muted-foreground">Pending</p>
                                            </div>
                                        </div>

                                        <ScrollArea className="h-[400px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Invoice</TableHead>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Amount</TableHead>
                                                        <TableHead>Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {invoices.map((invoice) => (
                                                        <TableRow key={invoice.id}>
                                                            <TableCell className="font-mono">{invoice.invoice_no}</TableCell>
                                                            <TableCell>{new Date(invoice.created_at).toLocaleDateString('en-GB')}</TableCell>
                                                            <TableCell>৳{invoice.total.toLocaleString()}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={
                                                                    invoice.status === 'paid' ? 'default' :
                                                                        invoice.status === 'partial' ? 'secondary' :
                                                                            'destructive'
                                                                }>
                                                                    {invoice.status}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Certificates Tab */}
                            <TabsContent value="certificates">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Certificates Earned</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {certificates.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                No certificates yet
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {certificates.map((cert) => (
                                                    <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Award className="w-8 h-8 text-primary" />
                                                            <div>
                                                                <p className="font-medium">{cert.cert_type} Certificate</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {cert.exams?.name || cert.type} • {new Date(cert.issue_date).toLocaleDateString('en-GB')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button variant="outline" size="sm">
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}