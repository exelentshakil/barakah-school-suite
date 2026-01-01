// FILE: src/pages/Marks.tsx - RESTRICT TO ASSIGNED SUBJECTS ONLY
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import {
    BookOpen, Save, Loader2, CheckCircle, AlertCircle,
    Users, Award
} from 'lucide-react';

export default function Marks() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const examId = searchParams.get('exam');
    const { userRole, loading: roleLoading, isAdmin, canAccessSubject, getAssignedSubjects } = useUserRole();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [marks, setMarks] = useState<Record<string, any>>({});
    const [activeSubject, setActiveSubject] = useState('');

    // FIX: Update Marks.tsx useEffect dependencies

// REPLACE THE useEffect AT THE TOP WITH THIS:
    useEffect(() => {
        if (examId && !roleLoading) {
            loadData();
        }
    }, [examId, roleLoading, userRole]); // Add roleLoading and userRole as dependencies

    const loadData = async () => {
        if (roleLoading) {
            return;
        }

        setLoading(true);

        const { data: examData, error: examError } = await supabase
            .from('exams')
            .select('*, classes(name)')
            .eq('id', examId)
            .maybeSingle();

        if (examError) {
            console.error('Exam error:', examError);
            toast({ title: "Error", description: "Exam not found", variant: "destructive" });
            setLoading(false);
            return;
        }

        if (!examData) {
            toast({ title: "Error", description: "Exam not found", variant: "destructive" });
            setLoading(false);
            return;
        }

        setExam(examData);

        const { data: subjectsData } = await supabase
            .from('exam_subjects')
            .select('*, subjects(name, name_bn)')
            .eq('exam_id', examId);

        if (subjectsData) {
            let filteredSubjects = subjectsData;

            // FILTER FOR TEACHERS - ONLY ASSIGNED SUBJECTS
            if (!isAdmin && userRole?.role === 'teacher') {
                const assignedSubjectIds = getAssignedSubjects();

                if (assignedSubjectIds.length > 0) {
                    filteredSubjects = subjectsData.filter(s =>
                        assignedSubjectIds.includes(s.subject_id)
                    );
                } else {
                    filteredSubjects = [];
                }

                if (filteredSubjects.length === 0) {
                    toast({
                        title: "No Access",
                        description: "You don't have any subject assignments for this exam",
                        variant: "destructive"
                    });
                    setSubjects([]);
                    setLoading(false);
                    return;
                }
            }

            setSubjects(filteredSubjects);
            if (filteredSubjects.length > 0) {
                setActiveSubject(filteredSubjects[0].id);
            }
        }

        const { data: studentsData } = await supabase
            .from('students')
            .select('*')
            .eq('class_id', examData.class_id)
            .eq('status', 'active')
            .order('roll');

        if (studentsData) setStudents(studentsData);

        const { data: marksData } = await supabase
            .from('marks')
            .select('*')
            .eq('exam_id', examId);

        if (marksData) {
            const marksMap: Record<string, any> = {};
            marksData.forEach(m => {
                const key = `${m.student_id}-${m.exam_subject_id}`;
                marksMap[key] = m;
            });
            setMarks(marksMap);
        }

        setLoading(false);
    };


    const calculateGrade = (total: number, fullMarks: number, passMarks: number) => {
        const percentage = (total / fullMarks) * 100;

        if (total < passMarks) return { grade: 'F', point: 0 };
        if (percentage >= 80) return { grade: 'A+', point: 5.0 };
        if (percentage >= 70) return { grade: 'A', point: 4.0 };
        if (percentage >= 60) return { grade: 'A-', point: 3.5 };
        if (percentage >= 50) return { grade: 'B', point: 3.0 };
        if (percentage >= 40) return { grade: 'C', point: 2.0 };
        if (percentage >= 33) return { grade: 'D', point: 1.0 };
        return { grade: 'F', point: 0 };
    };

    const updateMark = (studentId: string, subjectId: string, field: 'written' | 'mcq' | 'practical', value: string) => {
        const key = `${studentId}-${subjectId}`;
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const currentMark = marks[key] || {
            student_id: studentId,
            exam_subject_id: subjectId,
            written: null,
            mcq: null,
            practical: null,
            total: 0,
            letter_grade: 'F',
            grade_point: 0
        };

        const numValue = value === '' ? null : parseFloat(value);
        const updatedMark = { ...currentMark, [field]: numValue };

        const written = updatedMark.written || 0;
        const mcq = updatedMark.mcq || 0;
        const practical = updatedMark.practical || 0;
        const total = written + mcq + practical;

        const { grade, point } = calculateGrade(total, subject.full_marks, subject.pass_marks);

        updatedMark.total = total;
        updatedMark.letter_grade = grade;
        updatedMark.grade_point = point;

        setMarks(prev => ({ ...prev, [key]: updatedMark }));
    };

    const saveMarks = async () => {
        // Check permission
        if (!isAdmin && !canAccessSubject(activeSubject)) {
            toast({ title: "Access Denied", description: "You can't edit this subject", variant: "destructive" });
            return;
        }

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        const marksToSave = Object.values(marks)
            .filter(m => m.exam_subject_id === activeSubject)
            .map(m => ({
                exam_id: examId,
                exam_subject_id: m.exam_subject_id,
                student_id: m.student_id,
                written: m.written,
                mcq: m.mcq,
                practical: m.practical,
                total: m.total,
                letter_grade: m.letter_grade,
                grade_point: m.grade_point
            }));

        const { error } = await supabase
            .from('marks')
            .upsert(marksToSave, { onConflict: 'exam_id,exam_subject_id,student_id' });

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "✓ Saved", description: `${marksToSave.length} marks saved` });
            loadData();
        }
        setSaving(false);
    };

    const activeSubjectData = subjects.find(s => s.id === activeSubject);
    const markedCount = students.filter(s => {
        const key = `${s.id}-${activeSubject}`;
        return marks[key] && marks[key].total > 0;
    }).length;

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    if (subjects.length === 0) {
        return (
            <MainLayout>
                <div className="max-w-6xl mx-auto">
                    <Card className="border-orange-200">
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">No Subject Access</h2>
                            <p className="text-muted-foreground">
                                You don't have any subject assignments for this exam.
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Contact admin to assign subjects to you.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{exam?.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                {exam?.classes?.name} • {exam?.academic_year}
                            </p>
                        </div>
                    </div>
                    <Button onClick={saveMarks} disabled={saving} size="lg">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Marks
                    </Button>
                </div>

                {/* Subject Tabs */}
                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {subjects.map(subject => (
                                <Button
                                    key={subject.id}
                                    variant={activeSubject === subject.id ? 'default' : 'outline'}
                                    onClick={() => setActiveSubject(subject.id)}
                                    className="whitespace-nowrap"
                                >
                                    {subject.subjects?.name || subject.subject_name}
                                    {activeSubject === subject.id && (
                                        <Badge variant="secondary" className="ml-2">
                                            {markedCount}/{students.length}
                                        </Badge>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Subject Info */}
                {activeSubjectData && (
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Full Marks</p>
                                    <p className="text-2xl font-bold text-blue-600">{activeSubjectData.full_marks}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Pass Marks</p>
                                    <p className="text-2xl font-bold text-green-600">{activeSubjectData.pass_marks}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Students</p>
                                    <p className="text-2xl font-bold">{students.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Completed</p>
                                    <p className="text-2xl font-bold text-purple-600">{markedCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Marks Entry Table */}
                <Card>
                    <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="text-lg">Enter Marks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b-2">
                                <tr>
                                    <th className="text-left p-3 font-semibold text-sm w-16">Roll</th>
                                    <th className="text-left p-3 font-semibold text-sm">Student Name</th>
                                    <th className="text-center p-3 font-semibold text-sm w-32">Written</th>
                                    <th className="text-center p-3 font-semibold text-sm w-32">MCQ</th>
                                    <th className="text-center p-3 font-semibold text-sm w-32">Practical</th>
                                    <th className="text-center p-3 font-semibold text-sm w-32">Total</th>
                                    <th className="text-center p-3 font-semibold text-sm w-24">Grade</th>
                                    <th className="text-center p-3 font-semibold text-sm w-24">GP</th>
                                </tr>
                                </thead>
                                <tbody>
                                {students.map((student) => {
                                    const key = `${student.id}-${activeSubject}`;
                                    const mark = marks[key];
                                    const isFail = mark?.letter_grade === 'F' && mark?.total > 0;
                                    const isComplete = mark && mark.total > 0;

                                    return (
                                        <tr
                                            key={student.id}
                                            className={cn(
                                                "border-b hover:bg-gray-50 transition-colors",
                                                isFail && "bg-red-50",
                                                isComplete && !isFail && "bg-green-50/30"
                                            )}
                                        >
                                            <td className="p-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                        {student.roll}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </td>
                                            <td className="p-3">
                                                <p className="font-medium">{student.name_en}</p>
                                                <p className="text-xs text-muted-foreground">ID: {student.student_id}</p>
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={activeSubjectData?.full_marks}
                                                    value={mark?.written ?? ''}
                                                    onChange={(e) => updateMark(student.id, activeSubject, 'written', e.target.value)}
                                                    className="text-center h-10 font-semibold"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={activeSubjectData?.full_marks}
                                                    value={mark?.mcq ?? ''}
                                                    onChange={(e) => updateMark(student.id, activeSubject, 'mcq', e.target.value)}
                                                    className="text-center h-10 font-semibold"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={activeSubjectData?.full_marks}
                                                    value={mark?.practical ?? ''}
                                                    onChange={(e) => updateMark(student.id, activeSubject, 'practical', e.target.value)}
                                                    className="text-center h-10 font-semibold"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className={cn(
                                                    "text-xl font-bold inline-flex items-center gap-1",
                                                    isFail && "text-red-600",
                                                    isComplete && !isFail && "text-green-600"
                                                )}>
                                                    {mark?.total || 0}
                                                    {isComplete && !isFail && <CheckCircle className="w-4 h-4" />}
                                                    {isFail && <AlertCircle className="w-4 h-4" />}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge
                                                    className={cn(
                                                        "font-bold",
                                                        mark?.letter_grade === 'A+' && "bg-green-600",
                                                        mark?.letter_grade === 'A' && "bg-green-500",
                                                        mark?.letter_grade === 'A-' && "bg-blue-500",
                                                        mark?.letter_grade === 'B' && "bg-blue-400",
                                                        mark?.letter_grade === 'C' && "bg-yellow-500",
                                                        mark?.letter_grade === 'D' && "bg-orange-500",
                                                        mark?.letter_grade === 'F' && "bg-red-600"
                                                    )}
                                                >
                                                    {mark?.letter_grade || '-'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-center font-bold">
                                                {mark?.grade_point?.toFixed(1) || '0.0'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{markedCount}</p>
                                <p className="text-xs text-muted-foreground">Marked</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold text-green-600">
                                    {students.filter(s => {
                                        const key = `${s.id}-${activeSubject}`;
                                        return marks[key] && marks[key].letter_grade !== 'F' && marks[key].total > 0;
                                    }).length}
                                </p>
                                <p className="text-xs text-muted-foreground">Passed</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                            <div>
                                <p className="text-2xl font-bold text-red-600">
                                    {students.filter(s => {
                                        const key = `${s.id}-${activeSubject}`;
                                        return marks[key] && marks[key].letter_grade === 'F' && marks[key].total > 0;
                                    }).length}
                                </p>
                                <p className="text-xs text-muted-foreground">Failed</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Award className="w-8 h-8 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold text-purple-600">
                                    {students.filter(s => {
                                        const key = `${s.id}-${activeSubject}`;
                                        return marks[key] && marks[key].letter_grade === 'A+';
                                    }).length}
                                </p>
                                <p className="text-xs text-muted-foreground">A+ Grade</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}