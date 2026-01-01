// FILE: src/pages/IDCards.tsx - WORLD CLASS ID CARDS PAGE
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    CreditCard,
    Loader2,
    Download,
    Users,
    Search,
    Filter,
    CheckCircle2,
    Eye
} from 'lucide-react';
import { generateIDCard, generateBulkIDCards } from '@/lib/id-card';

export default function IDCards() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [schoolSettings, setSchoolSettings] = useState<any>(null);
    const [previewStudent, setPreviewStudent] = useState<any>(null);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        generated: 0,
        selected: 0
    });

    useEffect(() => {
        loadData();
    }, [user, classFilter, sectionFilter]);

    const loadData = async () => {
        setLoading(true);

        // Load classes
        const { data: classesData } = await supabase
            .from('classes')
            .select('*')
            .order('name');
        if (classesData) setClasses(classesData);

        // Load sections for selected class
        if (classFilter) {
            const { data: sectionsData } = await supabase
                .from('sections')
                .select('*')
                .eq('class_id', classFilter)
                .order('name');
            if (sectionsData) setSections(sectionsData);
        }

        // Load students
        let query = supabase
            .from('students')
            .select('*, classes(name), sections(name), guardians(*)')
            .eq('status', 'active')
            .order('roll');

        if (classFilter) query = query.eq('class_id', classFilter);
        if (sectionFilter) query = query.eq('section_id', sectionFilter);

        const { data: studentsData } = await query;
        if (studentsData) {
            setStudents(studentsData);
            setStats({
                total: studentsData.length,
                generated: 0,
                selected: selectedStudents.size
            });
        }

        // Load school settings
        const { data: schoolData } = await supabase
            .from('school_settings')
            .select('*')
            .single();
        if (schoolData) setSchoolSettings(schoolData);

        setLoading(false);
    };

    const filteredStudents = students.filter(student =>
        student.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    const handleGenerateSingle = async (student: any) => {
        setGenerating(true);
        try {
            const doc = await generateIDCard(student, schoolSettings);
            doc.save(`ID_Card_${student.student_id}.pdf`);
            toast({ title: "✓ ID Card generated!", description: student.name_en });
        } catch (error) {
            toast({ title: "Error", description: "Failed to generate ID card", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateBulk = async () => {
        if (selectedStudents.size === 0) {
            toast({ title: "No students selected", variant: "destructive" });
            return;
        }

        setGenerating(true);
        try {
            const selectedStudentData = students.filter(s => selectedStudents.has(s.id));
            const doc = await generateBulkIDCards(selectedStudentData, schoolSettings);
            doc.save(`ID_Cards_Bulk_${selectedStudents.size}_students.pdf`);
            toast({
                title: "✓ ID Cards generated!",
                description: `${selectedStudents.size} cards in one PDF`
            });
            setSelectedStudents(new Set());
        } catch (error) {
            toast({ title: "Error", description: "Failed to generate ID cards", variant: "destructive" });
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
                        <h1 className="text-3xl font-bold tracking-tight">ID Cards</h1>
                        <p className="text-muted-foreground">Generate student ID cards</p>
                    </div>
                    <Button
                        onClick={handleGenerateBulk}
                        disabled={generating || selectedStudents.size === 0}
                        size="lg"
                        variant="default"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Generate Selected ({selectedStudents.size})
                            </>
                        )}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Selected</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{selectedStudents.size}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ready to Print</CardTitle>
                            <CreditCard className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{selectedStudents.size * 2}</div>
                            <p className="text-xs text-muted-foreground">pages (front + back)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <SearchableSelect
                                    options={[
                                        { value: '', label: 'All Classes' },
                                        ...classes.map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                    value={classFilter}
                                    onChange={(value) => {
                                        setClassFilter(value);
                                        setSectionFilter('');
                                    }}
                                    placeholder="Select class"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <SearchableSelect
                                    options={[
                                        { value: '', label: 'All Sections' },
                                        ...sections.map(s => ({ value: s.id, label: s.name }))
                                    ]}
                                    value={sectionFilter}
                                    onChange={setSectionFilter}
                                    placeholder="Select section"
                                    disabled={!classFilter}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Students List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Students</CardTitle>
                                <CardDescription>{filteredStudents.length} students found</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleSelectAll}
                            >
                                {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-2">
                                {filteredStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <Checkbox
                                            checked={selectedStudents.has(student.id)}
                                            onCheckedChange={() => toggleStudent(student.id)}
                                        />
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={student.photo_url} />
                                            <AvatarFallback>{student.name_en[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="font-semibold">{student.name_en}</div>
                                            <div className="text-sm text-muted-foreground">
                                                ID: {student.student_id} • Class: {student.classes?.name} {student.sections?.name} • Roll: {student.roll}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPreviewStudent(student)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Preview
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleGenerateSingle(student)}
                                                disabled={generating}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Generate
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Preview Modal */}
                {previewStudent && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewStudent(null)}>
                        <div className="bg-white rounded-lg p-6 max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">ID Card Preview</h3>
                                <Button variant="ghost" size="sm" onClick={() => setPreviewStudent(null)}>✕</Button>
                            </div>
                            <div className="bg-gray-100 p-8 rounded-lg">
                                <div className="flex gap-8 justify-center">
                                    {/* Front */}
                                    <div className="w-[506px] h-[320px] border-4 border-indigo-600 rounded-xl overflow-hidden shadow-lg bg-white">
                                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 text-center">
                                            <div className="font-bold text-lg">{schoolSettings?.name}</div>
                                            <div className="text-xs mt-1">{schoolSettings?.address}</div>
                                        </div>
                                        <div className="p-5 flex gap-4">
                                            <div className="w-[140px] h-[180px] border-2 border-indigo-600 rounded-lg overflow-hidden bg-gray-100">
                                                {previewStudent.photo_url ? (
                                                    <img src={previewStudent.photo_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400">No Photo</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-lg mb-2">{previewStudent.name_en}</div>
                                                <div className="space-y-2 text-sm">
                                                    <div><span className="font-semibold">ID:</span> {previewStudent.student_id}</div>
                                                    <div><span className="font-semibold">Class:</span> {previewStudent.classes?.name}</div>
                                                    <div><span className="font-semibold">Section:</span> {previewStudent.sections?.name}</div>
                                                    <div><span className="font-semibold">Roll:</span> {previewStudent.roll}</div>
                                                    <div><span className="font-semibold">Blood:</span> {previewStudent.blood_group || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Back */}
                                    <div className="w-[506px] h-[320px] border-4 border-indigo-600 rounded-xl overflow-hidden shadow-lg bg-white">
                                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 text-center">
                                            <div className="font-bold">STUDENT ID CARD</div>
                                            <div className="text-xs mt-1">Keep this card safe at all times</div>
                                        </div>
                                        <div className="p-5 text-sm">
                                            <div className="font-semibold mb-2 text-indigo-600">Father's Details</div>
                                            <div><span className="font-semibold">Name:</span> {previewStudent.guardians?.father_name || 'N/A'}</div>
                                            <div><span className="font-semibold">Mobile:</span> {previewStudent.guardians?.father_mobile || 'N/A'}</div>
                                            <div className="mt-3">
                                                <div className="font-semibold mb-1">Address:</div>
                                                <div className="text-xs">{previewStudent.address_present || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}