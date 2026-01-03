import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateAdmitCard, generateBulkAdmitCards } from '@/lib/admit-card';
import {
    FileText,
    Loader2,
    Download,
    Search,
    Filter,
    Eye,
    School,
    Calendar,
    User,
    X
} from 'lucide-react';

export default function AdmitCards() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Data
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [currentExam, setCurrentExam] = useState<any>(null);
    const [examSubjects, setExamSubjects] = useState<any[]>([]);

    const [students, setStudents] = useState<any[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

    const [sections, setSections] = useState<any[]>([]);
    const [sectionFilter, setSectionFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [schoolSettings, setSchoolSettings] = useState<any>(null);
    const [previewStudent, setPreviewStudent] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        loadInitialData();
    }, []);

    // Exam Selection Effect
    useEffect(() => {
        if (selectedExamId) {
            const exam = exams.find(e => e.id === selectedExamId);
            setCurrentExam(exam);
            loadExamDetails(selectedExamId, exam?.class_id);
        } else {
            setStudents([]);
            setFilteredStudents([]);
            setSections([]);
            setExamSubjects([]);
            setCurrentExam(null);
            setSelectedStudents(new Set());
        }
    }, [selectedExamId]);

    // Filtering Effect
    useEffect(() => {
        let result = students;

        if (sectionFilter && sectionFilter !== 'all') {
            result = result.filter(s => s.section_id === sectionFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.name_en.toLowerCase().includes(query) ||
                s.student_id.toLowerCase().includes(query) ||
                (s.roll && s.roll.toString().includes(query))
            );
        }

        setFilteredStudents(result);
    }, [students, sectionFilter, searchQuery]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [examsRes, schoolRes] = await Promise.all([
                supabase
                    .from('exams')
                    .select('*, classes(name)')
                    .order('start_date', { ascending: false }),
                supabase
                    .from('school_settings')
                    .select('*')
                    .single()
            ]);

            if (examsRes.data) setExams(examsRes.data);
            if (schoolRes.data) setSchoolSettings(schoolRes.data);
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast({ title: "Error loading data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const loadExamDetails = async (examId: string, classId: string) => {
        setLoading(true);
        try {
            // 1. Load Sections
            const { data: sectionsData } = await supabase
                .from('sections')
                .select('*')
                .eq('class_id', classId)
                .order('name');
            if (sectionsData) setSections(sectionsData);

            // 2. Load Subjects configured for this exam (skipping code column as requested)
            const { data: subjectsData } = await supabase
                .from('exam_subjects')
                .select('*, subjects(name)')
                .eq('exam_id', examId)
                .order('subject_id');

            if (subjectsData) setExamSubjects(subjectsData);

            // 3. Load Students
            const { data: studentsData } = await supabase
                .from('students')
                .select('*, classes(name), sections(name)')
                .eq('class_id', classId)
                .eq('status', 'active')
                .order('roll');
            if (studentsData) setStudents(studentsData);

        } catch (error) {
            console.error('Error loading exam details:', error);
            toast({ title: "Error loading data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedStudents.size === filteredStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const toggleStudent = (studentId: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const handleGenerate = async (singleStudent: any = null) => {
        const studentsToGenerate = singleStudent
            ? [singleStudent]
            : students.filter(s => selectedStudents.has(s.id));

        if (studentsToGenerate.length === 0) return;

        setGenerating(true);
        try {
            let doc;
            const fileName = `Admit_Card_${currentExam.name.replace(/\s+/g, '_')}`;

            if (studentsToGenerate.length === 1) {
                // Single Generation
                doc = await generateAdmitCard(
                    studentsToGenerate[0],
                    currentExam,
                    examSubjects,
                    schoolSettings
                );
                doc.save(`${fileName}_${studentsToGenerate[0].student_id}.pdf`);
            } else {
                // Bulk Generation
                doc = await generateBulkAdmitCards(
                    studentsToGenerate,
                    currentExam,
                    examSubjects,
                    schoolSettings
                );
                doc.save(`${fileName}_Bulk_${studentsToGenerate.length}.pdf`);
            }

            toast({
                title: "✓ Admit Cards Generated",
                description: `Successfully generated for ${studentsToGenerate.length} student(s)`
            });

            // Clear selection if not single mode
            if (!singleStudent) setSelectedStudents(new Set());

        } catch (error) {
            console.error("Admit card generation error:", error);
            toast({ title: "Generation failed", description: "Could not generate PDF.", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const renderAdmitCardPreview = () => {
        if (!previewStudent || !currentExam) return null;

        return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setPreviewStudent(null)}>
                <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                        <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Admit Card Preview
                        </h3>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPreviewStudent(null)}>
                                <X className="w-4 h-4 mr-2" /> Close
                            </Button>
                            <Button size="sm" onClick={() => handleGenerate(previewStudent)} disabled={generating}>
                                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2" />}
                                Download
                            </Button>
                        </div>
                    </div>

                    {/* Admit Card Canvas */}
                    <div className="p-8 bg-gray-100 overflow-auto">
                        <div className="bg-white border-4 border-double border-gray-300 p-8 mx-auto shadow-sm max-w-[210mm] min-h-[148mm] relative print:border-0">
                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                <School className="w-64 h-64" />
                            </div>

                            {/* Header */}
                            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                                <div className="flex items-center justify-center gap-4 mb-2">
                                    {schoolSettings?.logo_url ? (
                                        <img src={schoolSettings.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                            <School className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h1 className="text-2xl font-bold uppercase text-gray-900">{schoolSettings?.name || 'School Name'}</h1>
                                        <p className="text-sm text-gray-600">{schoolSettings?.address || 'School Address'}</p>
                                    </div>
                                </div>
                                <div className="inline-block bg-gray-900 text-white px-6 py-1 rounded-full text-sm font-bold uppercase tracking-wider mt-2">
                                    Admit Card
                                </div>
                            </div>

                            {/* Exam Info */}
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">{currentExam.name}</h2>
                                <p className="text-gray-600">Academic Year: {currentExam.academic_year}</p>
                            </div>

                            {/* Student Info Grid */}
                            <div className="flex gap-6 mb-6">
                                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm border p-4 rounded-lg bg-gray-50/50">
                                    <div className="text-gray-500">Student Name</div>
                                    <div className="font-bold">{previewStudent.name_en}</div>

                                    <div className="text-gray-500">Student ID</div>
                                    <div className="font-bold">{previewStudent.student_id}</div>

                                    <div className="text-gray-500">Class & Section</div>
                                    <div className="font-bold">{previewStudent.classes?.name} - {previewStudent.sections?.name}</div>

                                    <div className="text-gray-500">Roll Number</div>
                                    <div className="font-bold">{previewStudent.roll}</div>
                                </div>
                                <div className="w-32 h-36 border-2 border-gray-200 bg-gray-50 flex items-center justify-center rounded overflow-hidden">
                                    {previewStudent.photo_url ? (
                                        <img src={previewStudent.photo_url} alt="Student" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
                                            <User className="w-8 h-8 mb-1" />
                                            <span className="text-[10px]">PHOTO</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Subjects Table */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold border-b mb-2 pb-1">Examination Subjects</h3>
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-2 text-left">Subject Name</th>
                                        <th className="border p-2 text-center w-24">Date</th>
                                        <th className="border p-2 text-center w-24">Time</th>
                                        <th className="border p-2 text-center w-32">Invigilator</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {examSubjects.length > 0 ? (
                                        examSubjects.map((sub, idx) => (
                                            <tr key={idx}>
                                                <td className="border p-2 font-medium">
                                                    {sub.subjects?.name}
                                                </td>
                                                <td className="border p-2 text-center text-gray-400">--/--</td>
                                                <td className="border p-2 text-center text-gray-400">--:--</td>
                                                <td className="border p-2"></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="border p-4 text-center text-gray-500 italic">
                                                No subjects configured for this exam yet.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer / Signatures */}
                            <div className="flex justify-between items-end mt-12 pt-8">
                                <div className="text-center">
                                    <div className="w-40 border-t border-gray-400 mb-1"></div>
                                    <p className="text-xs text-gray-500">Student Signature</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-40 border-t border-gray-400 mb-1"></div>
                                    <p className="text-xs text-gray-500">Controller of Examinations</p>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="mt-8 pt-4 border-t text-[10px] text-gray-500 leading-tight">
                                <p className="font-bold mb-1">Instructions:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>Students must bring this admit card to the examination hall every day.</li>
                                    <li>Mobile phones and digital devices are strictly prohibited.</li>
                                    <li>Please arrive at least 15 minutes before the exam starts.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !selectedExamId) {
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Admit Cards</h1>
                        <p className="text-muted-foreground">Generate and print examination admit cards</p>
                    </div>
                    <Button
                        onClick={() => handleGenerate()}
                        disabled={generating || selectedStudents.size === 0}
                        size="lg"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Generate Selected ({selectedStudents.size})
                            </>
                        )}
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" /> Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Select Exam</Label>
                                <SearchableSelect
                                    options={exams.map(e => ({ value: e.id, label: `${e.name} (${e.classes?.name})` }))}
                                    value={selectedExamId}
                                    onValueChange={setSelectedExamId}
                                    placeholder="Select an upcoming exam..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Filter Section</Label>
                                <SearchableSelect
                                    options={[
                                        { value: 'all', label: 'All Sections' },
                                        ...sections.map(s => ({ value: s.id, label: s.name }))
                                    ]}
                                    value={sectionFilter}
                                    onValueChange={setSectionFilter}
                                    placeholder="Filter by section..."
                                    disabled={!selectedExamId}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Search Student</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Name or ID..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        disabled={!selectedExamId}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                {selectedExamId ? (
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Stats / Info Sidebar */}
                        <div className="space-y-6">
                            <Card className="bg-blue-50/50 border-blue-100">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg text-blue-900">Exam Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-blue-900">{currentExam?.name}</p>
                                            <p className="text-sm text-blue-700">
                                                {currentExam?.start_date ? new Date(currentExam.start_date).toLocaleDateString() : 'Date TBD'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <School className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-blue-900">Class {currentExam?.classes?.name}</p>
                                            <p className="text-sm text-blue-700">{examSubjects.length} Subjects</p>
                                        </div>
                                    </div>
                                    <Separator className="bg-blue-200" />
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-blue-900">{filteredStudents.length}</p>
                                            <p className="text-xs text-blue-700">Students</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-900">{selectedStudents.size}</p>
                                            <p className="text-xs text-blue-700">Selected</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Subjects Included</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px] pr-4">
                                        <div className="space-y-2">
                                            {examSubjects.map((es, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-background border">
                                                    <span>{es.subjects?.name}</span>
                                                    <Badge variant="outline">{es.full_marks}</Badge>
                                                </div>
                                            ))}
                                            {examSubjects.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-4">
                                                    No subjects found. Please configure subjects in the Exams page.
                                                </p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Student List */}
                        <Card className="md:col-span-2">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle>Eligible Students</CardTitle>
                                    <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={filteredStudents.length === 0}>
                                        {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                                            ? 'Deselect All'
                                            : 'Select All'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {filteredStudents.length > 0 ? (
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-2">
                                            {filteredStudents.map(student => (
                                                <div key={student.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                                                    <Checkbox
                                                        checked={selectedStudents.has(student.id)}
                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                    />
                                                    <Avatar>
                                                        <AvatarImage src={student.photo_url} />
                                                        <AvatarFallback>{student.name_en?.substring(0,2)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{student.name_en}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            ID: {student.student_id} • Roll: {student.roll} • {student.sections?.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" onClick={() => setPreviewStudent(student)}>
                                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleGenerate(student)}>
                                                            <Download className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No students found matching criteria</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 border-2 border-dashed rounded-xl">
                        <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold">Select an Exam</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Choose an exam from the filters above to load students and generate admit cards.
                        </p>
                    </div>
                )}
            </div>

            {/* Render Preview Modal */}
            {renderAdmitCardPreview()}
        </MainLayout>
    );
}