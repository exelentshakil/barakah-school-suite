// FILE: src/pages/Certificates.tsx - COMPLETE CERTIFICATES SYSTEM
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    Award,
    Plus,
    Download,
    Loader2,
    FileText,
    User,
    TrendingUp,
    BookOpen,
    Users
} from 'lucide-react';
import {
    generatePassingCertificate,
    generateTransferCertificate,
    generateCharacterCertificate,
    generateHifzCertificate
} from '@/lib/certificates-all';
import {Checkbox} from "@radix-ui/react-checkbox";

export default function Certificates() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [students, setStudents] = useState<any[]>([]);
    const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [classes, setClasses] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [passingCerts, setPassingCerts] = useState<any[]>([]);
    const [otherCerts, setOtherCerts] = useState<any[]>([]);
    const [schoolSettings, setSchoolSettings] = useState<any>(null);

    const [activeTab, setActiveTab] = useState('passing');
    const [examFilter, setExamFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');

    // Form data for other certificates
    const [formData, setFormData] = useState({
        type: 'transfer',
        student_id: '',
        reason: '',
        conduct: 'EXCELLENT',
        leaving_date: new Date().toISOString().split('T')[0],
        completion_date: new Date().toISOString().split('T')[0],
        teacher_name: '',
        remarks: ''
    });

    // Stats
    const [stats, setStats] = useState({
        passing: 0,
        transfer: 0,
        character: 0,
        hifz: 0
    });

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);

        // Load classes
        const { data: classesData } = await supabase
            .from('classes')
            .select('*')
            .order('name');
        if (classesData) setClasses(classesData);

        // Load exams
        const { data: examsData } = await supabase
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false });
        if (examsData) setExams(examsData);

        // Load passing certificates
        const { data: passingData } = await supabase
            .from('passing_certificates')
            .select('*, students(name_en, student_id, photo_url), exams(name)')
            .order('created_at', { ascending: false });
        if (passingData) setPassingCerts(passingData);

        // Load other certificates
        const { data: otherData } = await supabase
            .from('other_certificates')
            .select('*, students(name_en, student_id, photo_url)')
            .order('created_at', { ascending: false });
        if (otherData) setOtherCerts(otherData);

        // Calculate stats
        setStats({
            passing: passingData?.length || 0,
            transfer: otherData?.filter(c => c.type === 'transfer').length || 0,
            character: otherData?.filter(c => c.type === 'character').length || 0,
            hifz: otherData?.filter(c => c.type === 'hifz').length || 0
        });

        // Load students
        const { data: studentsData } = await supabase
            .from('students')
            .select('*, classes(name), sections(name), guardians(*)')
            .eq('status', 'active')
            .order('name_en');
        if (studentsData) setStudents(studentsData);

        // Load school settings
        const { data: schoolData } = await supabase
            .from('school_settings')
            .select('*')
            .single();
        if (schoolData) setSchoolSettings(schoolData);

        setLoading(false);
    };

    const loadEligibleStudents = async (examId: string) => {
        try {
            const exam = exams.find(e => e.id === examId);
            if (!exam) return;

            // Load students with marks for this exam
            const { data: studentsData } = await supabase
                .from('students')
                .select('*, classes(name), sections(name), guardians(*)')
                .eq('status', 'active')
                .order('roll');

            if (studentsData) {
                const studentsWithResults = await Promise.all(
                    studentsData.map(async (student) => {
                        const { data: marks } = await supabase
                            .from('marks')
                            .select('*, exam_subjects(subject_name, full_marks, pass_marks)')
                            .eq('exam_id', examId)
                            .eq('student_id', student.id);

                        if (!marks || marks.length === 0) return null;

                        // Calculate GPA
                        const totalGP = marks.reduce((sum, m) => sum + parseFloat(m.grade_point || 0), 0);
                        const gpa = totalGP / marks.length;
                        const hasFailed = marks.some(m => parseFloat(m.total) < (m.exam_subjects?.pass_marks || 33));

                        let grade = 'F';
                        if (!hasFailed) {
                            if (gpa >= 5.0) grade = 'A+';
                            else if (gpa >= 4.0) grade = 'A';
                            else if (gpa >= 3.5) grade = 'A-';
                            else if (gpa >= 3.0) grade = 'B';
                            else if (gpa >= 2.0) grade = 'C';
                            else if (gpa >= 1.0) grade = 'D';
                        }

                        // Check if already generated
                        const existing = passingCerts.find(c => c.student_id === student.id && c.exam_id === examId);

                        return {
                            ...student,
                            gpa: gpa.toFixed(2),
                            grade,
                            hasFailed,
                            certificateGenerated: !!existing,
                            certificateId: existing?.id
                        };
                    })
                );

                // Filter to only passed students
                const passed = studentsWithResults.filter(s => s && !s.hasFailed);
                setEligibleStudents(passed);
            }
        } catch (error) {
            console.error('Error loading eligible students:', error);
        }
    };

    const handleGeneratePassingSingle = async (student: any) => {
        setGenerating(true);
        try {
            const exam = exams.find(e => e.id === examFilter);
            if (!exam) throw new Error('Exam not found');

            const certNo = `CERT-${exam.id.slice(0, 8)}-${student.student_id}`;

            const { data: certData, error } = await supabase
                .from('passing_certificates')
                .insert({
                    student_id: student.id,
                    class_id: student.class_id,
                    exam_id: exam.id,
                    certificate_no: certNo,
                    gpa: parseFloat(student.gpa),
                    grade: student.grade,
                    issued_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            const doc = await generatePassingCertificate(student, exam, schoolSettings, certData);
            doc.save(`Passing_Certificate_${student.student_id}_${exam.name}.pdf`);

            toast({ title: "✓ Certificate generated!", description: student.name_en });
            loadData();
            loadEligibleStudents(examFilter);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleGeneratePassingBulk = async () => {
        if (selectedStudents.size === 0) {
            toast({ title: "No students selected", variant: "destructive" });
            return;
        }

        setGenerating(true);
        try {
            const exam = exams.find(e => e.id === examFilter);
            if (!exam) throw new Error('Exam not found');

            const selectedStudentData = eligibleStudents.filter(s => selectedStudents.has(s.id));

            for (const student of selectedStudentData) {
                const certNo = `CERT-${exam.id.slice(0, 8)}-${student.student_id}`;

                const { data: certData } = await supabase
                    .from('passing_certificates')
                    .insert({
                        student_id: student.id,
                        class_id: student.class_id,
                        exam_id: exam.id,
                        certificate_no: certNo,
                        gpa: parseFloat(student.gpa),
                        grade: student.grade,
                        issued_by: user?.id
                    })
                    .select()
                    .single();

                if (certData) {
                    const doc = await generatePassingCertificate(student, exam, schoolSettings, certData);
                    doc.save(`Passing_Certificate_${student.student_id}_${exam.name}.pdf`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            toast({ title: "✓ Certificates generated!", description: `${selectedStudents.size} certificates` });
            setSelectedStudents(new Set());
            loadData();
            loadEligibleStudents(examFilter);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleRedownloadPassing = async (student: any) => {
        setGenerating(true);
        try {
            const exam = exams.find(e => e.id === examFilter);
            if (!exam) throw new Error('Exam not found');

            const { data: certData } = await supabase
                .from('passing_certificates')
                .select('*')
                .eq('id', student.certificateId)
                .single();

            if (!certData) throw new Error('Certificate not found');

            const doc = await generatePassingCertificate(student, exam, schoolSettings, certData);
            doc.save(`Passing_Certificate_${student.student_id}_${exam.name}.pdf`);

            toast({ title: "✓ Certificate downloaded!" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateOther = async () => {
        if (!formData.student_id) {
            toast({ title: "Please select a student", variant: "destructive" });
            return;
        }

        setGenerating(true);
        try {
            const student = students.find(s => s.id === formData.student_id);
            if (!student) throw new Error('Student not found');

            // Generate certificate number
            const certNo = `${formData.type.toUpperCase()}-${Date.now()}-${student.student_id}`;

            // Save to database first
            const { data: certData, error } = await supabase
                .from('other_certificates')
                .insert({
                    student_id: formData.student_id,
                    type: formData.type,
                    certificate_no: certNo,
                    conduct: formData.conduct,
                    remarks: formData.remarks,
                    leaving_date: formData.type === 'transfer' ? formData.leaving_date : null,
                    reason: formData.type === 'transfer' ? formData.reason : null,
                    completion_date: formData.type === 'hifz' ? formData.completion_date : null,
                    teacher_name: formData.type === 'hifz' ? formData.teacher_name : null,
                    issued_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            // Generate PDF
            let doc;
            switch (formData.type) {
                case 'transfer':
                    doc = await generateTransferCertificate(student, schoolSettings, certData);
                    break;
                case 'character':
                    doc = await generateCharacterCertificate(student, schoolSettings, certData);
                    break;
                case 'hifz':
                    doc = await generateHifzCertificate(student, schoolSettings, certData);
                    break;
            }

            if (doc) {
                doc.save(`${formData.type}_Certificate_${student.student_id}.pdf`);
                toast({ title: "✓ Certificate generated!", description: student.name_en });
                setDialogOpen(false);
                loadData();

                // Reset form
                setFormData({
                    type: 'transfer',
                    student_id: '',
                    reason: '',
                    conduct: 'EXCELLENT',
                    leaving_date: new Date().toISOString().split('T')[0],
                    completion_date: new Date().toISOString().split('T')[0],
                    teacher_name: '',
                    remarks: ''
                });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleRedownload = async (cert: any, type: 'passing' | 'other') => {
        setGenerating(true);
        try {
            const student = cert.students;
            let doc;

            if (type === 'passing') {
                const exam = exams.find(e => e.id === cert.exam_id);
                doc = await generatePassingCertificate(student, exam, schoolSettings, cert);
            } else {
                switch (cert.type) {
                    case 'transfer':
                        doc = await generateTransferCertificate(student, schoolSettings, cert);
                        break;
                    case 'character':
                        doc = await generateCharacterCertificate(student, schoolSettings, cert);
                        break;
                    case 'hifz':
                        doc = await generateHifzCertificate(student, schoolSettings, cert);
                        break;
                }
            }

            if (doc) {
                doc.save(`${cert.type || 'passing'}_Certificate_${student.student_id}.pdf`);
                toast({ title: "✓ Certificate downloaded!" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGenerating(false);
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
                        <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
                        <p className="text-muted-foreground">Manage all student certificates</p>
                    </div>
                    <Button onClick={() => setDialogOpen(true)} size="lg">
                        <Plus className="w-4 h-4 mr-2" />
                        New Certificate
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Passing</CardTitle>
                            <Award className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.passing}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Transfer</CardTitle>
                            <FileText className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.transfer}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Character</CardTitle>
                            <User className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.character}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Hifz</CardTitle>
                            <BookOpen className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.hifz}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="passing">Passing Certificates</TabsTrigger>
                        <TabsTrigger value="transfer">Transfer</TabsTrigger>
                        <TabsTrigger value="character">Character</TabsTrigger>
                        <TabsTrigger value="hifz">Hifz</TabsTrigger>
                    </TabsList>

                    {/* Passing Certificates */}
                    <TabsContent value="passing">
                        <Card>
                            <CardHeader>
                                <CardTitle>Passing Certificates</CardTitle>
                                <CardDescription>Generate from exam results</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Filters for Passing Certificates */}
                                <div className="grid gap-4 md:grid-cols-2 mb-4">
                                    <div className="space-y-2">
                                        <Label>Select Exam *</Label>
                                        <SearchableSelect
                                            options={exams.map(e => ({ value: e.id, label: `${e.name} (${e.academic_year})` }))}
                                            value={examFilter}
                                            onValueChange={(value) => {
                                                setExamFilter(value);
                                                setSelectedStudents(new Set());
                                                if (value) loadEligibleStudents(value);
                                            }}
                                            placeholder="Select exam"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Class (Optional)</Label>
                                        <SearchableSelect
                                            options={[
                                                { value: '', label: 'All Classes' },
                                                ...classes.map(c => ({ value: c.id, label: c.name }))
                                            ]}
                                            value={classFilter}
                                            onValueChange={setClassFilter}
                                            placeholder="Select class"
                                        />
                                    </div>
                                </div>

                                {/* Eligible Students for Certificate Generation */}
                                {examFilter && eligibleStudents.length > 0 && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                {eligibleStudents.length} students eligible for certificates
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const notGenerated = eligibleStudents.filter(s => !s.certificateGenerated);
                                                        if (selectedStudents.size === notGenerated.length) {
                                                            setSelectedStudents(new Set());
                                                        } else {
                                                            setSelectedStudents(new Set(notGenerated.map(s => s.id)));
                                                        }
                                                    }}
                                                >
                                                    Select All Not Generated
                                                </Button>
                                                <Button
                                                    onClick={handleGeneratePassingBulk}
                                                    disabled={generating || selectedStudents.size === 0}
                                                >
                                                    {generating ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Award className="w-4 h-4 mr-2" />
                                                            Generate Selected ({selectedStudents.size})
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <ScrollArea className="h-[400px]">
                                            <div className="space-y-2">
                                                {eligibleStudents
                                                    .filter(s => !classFilter || s.class_id === classFilter)
                                                    .map((student) => (
                                                        <div key={student.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                                            {!student.certificateGenerated && (
                                                                <Checkbox
                                                                    checked={selectedStudents.has(student.id)}
                                                                    onCheckedChange={() => {
                                                                        const newSelected = new Set(selectedStudents);
                                                                        if (newSelected.has(student.id)) {
                                                                            newSelected.delete(student.id);
                                                                        } else {
                                                                            newSelected.add(student.id);
                                                                        }
                                                                        setSelectedStudents(newSelected);
                                                                    }}
                                                                />
                                                            )}
                                                            <Award className={`w-8 h-8 ${student.certificateGenerated ? 'text-green-600' : 'text-gray-400'}`} />
                                                            <div className="flex-1">
                                                                <div className="font-semibold">{student.name_en}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    ID: {student.student_id} • Class: {student.classes?.name} • GPA: {student.gpa} • Grade: {student.grade}
                                                                </div>
                                                            </div>
                                                            {student.certificateGenerated ? (
                                                                <>
                                                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                                        Generated
                                                                    </Badge>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleRedownloadPassing(student)}
                                                                        disabled={generating}
                                                                    >
                                                                        <Download className="w-4 h-4 mr-2" />
                                                                        Download
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => handleGeneratePassingSingle(student)}
                                                                    disabled={generating}
                                                                >
                                                                    <Award className="w-4 h-4 mr-2" />
                                                                    Generate
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </ScrollArea>
                                    </>
                                )}

                                {examFilter && eligibleStudents.length === 0 && !loading && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No eligible students found for this exam</p>
                                        <p className="text-sm">Students must have passing marks to generate certificates</p>
                                    </div>
                                )}

                                {!examFilter && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Select an exam to view eligible students</p>
                                    </div>
                                )}

                                {/* Already Generated Certificates List */}
                                {passingCerts.length > 0 && (
                                    <>
                                        <Separator className="my-6" />
                                        <div>
                                            <h3 className="font-semibold mb-3">Previously Generated Certificates</h3>
                                            <ScrollArea className="h-[300px]">
                                                <div className="space-y-2">
                                                    {passingCerts.map((cert) => (
                                                        <div key={cert.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                                            <Award className="w-8 h-8 text-green-600" />
                                                            <div className="flex-1">
                                                                <div className="font-semibold">{cert.students?.name_en}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {cert.exams?.name} • GPA: {cert.gpa} • Grade: {cert.grade}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Cert No: {cert.certificate_no} • {new Date(cert.issue_date).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRedownload(cert, 'passing')}
                                                                disabled={generating}
                                                            >
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Other Certificate Types */}
                    {['transfer', 'character', 'hifz'].map((type) => (
                        <TabsContent key={type} value={type}>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="capitalize">{type} Certificates</CardTitle>
                                    <CardDescription>Manually issued certificates</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-2">
                                            {otherCerts.filter(c => c.type === type).map((cert) => (
                                                <div key={cert.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                                    <FileText className="w-8 h-8 text-blue-600" />
                                                    <div className="flex-1">
                                                        <div className="font-semibold">{cert.students?.name_en}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Cert No: {cert.certificate_no} • {new Date(cert.issue_date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRedownload(cert, 'other')}
                                                        disabled={generating}
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>

                {/* Create Certificate Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Generate Certificate</DialogTitle>
                            <DialogDescription>Create transfer, character, or hifz certificate</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Certificate Type *</Label>
                                <SearchableSelect
                                    options={[
                                        { value: 'transfer', label: 'Transfer Certificate' },
                                        { value: 'character', label: 'Character Certificate' },
                                        { value: 'hifz', label: 'Hifz Certificate' }
                                    ]}
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    placeholder="Select type"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Student *</Label>
                                <SearchableSelect
                                    options={students.map(s => ({ value: s.id, label: `${s.name_en} (${s.student_id})` }))}
                                    value={formData.student_id}
                                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                                    placeholder="Select student"
                                />
                            </div>

                            {formData.type === 'transfer' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Leaving Date *</Label>
                                        <Input
                                            type="date"
                                            value={formData.leaving_date}
                                            onChange={(e) => setFormData({ ...formData, leaving_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason for Leaving</Label>
                                        <Textarea
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            placeholder="Enter reason..."
                                        />
                                    </div>
                                </>
                            )}

                            {formData.type === 'hifz' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Completion Date *</Label>
                                        <Input
                                            type="date"
                                            value={formData.completion_date}
                                            onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teacher Name</Label>
                                        <Input
                                            value={formData.teacher_name}
                                            onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                                            placeholder="Enter teacher name..."
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label>Conduct</Label>
                                <SearchableSelect
                                    options={[
                                        { value: 'EXCELLENT', label: 'Excellent' },
                                        { value: 'VERY GOOD', label: 'Very Good' },
                                        { value: 'GOOD', label: 'Good' },
                                        { value: 'SATISFACTORY', label: 'Satisfactory' }
                                    ]}
                                    value={formData.conduct}
                                    onValueChange={(value) => setFormData({ ...formData, conduct: value })}
                                    placeholder="Select conduct"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Remarks</Label>
                                <Textarea
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    placeholder="Additional remarks..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerateOther} disabled={generating}>
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Award className="w-4 h-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}