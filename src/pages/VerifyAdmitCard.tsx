import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Download, FileText, CheckCircle2, AlertCircle, Home, Calendar, School, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { generateAdmitCard } from '@/lib/admit-card';
import { useToast } from '@/hooks/use-toast';

export default function VerifyAdmitCard() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();

    // Expecting these params in the QR Code URL: /verify/admit-card?student_id=...&exam_id=...
    const studentIdParam = searchParams.get('student');
    const examIdParam = searchParams.get('exam');

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (studentIdParam && examIdParam) {
            loadAdmitCardData();
        } else {
            setError(true);
            setLoading(false);
        }
    }, [studentIdParam, examIdParam]);

    const loadAdmitCardData = async () => {
        try {
            // 1. Fetch Student Details
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('*, classes(name), sections(name), guardians(*)')
                .eq('id', studentIdParam) // Assuming param is the public Student ID (string), not UUID
                .single();

            if (studentError || !student) {
                console.error("Student not found");
                setError(true);
                return;
            }

            // 2. Fetch Exam Details
            const { data: exam, error: examError } = await supabase
                .from('exams')
                .select('*, classes(name)')
                .eq('id', examIdParam)
                .single();

            if (examError || !exam) {
                console.error("Exam not found");
                setError(true);
                return;
            }

            // 3. Fetch Exam Subjects
            const { data: subjects, error: subjectsError } = await supabase
                .from('exam_subjects')
                .select('*, subjects(name)')
                .eq('exam_id', exam.id)
                .order('subject_id');

            // 4. Fetch School Settings
            const { data: school } = await supabase
                .from('school_settings')
                .select('*')
                .single();

            setData({
                student,
                exam,
                subjects: subjects || [],
                school
            });

        } catch (error) {
            console.error('Error verifying admit card:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!data) return;

        setDownloading(true);
        try {
            const doc = await generateAdmitCard(data.student, data.exam, data.subjects, data.school);
            const fileName = `Admit_Card_${data.student.student_id}_${data.exam.name.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);
            toast({ title: "✓ Admit Card downloaded successfully!" });
        } catch (error: any) {
            toast({ title: "Error downloading", description: error.message, variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Verifying admit card...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-red-200 shadow-xl">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <div>
                                <CardTitle className="text-red-900">Invalid Admit Card</CardTitle>
                                <CardDescription>This document could not be verified</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                The student ID or exam details provided are invalid.
                                This admit card may have been revoked or does not exist in our records.
                            </p>
                        </div>
                        <Separator />
                        <div className="text-center text-sm text-muted-foreground">
                            <p>If you believe this is an error, please contact the school administration.</p>
                            <Link to="/" className="inline-block mt-4 text-primary underline">Return Home</Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Verification Badge */}
                <Card className="border-green-200 bg-white shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="p-4 bg-green-100 rounded-full w-fit">
                                <Shield className="w-10 h-10 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    <CardTitle className="text-2xl text-green-900">Verified Authentic</CardTitle>
                                </div>
                                <CardDescription className="text-base text-green-800">
                                    This admit card is valid for the specified examination.
                                </CardDescription>
                            </div>
                            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-sm px-4 py-2 w-fit">
                                Admit Card
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* Details Card */}
                <Card className="shadow-lg border-indigo-100">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-indigo-600" />
                            <CardTitle>Admit Card Details</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        {/* School Info */}
                        <div className="text-center md:text-left">
                            <h3 className="font-semibold text-sm text-muted-foreground mb-1 uppercase tracking-wider">Issuing Institution</h3>
                            <div className="text-xl font-bold text-slate-900">{data.school?.name}</div>
                            <div className="text-sm text-muted-foreground">{data.school?.address}</div>
                        </div>

                        <Separator />

                        {/* Exam & Student Info Grid */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Exam Details */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold border-b pb-2">
                                    <Calendar className="w-4 h-4" /> Examination Info
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Exam Name</div>
                                        <div className="font-medium text-lg">{data.exam.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Academic Year</div>
                                        <div className="font-medium">{data.exam.academic_year}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Start Date</div>
                                        <div className="font-medium">{new Date(data.exam.start_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Student Details */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold border-b pb-2">
                                    <User className="w-4 h-4" /> Student Profile
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Name</div>
                                            <div className="font-medium text-lg">{data.student.name_en}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Student ID</div>
                                            <div className="font-mono bg-slate-100 px-2 py-1 rounded w-fit text-sm font-semibold">
                                                {data.student.student_id}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Class</div>
                                                <div className="font-medium">{data.student.classes?.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Roll</div>
                                                <div className="font-medium">{data.student.roll}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-24 h-32 bg-slate-100 rounded-lg border flex items-center justify-center overflow-hidden shrink-0">
                                        {data.student.photo_url ? (
                                            <img src={data.student.photo_url} alt="Student" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-slate-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Subjects */}
                        <div>
                            <h3 className="font-semibold text-sm text-muted-foreground mb-4">Registered Subjects ({data.subjects.length})</h3>
                            <div className="bg-slate-50 rounded-lg border overflow-hidden">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-sm font-medium border-b bg-slate-100 text-slate-600">
                                    <div className="md:col-span-2">Subject Name</div>
                                    <div>Date</div>
                                    <div>Time</div>
                                </div>
                                <div className="divide-y">
                                    {data.subjects.map((sub: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-sm">
                                            <div className="md:col-span-2 font-medium">{sub.subjects?.name}</div>
                                            <div className="text-muted-foreground">{sub.date ? new Date(sub.date).toLocaleDateString() : '--'}</div>
                                            <div className="text-muted-foreground">{sub.time || '--'}</div>
                                        </div>
                                    ))}
                                    {data.subjects.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No subjects found for this exam.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Actions */}
                        <div className="flex justify-center pt-2">
                            <Button
                                size="lg"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700"
                            >
                                {downloading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Original Admit Card
                                    </>
                                )}
                            </Button>
                        </div>

                    </CardContent>
                </Card>

                {/* Footer */}
                <Card className="bg-slate-50/50 border-none shadow-sm">
                    <CardContent className="py-6">
                        <div className="text-center text-sm text-muted-foreground space-y-2">
                            <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold">
                                <School className="w-4 h-4" /> {data.school?.name}
                            </div>
                            <p className="text-xs max-w-lg mx-auto">
                                This page confirms that the student is officially registered for the specified examination.
                                Please verify the photo matches the student presenting the card.
                            </p>
                            <div className="pt-4">
                                <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
                                    <Home className="w-4 h-4" />
                                    Back to Home
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Branding */}
                <div className="text-center text-[10px] text-muted-foreground/60">
                    <p>Secured by BarakahSoft School Manager</p>
                </div>
            </div>
        </div>
    );
}