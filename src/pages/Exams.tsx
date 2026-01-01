// FILE: src/pages/Exams.tsx - WORLD CLASS EXAMS PAGE
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    BookOpen,
    Loader2,
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Calendar,
    ClipboardList,
    Award,
    TrendingUp,
    Users,
    FileText,
    Download,
    Upload,
    Save,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Exams() {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [examSubjects, setExamSubjects] = useState<any[]>([]);

    // Create Exam Dialog
    const [examDialogOpen, setExamDialogOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);
    const [examData, setExamData] = useState({
        name: '',
        type: 'mid-term',
        class_id: '',
        start_date: '',
        end_date: '',
        academic_year: new Date().getFullYear().toString()
    });
    const [examDialogSections, setExamDialogSections] = useState<any[]>([]);

    // Add Subjects Dialog
    const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<Record<string, boolean>>({});
    const [subjectMarks, setSubjectMarks] = useState<Record<string, { full_marks: string, pass_marks: string }>>({});

    // Delete Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    // Filters
    const [filterClass, setFilterClass] = useState('all');
    const [filterSection, setFilterSection] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // Stats
    const [stats, setStats] = useState({
        totalExams: 0,
        upcoming: 0,
        ongoing: 0,
        completed: 0
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
        loadExams();
    }, [filterClass, filterType]);

    useEffect(() => {
        if (filterClass && filterClass !== 'all') {
            loadFilterSections();
        } else {
            setSections([]);
            setFilterSection('all');
        }
    }, [filterClass]);

    useEffect(() => {
        if (examData.class_id) {
            loadExamDialogSections();
        } else {
            setExamDialogSections([]);
        }
    }, [examData.class_id]);

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
            loadExams()
        ]);
        setLoading(false);
    };

    const loadClasses = async () => {
        let query = supabase.from('classes').select('*').order('display_order');

        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('id', allowedClasses);
        }

        const { data } = await query;
        if (data) setClasses(data);
    };

    const loadExamDialogSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', examData.class_id)
            .order('name');
        if (data) setExamDialogSections(data);
    };

    const loadFilterSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', filterClass)
            .order('name');
        if (data) setSections(data);
    };

    const loadExams = async () => {
        let query = supabase
            .from('exams')
            .select('*, classes(name)')
            .order('start_date', { ascending: false });

        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('class_id', allowedClasses);
        }

        if (filterClass !== 'all') {
            query = query.eq('class_id', filterClass);
        }

        if (filterType !== 'all') {
            query = query.eq('type', filterType);
        }

        const { data } = await query;
        if (data) {
            setExams(data);
            calculateStats(data);
        }
    };

    const calculateStats = (data: any[]) => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = data.filter(e => e.start_date > today).length;
        const ongoing = data.filter(e => e.start_date <= today && e.end_date >= today).length;
        const completed = data.filter(e => e.end_date < today).length;

        setStats({
            totalExams: data.length,
            upcoming,
            ongoing,
            completed
        });
    };

    const handleOpenCreateDialog = () => {
        setEditingExam(null);
        setExamData({
            name: '',
            type: 'mid-term',
            class_id: '',
            start_date: '',
            end_date: '',
            academic_year: new Date().getFullYear().toString()
        });
        setExamDialogOpen(true);
    };

    const handleOpenEditDialog = (exam: any) => {
        setEditingExam(exam);
        setExamData({
            name: exam.name,
            type: exam.type,
            class_id: exam.class_id,
            start_date: exam.start_date,
            end_date: exam.end_date,
            academic_year: exam.academic_year
        });
        setExamDialogOpen(true);
    };

    const handleSaveExam = async () => {
        if (!examData.name || !examData.class_id) {
            toast({ title: "Please fill required fields", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            if (editingExam) {
                const { error } = await supabase
                    .from('exams')
                    .update(examData)
                    .eq('id', editingExam.id);

                if (error) throw error;
                toast({ title: "✓ Exam updated successfully!" });
            } else {
                const { error } = await supabase
                    .from('exams')
                    .insert(examData);

                if (error) throw error;
                toast({ title: "✓ Exam created successfully!" });
            }

            setExamDialogOpen(false);
            loadExams();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleOpenSubjectsDialog = async (exam: any) => {
        setSelectedExam(exam);

        // Load subjects for this class
        const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .eq('class_id', exam.class_id)
            .order('name');

        if (subjectsData) setAvailableSubjects(subjectsData);

        // Load existing exam subjects
        const { data: examSubjectsData } = await supabase
            .from('exam_subjects')
            .select('*')
            .eq('exam_id', exam.id);

        if (examSubjectsData) {
            const selected: Record<string, boolean> = {};
            const marks: Record<string, { full_marks: string, pass_marks: string }> = {};

            examSubjectsData.forEach(es => {
                if (es.subject_id) {
                    selected[es.subject_id] = true;
                    marks[es.subject_id] = {
                        full_marks: es.full_marks.toString(),
                        pass_marks: es.pass_marks.toString()
                    };
                }
            });

            setSelectedSubjects(selected);
            setSubjectMarks(marks);
        }

        setSubjectsDialogOpen(true);
    };

    const handleSaveExamSubjects = async () => {
        if (!selectedExam) return;

        const selectedIds = Object.entries(selectedSubjects).filter(([_, sel]) => sel).map(([id]) => id);
        if (selectedIds.length === 0) {
            toast({ title: "Please select at least one subject", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            // Delete existing exam subjects
            await supabase
                .from('exam_subjects')
                .delete()
                .eq('exam_id', selectedExam.id);

            // Insert new exam subjects
            const examSubjectsData = selectedIds.map(subjectId => {
                const subject = availableSubjects.find(s => s.id === subjectId);
                const marks = subjectMarks[subjectId] || { full_marks: '100', pass_marks: '33' };

                return {
                    exam_id: selectedExam.id,
                    subject_id: subjectId,
                    subject_name: subject?.name,
                    full_marks: parseInt(marks.full_marks),
                    pass_marks: parseInt(marks.pass_marks)
                };
            });

            const { error } = await supabase.from('exam_subjects').insert(examSubjectsData);
            if (error) throw error;

            toast({ title: "✓ Subjects configured successfully!" });
            setSubjectsDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', deleteTarget.id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "✓ Exam deleted successfully!" });
            loadExams();
        }

        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const getExamStatus = (exam: any) => {
        const today = new Date().toISOString().split('T')[0];
        if (exam.start_date > today) return 'upcoming';
        if (exam.end_date < today) return 'completed';
        return 'ongoing';
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

    const classOptions = [
        { value: 'all', label: 'All Classes' },
        ...classes.map(c => ({ value: c.id, label: c.name }))
    ];

    const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'mid-term', label: 'Mid-Term' },
        { value: 'final', label: 'Final' },
        { value: 'test', label: 'Test' },
        { value: 'assessment', label: 'Assessment' }
    ];

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Examinations</h1>
                        <p className="text-muted-foreground mt-1">Manage exams, subjects, and results</p>
                    </div>
                    <Button variant="hero" onClick={handleOpenCreateDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Exam
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <BookOpen className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Exams</p>
                                    <p className="text-2xl font-bold">{stats.totalExams}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Upcoming</p>
                                    <p className="text-2xl font-bold">{stats.upcoming}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Ongoing</p>
                                    <p className="text-2xl font-bold">{stats.ongoing}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Award className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold">{stats.completed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <SearchableSelect
                                    options={classOptions}
                                    value={filterClass}
                                    onValueChange={setFilterClass}
                                    placeholder="All classes..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <SearchableSelect
                                    options={[
                                        { value: 'all', label: 'All Sections' },
                                        ...sections.map(s => ({ value: s.id, label: s.name }))
                                    ]}
                                    value={filterSection}
                                    onValueChange={setFilterSection}
                                    placeholder="All sections..."
                                    disabled={filterClass === 'all' || sections.length === 0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Exam Type</Label>
                                <SearchableSelect
                                    options={typeOptions}
                                    value={filterType}
                                    onValueChange={setFilterType}
                                    placeholder="All types..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Exams Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {exams.map(exam => {
                        const status = getExamStatus(exam);
                        return (
                            <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl">{exam.name}</CardTitle>
                                            <CardDescription className="mt-1">
                                                {exam.classes?.name} • {exam.academic_year}
                                            </CardDescription>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(exam)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenSubjectsDialog(exam)}>
                                                    <ClipboardList className="w-4 h-4 mr-2" />
                                                    Configure Subjects
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => navigate(`/marks?exam=${exam.id}`)}>
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Enter Marks
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => {
                                                        setDeleteTarget(exam);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={
                                            status === 'upcoming' ? 'secondary' :
                                                status === 'ongoing' ? 'default' : 'outline'
                                        }>
                                            {status}
                                        </Badge>
                                        <Badge variant="outline">{exam.type}</Badge>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Start Date:</span>
                                            <span className="font-medium">
                        {exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'Not set'}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">End Date:</span>
                                            <span className="font-medium">
                        {exam.end_date ? new Date(exam.end_date).toLocaleDateString() : 'Not set'}
                      </span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => navigate(`/marks?exam=${exam.id}`)}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Enter Marks
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {exams.length === 0 && (
                    <Card>
                        <CardContent className="py-12">
                            <div className="flex flex-col items-center justify-center text-center">
                                <BookOpen className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No exams found</h3>
                                <p className="text-muted-foreground mb-4">
                                    {filterClass !== 'all' || filterType !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'Create your first exam to get started'}
                                </p>
                                <Button variant="hero" onClick={handleOpenCreateDialog}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Exam
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Create/Edit Exam Dialog */}
            <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingExam ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
                        <DialogDescription>
                            {editingExam ? 'Update exam information' : 'Add a new examination'}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="space-y-4 pr-4">
                            <div className="space-y-2">
                                <Label>Exam Name *</Label>
                                <Input
                                    value={examData.name}
                                    onChange={(e) => setExamData({...examData, name: e.target.value})}
                                    placeholder="First Terminal Exam"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Class *</Label>
                                    <SearchableSelect
                                        options={classes.map(c => ({ value: c.id, label: c.name }))}
                                        value={examData.class_id}
                                        onValueChange={(val) => setExamData({...examData, class_id: val})}
                                        placeholder="Select class..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'mid-term', label: 'Mid-Term' },
                                            { value: 'final', label: 'Final' },
                                            { value: 'test', label: 'Test' },
                                            { value: 'assessment', label: 'Assessment' }
                                        ]}
                                        value={examData.type}
                                        onValueChange={(val) => setExamData({...examData, type: val})}
                                        placeholder="Select type..."
                                    />
                                </div>
                            </div>

                            {examDialogSections.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Applicable Sections</Label>
                                    <div className="p-3 border rounded-lg bg-muted/30">
                                        <p className="text-sm text-muted-foreground mb-2">
                                            This exam will apply to all sections in {classes.find(c => c.id === examData.class_id)?.name}:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {examDialogSections.map(section => (
                                                <Badge key={section.id} variant="secondary">
                                                    {section.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={examData.start_date}
                                        onChange={(e) => setExamData({...examData, start_date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={examData.end_date}
                                        onChange={(e) => setExamData({...examData, end_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Academic Year</Label>
                                <Input
                                    value={examData.academic_year}
                                    onChange={(e) => setExamData({...examData, academic_year: e.target.value})}
                                    placeholder="2025"
                                />
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setExamDialogOpen(false)}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button variant="hero" onClick={handleSaveExam} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingExam ? 'Update' : 'Create'}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Configure Subjects Dialog */}
            <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Configure Exam Subjects</DialogTitle>
                        <DialogDescription>
                            Select subjects and set marks for {selectedExam?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(90vh-200px)]">
                        <div className="space-y-3 pr-4">
                            {availableSubjects.length > 0 ? (
                                availableSubjects.map(subject => (
                                    <div key={subject.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                        <Checkbox
                                            checked={selectedSubjects[subject.id] || false}
                                            onCheckedChange={(checked) => {
                                                setSelectedSubjects(prev => ({
                                                    ...prev,
                                                    [subject.id]: checked as boolean
                                                }));
                                                if (checked && !subjectMarks[subject.id]) {
                                                    setSubjectMarks(prev => ({
                                                        ...prev,
                                                        [subject.id]: {
                                                            full_marks: subject.full_marks.toString(),
                                                            pass_marks: subject.pass_marks.toString()
                                                        }
                                                    }));
                                                }
                                            }}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">{subject.name}</div>
                                            {subject.name_bn && (
                                                <div className="text-sm text-muted-foreground">{subject.name_bn}</div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Full"
                                                className="w-24"
                                                value={subjectMarks[subject.id]?.full_marks || ''}
                                                onChange={(e) => setSubjectMarks(prev => ({
                                                    ...prev,
                                                    [subject.id]: {
                                                        ...prev[subject.id],
                                                        full_marks: e.target.value
                                                    }
                                                }))}
                                                disabled={!selectedSubjects[subject.id]}
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Pass"
                                                className="w-24"
                                                value={subjectMarks[subject.id]?.pass_marks || ''}
                                                onChange={(e) => setSubjectMarks(prev => ({
                                                    ...prev,
                                                    [subject.id]: {
                                                        ...prev[subject.id],
                                                        pass_marks: e.target.value
                                                    }
                                                }))}
                                                disabled={!selectedSubjects[subject.id]}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>No subjects found for this class</p>
                                    <p className="text-sm">Configure subjects in Settings first</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setSubjectsDialogOpen(false)}>Cancel</Button>
                        <Button variant="hero" onClick={handleSaveExamSubjects} disabled={saving}>
                            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save Subjects'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                            This will permanently remove all exam data including marks and results.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
}