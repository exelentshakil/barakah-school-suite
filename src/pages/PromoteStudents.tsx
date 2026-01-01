// FILE: src/pages/PromoteStudents.tsx - WORLD CLASS STUDENT PROMOTION PAGE
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    TrendingUp,
    Users,
    ArrowRight,
    CheckCircle2,
    Loader2,
    AlertTriangle,
    History,
    Upload,
    Eye,
    RotateCcw
} from 'lucide-react';

interface PromotionData {
    student_id: string;
    student_name: string;
    student_id_number: string;
    current_class: string;
    current_section: string;
    current_roll: string | number;
    new_class_id: string;
    new_class_name: string;
    new_section_id: string;
    new_section_name: string;
    new_roll: string | number;
    selected: boolean;
}

export default function PromoteStudents() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [promoting, setPromoting] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [allSections, setAllSections] = useState<any[]>([]);

    // Filters
    const [fromClassId, setFromClassId] = useState('');
    const [toClassId, setToClassId] = useState('');
    const [academicYear, setAcademicYear] = useState('2024-2025');

    // Students data
    const [students, setStudents] = useState<PromotionData[]>([]);
    const [previewMode, setPreviewMode] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalStudents: 0,
        selectedStudents: 0,
        fromClass: '',
        toClass: ''
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (fromClassId) {
            loadStudents();
            loadSections(fromClassId);
        } else {
            setStudents([]);
        }
    }, [fromClassId]);

    useEffect(() => {
        if (toClassId) {
            loadSections(toClassId, true);
            // Auto-suggest roll numbers when target class changes
            autoAssignRolls();
        }
    }, [toClassId]);

    const loadInitialData = async () => {
        setLoading(true);
        await Promise.all([
            loadClasses(),
            loadAllSections()
        ]);
        setLoading(false);
    };

    const loadClasses = async () => {
        const { data } = await supabase
            .from('classes')
            .select('*')
            .order('display_order');
        if (data) setClasses(data);
    };

    const loadAllSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .order('name');
        if (data) setAllSections(data);
    };

    const loadSections = async (classId: string, isTarget = false) => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', classId)
            .order('name');

        if (data) {
            if (!isTarget) {
                setSections(data);
            }
        }
    };

    const loadStudents = async () => {
        const { data } = await supabase
            .from('students')
            .select('*, classes(name), sections(name)')
            .eq('class_id', fromClassId)
            .eq('status', 'active')
            .order('roll');

        if (data) {
            const promotionData: PromotionData[] = data.map(s => ({
                student_id: s.id,
                student_name: s.name_en,
                student_id_number: s.student_id,
                current_class: s.classes?.name || '',
                current_section: s.sections?.name || '',
                current_roll: s.roll || '',
                new_class_id: toClassId || '',
                new_class_name: '',
                new_section_id: '',
                new_section_name: '',
                new_roll: '',
                selected: true // Auto-select all
            }));
            setStudents(promotionData);
            updateStats(promotionData);
        }
    };

    const autoAssignRolls = () => {
        if (!toClassId || students.length === 0) return;

        const targetClass = classes.find(c => c.id === toClassId);
        setStudents(prev => prev.map((s, index) => ({
            ...s,
            new_class_id: toClassId,
            new_class_name: targetClass?.name || '',
            new_roll: index + 1 // Auto-assign sequential rolls
        })));
    };

    const updateStats = (studentData: PromotionData[]) => {
        const fromClass = classes.find(c => c.id === fromClassId);
        const toClass = classes.find(c => c.id === toClassId);

        setStats({
            totalStudents: studentData.length,
            selectedStudents: studentData.filter(s => s.selected).length,
            fromClass: fromClass?.name || '',
            toClass: toClass?.name || ''
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setStudents(prev => {
            const updated = prev.map(s => ({ ...s, selected: checked }));
            updateStats(updated);
            return updated;
        });
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        setStudents(prev => {
            const updated = prev.map(s =>
                s.student_id === studentId ? { ...s, selected: checked } : s
            );
            updateStats(updated);
            return updated;
        });
    };

    const handleSectionChange = (studentId: string, sectionId: string) => {
        const section = allSections.find(s => s.id === sectionId);
        setStudents(prev => prev.map(s =>
            s.student_id === studentId
                ? { ...s, new_section_id: sectionId, new_section_name: section?.name || '' }
                : s
        ));
    };

    const handleRollChange = (studentId: string, roll: string) => {
        setStudents(prev => prev.map(s =>
            s.student_id === studentId ? { ...s, new_roll: roll } : s
        ));
    };

    const handleAutoAssignSections = () => {
        if (!toClassId) {
            toast({ title: "Please select target class first", variant: "destructive" });
            return;
        }

        const targetSections = allSections.filter(s => s.class_id === toClassId);
        if (targetSections.length === 0) {
            toast({ title: "No sections available in target class", variant: "destructive" });
            return;
        }

        // Distribute students evenly across sections
        setStudents(prev => prev.map((s, index) => {
            const sectionIndex = index % targetSections.length;
            const section = targetSections[sectionIndex];
            return {
                ...s,
                new_section_id: section.id,
                new_section_name: section.name
            };
        }));

        toast({ title: "✓ Sections assigned automatically" });
    };

    const validatePromotion = (): string | null => {
        if (!fromClassId || !toClassId) {
            return "Please select both source and target classes";
        }

        const selected = students.filter(s => s.selected);
        if (selected.length === 0) {
            return "Please select at least one student to promote";
        }

        for (const student of selected) {
            if (!student.new_section_id) {
                return `Please assign section for ${student.student_name}`;
            }
            if (!student.new_roll) {
                return `Please assign roll number for ${student.student_name}`;
            }
        }

        // Check for duplicate rolls in same section
        const rollMap = new Map<string, Set<string>>();
        for (const student of selected) {
            const key = `${student.new_section_id}`;
            if (!rollMap.has(key)) {
                rollMap.set(key, new Set());
            }
            const rolls = rollMap.get(key)!;
            if (rolls.has(student.new_roll.toString())) {
                return `Duplicate roll number ${student.new_roll} found in same section`;
            }
            rolls.add(student.new_roll.toString());
        }

        return null;
    };

    const handlePreview = () => {
        const error = validatePromotion();
        if (error) {
            toast({ title: error, variant: "destructive" });
            return;
        }
        setPreviewMode(true);
    };

    const handlePromote = async () => {
        setShowConfirmDialog(false);
        setPromoting(true);

        try {
            const selected = students.filter(s => s.selected);

            // Update each student individually
            const updatePromises = selected.map(s =>
                supabase
                    .from('students')
                    .update({
                        class_id: s.new_class_id,
                        section_id: s.new_section_id,
                        roll: s.new_roll
                    })
                    .eq('id', s.student_id)
            );

            const results = await Promise.all(updatePromises);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) {
                throw new Error(`Failed to update ${errors.length} students`);
            }

            // Optional: Create promotion audit trail
            const promotionRecords = selected.map(s => ({
                student_id: s.student_id,
                from_class_id: fromClassId,
                to_class_id: s.new_class_id,
                from_section_id: sections.find(sec => sec.name === s.current_section)?.id,
                to_section_id: s.new_section_id,
                academic_year: academicYear,
                promoted_by: user?.id
            }));

            // You can create a promotions table later for audit trail
            // await supabase.from('student_promotions').insert(promotionRecords);

            toast({
                title: "✓ Students promoted successfully!",
                description: `${selected.length} students promoted to ${stats.toClass}`
            });

            // Reset
            setStudents([]);
            setFromClassId('');
            setToClassId('');
            setPreviewMode(false);

        } catch (error: any) {
            toast({ title: "Error promoting students", description: error.message, variant: "destructive" });
        } finally {
            setPromoting(false);
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
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-primary" />
                            Student Promotion
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Promote students to next class at year-end
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                {students.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>Total Students</CardDescription>
                                <CardTitle className="text-3xl">{stats.totalStudents}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>Selected</CardDescription>
                                <CardTitle className="text-3xl text-green-600">{stats.selectedStudents}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>From Class</CardDescription>
                                <CardTitle className="text-2xl">{stats.fromClass}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>To Class</CardDescription>
                                <CardTitle className="text-2xl text-blue-600">{stats.toClass || 'Not Set'}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Promotion Configuration</CardTitle>
                        <CardDescription>Select source class, target class, and academic year</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Academic Year</Label>
                                <Input
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    placeholder="2024-2025"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>From Class *</Label>
                                <SearchableSelect
                                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                                    value={fromClassId}
                                    onValueChange={setFromClassId}
                                    placeholder="Select current class"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>To Class *</Label>
                                <SearchableSelect
                                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                                    value={toClassId}
                                    onValueChange={setToClassId}
                                    placeholder="Select target class"
                                />
                            </div>
                        </div>

                        {students.length > 0 && (
                            <>
                                <Separator />
                                <div className="flex gap-2">
                                    <Button onClick={handleAutoAssignSections} variant="outline">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Auto-Assign Sections
                                    </Button>
                                    <Button onClick={handlePreview} variant="default">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview Changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Students Table */}
                {students.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Students to Promote</CardTitle>
                                    <CardDescription>
                                        Assign sections and roll numbers for each student
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={students.every(s => s.selected)}
                                        onCheckedChange={handleSelectAll}
                                    />
                                    <Label>Select All</Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Current Class</TableHead>
                                            <TableHead>Current Section</TableHead>
                                            <TableHead>Current Roll</TableHead>
                                            <TableHead>
                                                <ArrowRight className="w-4 h-4 mx-auto" />
                                            </TableHead>
                                            <TableHead>New Section *</TableHead>
                                            <TableHead>New Roll *</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student) => {
                                            const targetSections = allSections.filter(s => s.class_id === toClassId);
                                            return (
                                                <TableRow key={student.student_id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={student.selected}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectStudent(student.student_id, checked as boolean)
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {student.student_id_number}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {student.student_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{student.current_class}</Badge>
                                                    </TableCell>
                                                    <TableCell>{student.current_section}</TableCell>
                                                    <TableCell>{student.current_roll}</TableCell>
                                                    <TableCell>
                                                        <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <SearchableSelect
                                                            options={targetSections.map(s => ({
                                                                value: s.id,
                                                                label: s.name
                                                            }))}
                                                            value={student.new_section_id}
                                                            onValueChange={(value) => handleSectionChange(student.student_id, value)}
                                                            placeholder="Section"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={student.new_roll}
                                                            onChange={(e) => handleRollChange(student.student_id, e.target.value)}
                                                            placeholder="Roll"
                                                            className="w-20"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                {/* Preview Dialog */}
                <Dialog open={previewMode} onOpenChange={setPreviewMode}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Preview Promotion Changes
                            </DialogTitle>
                            <DialogDescription>
                                Review changes before promoting {stats.selectedStudents} students
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Important</AlertTitle>
                                <AlertDescription>
                                    This will update the class, section, and roll number for all selected students.
                                    Historical data (attendance, marks, certificates) will remain unchanged and linked to their previous classes.
                                </AlertDescription>
                            </Alert>

                            <div className="border rounded-lg p-4 bg-muted/50">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Academic Year:</span>
                                        <span className="ml-2 font-semibold">{academicYear}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Selected Students:</span>
                                        <span className="ml-2 font-semibold text-green-600">{stats.selectedStudents}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">From Class:</span>
                                        <span className="ml-2 font-semibold">{stats.fromClass}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">To Class:</span>
                                        <span className="ml-2 font-semibold text-blue-600">{stats.toClass}</span>
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="h-[300px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Current</TableHead>
                                            <TableHead>
                                                <ArrowRight className="w-4 h-4 mx-auto" />
                                            </TableHead>
                                            <TableHead>New Assignment</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.filter(s => s.selected).map((student) => (
                                            <TableRow key={student.student_id}>
                                                <TableCell>
                                                    <div className="font-medium">{student.student_name}</div>
                                                    <div className="text-xs text-muted-foreground">{student.student_id_number}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {student.current_class} - {student.current_section}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Roll: {student.current_roll}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-semibold text-blue-600">
                                                        {student.new_class_name} - {student.new_section_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Roll: {student.new_roll}</div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPreviewMode(false)}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Back to Edit
                            </Button>
                            <Button onClick={() => setShowConfirmDialog(true)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirm & Promote
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Confirmation Dialog */}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Student Promotion</DialogTitle>
                            <DialogDescription>
                                This action will promote {stats.selectedStudents} students from {stats.fromClass} to {stats.toClass}.
                            </DialogDescription>
                        </DialogHeader>

                        <Alert className="border-yellow-200 bg-yellow-50">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle>Are you sure?</AlertTitle>
                            <AlertDescription>
                                This will immediately update student records. Make sure you have reviewed all changes carefully.
                            </AlertDescription>
                        </Alert>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={promoting}>
                                Cancel
                            </Button>
                            <Button onClick={handlePromote} disabled={promoting}>
                                {promoting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Promoting...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Promote Now
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}