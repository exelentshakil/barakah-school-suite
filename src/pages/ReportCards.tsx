// FILE: src/pages/ReportCards.tsx - REPORT CARDS GENERATION
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    Loader2,
    Download,
    ArrowLeft,
    FileText,
    CheckCircle2,
    Award
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateReportCard } from '@/lib/report-card';

export default function ReportCards() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { examId } = useParams();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Data
    const [exam, setExam] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [school, setSchool] = useState<any>(null);

    useEffect(() => {
        if (examId) {
            loadData();
        }
    }, [examId]);

    const loadData = async () => {
        setLoading(true);

        // Load exam
        const { data: examData } = await supabase
            .from('exams')
            .select('*, classes(name)')
            .eq('id', examId)
            .single();

        if (examData) {
            setExam(examData);

            // Load students with marks and guardians
            const { data: studentsData } = await supabase
                .from('students')
                .select('*, classes(name), sections(name), guardians(*)')
                .eq('class_id', examData.class_id)
                .eq('status', 'active')
                .order('roll');

            if (studentsData) {
                // Load marks for each student
                const studentsWithMarks = await Promise.all(
                    studentsData.map(async (student) => {
                        // First get marks with exam_subjects
                        const { data: marks } = await supabase
                            .from('marks')
                            .select(`
                *,
                exam_subjects (
                  id,
                  subject_id,
                  subject_name,
                  full_marks,
                  pass_marks
                )
              `)
                            .eq('exam_id', examId)
                            .eq('student_id', student.id);

                        // If subject_name is null in exam_subjects, fetch from subjects table
                        let enrichedMarks = marks || [];
                        if (enrichedMarks.length > 0) {
                            enrichedMarks = await Promise.all(
                                enrichedMarks.map(async (mark) => {
                                    if (mark.exam_subjects && !mark.exam_subjects.subject_name && mark.exam_subjects.subject_id) {
                                        const { data: subject } = await supabase
                                            .from('subjects')
                                            .select('name, name_bn')
                                            .eq('id', mark.exam_subjects.subject_id)
                                            .single();

                                        if (subject) {
                                            return {
                                                ...mark,
                                                exam_subjects: {
                                                    ...mark.exam_subjects,
                                                    subject_name: subject.name
                                                }
                                            };
                                        }
                                    }
                                    return mark;
                                })
                            );
                        }

                        return {
                            ...student,
                            marks: enrichedMarks
                        };
                    })
                );

                setStudents(studentsWithMarks);
            }
        }

        // Load school settings
        const { data: schoolData } = await supabase
            .from('school_settings')
            .select('*')
            .single();
        if (schoolData) setSchool(schoolData);

        setLoading(false);
    };

    const toggleStudentSelection = (studentId: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedStudents.size === students.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(students.map(s => s.id)));
        }
    };

    const calculateGPA = (marks: any[]) => {
        if (marks.length === 0) return 0;
        const totalGP = marks.reduce((sum, m) => sum + (parseFloat(m.grade_point) || 0), 0);
        return totalGP / marks.length;
    };

    const calculateTotalMarks = (marks: any[]) => {
        return marks.reduce((sum, m) => sum + (parseFloat(m.total) || 0), 0);
    };

    const getGradeFromGPA = (gpa: number) => {
        if (gpa >= 5.0) return 'A+';
        if (gpa >= 4.0) return 'A';
        if (gpa >= 3.5) return 'A-';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        if (gpa >= 1.0) return 'D';
        return 'F';
    };

    const handleGenerateReportCards = async () => {
        if (selectedStudents.size === 0) {
            toast({ title: "Please select at least one student", variant: "destructive" });
            return;
        }

        setGenerating(true);

        try {
            const selectedStudentsList = students.filter(s => selectedStudents.has(s.id));

            for (const student of selectedStudentsList) {
                await generateReportCard(student, exam, school);
            }

            toast({
                title: `✓ Generated ${selectedStudents.size} report cards!`,
                description: "Report cards have been downloaded"
            });
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

    if (!exam) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-96 text-center">
                    <FileText className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                    <h2 className="text-2xl font-bold mb-2">Exam Not Found</h2>
                    <Button variant="hero" onClick={() => navigate('/reports')}>
                        Back to Reports
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
                        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Generate Report Cards</h1>
                            <p className="text-muted-foreground mt-1">
                                {exam.name} - {exam.classes?.name}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="hero"
                        onClick={handleGenerateReportCards}
                        disabled={selectedStudents.size === 0 || generating}
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Generate {selectedStudents.size > 0 ? `(${selectedStudents.size})` : 'All'}
                            </>
                        )}
                    </Button>
                </div>

                {/* Selection Bar */}
                {selectedStudents.size > 0 && (
                    <Card className="border-primary">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Checkbox
                                        checked={selectedStudents.size === students.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="font-medium">
                    {selectedStudents.size} of {students.length} selected
                  </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedStudents(new Set())}
                                >
                                    Clear Selection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Students Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Students ({students.length})</CardTitle>
                        <CardDescription>Select students to generate report cards</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedStudents.size === students.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Roll</TableHead>
                                        <TableHead>Subjects</TableHead>
                                        <TableHead>Total Marks</TableHead>
                                        <TableHead>GPA</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Result</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map(student => {
                                        const gpa = calculateGPA(student.marks);
                                        const totalMarks = calculateTotalMarks(student.marks);
                                        const grade = getGradeFromGPA(gpa);
                                        const hasFailed = student.marks.some((m: any) => {
                                            const subject = m.exam_subjects;
                                            return parseFloat(m.total) < subject.pass_marks;
                                        });

                                        return (
                                            <TableRow key={student.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedStudents.has(student.id)}
                                                        onCheckedChange={() => toggleStudentSelection(student.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarImage src={student.photo_url} />
                                                            <AvatarFallback>
                                                                {student.name_en?.[0]?.toUpperCase() || 'S'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{student.name_en}</div>
                                                            <div className="text-sm text-muted-foreground">{student.student_id}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{student.roll || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{student.marks.length} subjects</Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold">{totalMarks.toFixed(1)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={gpa >= 3.0 ? 'default' : 'secondary'}>
                                                        {gpa.toFixed(2)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={hasFailed ? 'destructive' : 'default'}>
                                                        {grade}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {hasFailed ? (
                                                        <Badge variant="destructive">Failed</Badge>
                                                    ) : (
                                                        <Badge variant="default" className="bg-green-600">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Passed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}