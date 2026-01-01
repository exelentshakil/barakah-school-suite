// FILE: src/pages/Students.tsx - WORLD CLASS STUDENTS PAGE
import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    Users,
    Loader2,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    UserPlus,
    Filter,
    Download,
    Upload,
    AlertCircle,
    CheckCircle2,
    Save,
    X,
    Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Students() {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    // Filters
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    // Bulk operations
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Edit dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [editSections, setEditSections] = useState<any[]>([]);
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showEditCamera, setShowEditCamera] = useState(false);
    const editVideoRef = useState<HTMLVideoElement | null>(null);
    const editStreamRef = useState<MediaStream | null>(null);

    // Import
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    // Teacher access
    const [allowedClasses, setAllowedClasses] = useState<string[]>([]);
    const [allowedSections, setAllowedSections] = useState<Record<string, string[]>>({});

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        male: 0,
        female: 0
    });

    useEffect(() => {
        loadTeacherAccess();
    }, [user]);

    useEffect(() => {
        if (allowedClasses.length > 0 || user?.role === 'admin' || user?.role === 'accountant') {
            loadClasses();
        }
    }, [allowedClasses, user]);

    useEffect(() => {
        if (selectedClass && selectedClass !== 'all') {
            loadSections();
        } else {
            setSections([]);
            setSelectedSection('all');
        }
    }, [selectedClass]);

    useEffect(() => {
        loadStudents();
    }, [selectedClass, selectedSection, selectedStatus, allowedClasses]);

    useEffect(() => {
        filterStudents();
    }, [students, searchQuery]);

    const loadTeacherAccess = async () => {
        if (!user) return;
        if (user.role === 'admin' || user.role === 'accountant') return;

        const { data: assignments } = await supabase
            .from('teacher_assignments')
            .select('class_id, section_id')
            .eq('user_id', user.id);

        if (assignments) {
            const classIds = [...new Set(assignments.map(a => a.class_id))];
            setAllowedClasses(classIds);

            const sectionsByClass: Record<string, string[]> = {};
            assignments.forEach(a => {
                if (a.section_id) {
                    if (!sectionsByClass[a.class_id]) sectionsByClass[a.class_id] = [];
                    if (!sectionsByClass[a.class_id].includes(a.section_id)) {
                        sectionsByClass[a.class_id].push(a.section_id);
                    }
                }
            });
            setAllowedSections(sectionsByClass);
        }
    };

    const loadClasses = async () => {
        let query = supabase.from('classes').select('*').order('display_order');

        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('id', allowedClasses);
        }

        const { data } = await query;
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        if (!selectedClass || selectedClass === 'all') return;

        let query = supabase
            .from('sections')
            .select('*')
            .eq('class_id', selectedClass)
            .order('name');

        if (user?.role === 'teacher' && allowedSections[selectedClass]?.length > 0) {
            query = query.in('id', allowedSections[selectedClass]);
        }

        const { data } = await query;
        if (data) setSections(data);
    };

    const loadStudents = async () => {
        setLoading(true);

        let query = supabase
            .from('students')
            .select('*, classes(name), sections(name), guardians(*)')
            .order('name_en');

        // Teacher access filter
        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('class_id', allowedClasses);
        }

        // Class filter
        if (selectedClass !== 'all') {
            query = query.eq('class_id', selectedClass);
        }

        // Section filter
        if (selectedSection !== 'all') {
            query = query.eq('section_id', selectedSection);
        } else if (user?.role === 'teacher' && selectedClass !== 'all' && allowedSections[selectedClass]?.length > 0) {
            query = query.in('section_id', allowedSections[selectedClass]);
        }

        // Status filter
        if (selectedStatus !== 'all') {
            query = query.eq('status', selectedStatus);
        }

        const { data } = await query;
        if (data) {
            setStudents(data);
            calculateStats(data);
        }

        setLoading(false);
    };

    const filterStudents = () => {
        if (!searchQuery.trim()) {
            setFilteredStudents(students);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = students.filter(student =>
            student.name_en?.toLowerCase().includes(query) ||
            student.name_bn?.toLowerCase().includes(query) ||
            student.student_id?.toLowerCase().includes(query) ||
            student.roll?.toString().includes(query) ||
            student.guardians?.father_name?.toLowerCase().includes(query) ||
            student.guardians?.father_mobile?.includes(query)
        );
        setFilteredStudents(filtered);
    };

    const calculateStats = (data: any[]) => {
        setStats({
            total: data.length,
            active: data.filter(s => s.status === 'active').length,
            inactive: data.filter(s => s.status === 'inactive').length,
            male: data.filter(s => s.gender === 'male').length,
            female: data.filter(s => s.gender === 'female').length
        });
    };

    const handleExport = () => {
        const exportData = filteredStudents.map(s => ({
            'Student ID': s.student_id,
            'Name (English)': s.name_en,
            'Name (Bengali)': s.name_bn || '',
            'Class': s.classes?.name || '',
            'Section': s.sections?.name || '',
            'Roll': s.roll || '',
            'Gender': s.gender || '',
            'Date of Birth': s.dob || '',
            'Blood Group': s.blood_group || '',
            'Religion': s.religion || '',
            'Status': s.status,
            'Father Name': s.guardians?.father_name || '',
            'Father Mobile': s.guardians?.father_mobile || '',
            'Mother Name': s.guardians?.mother_name || '',
            'Present Address': s.address_present || '',
            'Admission Date': s.admission_date || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `students_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "✓ Exported successfully!" });
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Student ID': 'STD-2025-001',
                'Name (English)': 'John Doe',
                'Name (Bengali)': 'জন ডো',
                'Class': 'Class 1',
                'Section': 'A',
                'Roll': '1',
                'Gender': 'male',
                'Date of Birth': '2015-01-01',
                'Blood Group': 'A+',
                'Religion': 'Islam',
                'Status': 'active',
                'Father Name': 'Father Name',
                'Father Mobile': '+880 1712345678',
                'Mother Name': 'Mother Name',
                'Present Address': 'Address here',
                'Admission Date': '2025-01-01'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'students_import_template.xlsx');
        toast({ title: "✓ Template downloaded!" });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                let successCount = 0;
                let errorCount = 0;

                for (const row of jsonData as any[]) {
                    const classData = classes.find(c => c.name === row['Class']);
                    if (!classData) {
                        errorCount++;
                        continue;
                    }

                    let sectionId = null;
                    if (row['Section']) {
                        const sectionData = await supabase
                            .from('sections')
                            .select('id')
                            .eq('class_id', classData.id)
                            .eq('name', row['Section'])
                            .single();
                        sectionId = sectionData.data?.id;
                    }

                    const { error } = await supabase.from('students').insert({
                        student_id: row['Student ID'] || `STD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name_en: row['Name (English)'],
                        name_bn: row['Name (Bengali)'] || null,
                        class_id: classData.id,
                        section_id: sectionId,
                        roll: row['Roll'] || null,
                        gender: row['Gender']?.toLowerCase() || 'male',
                        dob: row['Date of Birth'] || null,
                        blood_group: row['Blood Group'] || null,
                        religion: row['Religion'] || 'Islam',
                        address_present: row['Present Address'] || null,
                        admission_date: row['Admission Date'] || new Date().toISOString().split('T')[0],
                        status: row['Status']?.toLowerCase() || 'active'
                    });

                    if (error) errorCount++;
                    else successCount++;
                }

                toast({
                    title: "Import Complete!",
                    description: `Success: ${successCount}, Failed: ${errorCount}`
                });
                loadStudents();
            } catch (error) {
                toast({ title: "Import failed", variant: "destructive" });
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleEditClick = async (student: any) => {
        setEditingStudent(student);
        setEditPhotoPreview(student.photo_url || '');
        setEditPhotoFile(null);

        // Load guardian data
        if (student.guardians) {
            setEditingStudent({
                ...student,
                guardian: student.guardians
            });
        } else {
            const { data: guardianData } = await supabase
                .from('guardians')
                .select('*')
                .eq('student_id', student.id)
                .single();

            setEditingStudent({
                ...student,
                guardian: guardianData || {
                    father_name: '',
                    father_nid: '',
                    father_mobile: '',
                    father_occupation: '',
                    mother_name: '',
                    mother_mobile: '',
                    emergency_contact_name: '',
                    emergency_contact_mobile: ''
                }
            });
        }

        if (student.class_id) {
            const { data } = await supabase
                .from('sections')
                .select('*')
                .eq('class_id', student.class_id)
                .order('name');
            if (data) setEditSections(data);
        }
        setEditDialogOpen(true);
    };

    const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const startEditCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            editStreamRef[1](stream);
            if (editVideoRef[0]) {
                editVideoRef[0].srcObject = stream;
            }
            setShowEditCamera(true);
        } catch (error) {
            toast({
                title: "Camera Error",
                description: "Unable to access camera. Please check permissions.",
                variant: "destructive"
            });
        }
    };

    const stopEditCamera = () => {
        if (editStreamRef[0]) {
            editStreamRef[0].getTracks().forEach(track => track.stop());
            editStreamRef[1](null);
        }
        setShowEditCamera(false);
    };

    const captureEditPhoto = () => {
        if (!editVideoRef[0]) return;

        const canvas = document.createElement('canvas');
        canvas.width = editVideoRef[0].videoWidth;
        canvas.height = editVideoRef[0].videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(editVideoRef[0], 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setEditPhotoFile(file);
                    setEditPhotoPreview(canvas.toDataURL('image/jpeg'));
                    stopEditCamera();
                    toast({ title: "✓ Photo captured successfully!" });
                }
            }, 'image/jpeg', 0.95);
        }
    };

    const uploadEditPhoto = async () => {
        if (!editPhotoFile) return editingStudent.photo_url;

        setUploadingPhoto(true);
        const fileExt = editPhotoFile.name.split('.').pop();
        const fileName = `${editingStudent.student_id}-${Date.now()}.${fileExt}`;
        const filePath = `students/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(filePath, editPhotoFile);

        if (uploadError) {
            toast({ title: "Photo upload failed", variant: "destructive" });
            setUploadingPhoto(false);
            return editingStudent.photo_url;
        }

        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath);

        setUploadingPhoto(false);
        return urlData.publicUrl;
    };

    const handleSaveEdit = async () => {
        if (!editingStudent) return;

        const photoUrl = await uploadEditPhoto();

        // Update student
        const { error: studentError } = await supabase
            .from('students')
            .update({
                name_en: editingStudent.name_en,
                name_bn: editingStudent.name_bn,
                class_id: editingStudent.class_id,
                section_id: editingStudent.section_id,
                roll: editingStudent.roll,
                gender: editingStudent.gender,
                dob: editingStudent.dob,
                blood_group: editingStudent.blood_group,
                religion: editingStudent.religion,
                address_present: editingStudent.address_present,
                address_permanent: editingStudent.address_permanent,
                admission_date: editingStudent.admission_date,
                status: editingStudent.status,
                shift: editingStudent.shift,
                photo_url: photoUrl
            })
            .eq('id', editingStudent.id);

        if (studentError) {
            toast({ title: "Error", description: studentError.message, variant: "destructive" });
            return;
        }

        // Update guardian
        if (editingStudent.guardian) {
            const { error: guardianError } = await supabase
                .from('guardians')
                .update({
                    father_name: editingStudent.guardian.father_name,
                    father_nid: editingStudent.guardian.father_nid,
                    father_mobile: editingStudent.guardian.father_mobile,
                    father_occupation: editingStudent.guardian.father_occupation,
                    mother_name: editingStudent.guardian.mother_name,
                    mother_mobile: editingStudent.guardian.mother_mobile,
                    emergency_contact_name: editingStudent.guardian.emergency_contact_name,
                    emergency_contact_mobile: editingStudent.guardian.emergency_contact_mobile
                })
                .eq('student_id', editingStudent.id);

            if (guardianError) {
                toast({ title: "Guardian update failed", description: guardianError.message, variant: "destructive" });
                return;
            }
        }

        toast({ title: "✓ Student updated!" });
        setEditDialogOpen(false);
        loadStudents();
    };

    const handleStatusChange = async (studentId: string, newStatus: string) => {
        const { error } = await supabase
            .from('students')
            .update({ status: newStatus })
            .eq('id', studentId);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "✓ Status updated!" });
            loadStudents();
        }
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
        if (selectedStudents.size === filteredStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const handleBulkDelete = async () => {
        const { error } = await supabase
            .from('students')
            .delete()
            .in('id', Array.from(selectedStudents));

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: `✓ ${selectedStudents.size} students deleted!` });
            setSelectedStudents(new Set());
            loadStudents();
        }
        setBulkDeleteDialogOpen(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', deleteTarget.id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "✓ Student deleted successfully!" });
            loadStudents();
        }

        setDeleteDialogOpen(false);
        setDeleteTarget(null);
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

    if (user?.role === 'teacher' && allowedClasses.length === 0) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-96 text-center">
                    <AlertCircle className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                    <h2 className="text-2xl font-bold mb-2">No Class Access</h2>
                    <p className="text-muted-foreground">You haven't been assigned to any classes yet.</p>
                </div>
            </MainLayout>
        );
    }

    const classOptions = [
        { value: 'all', label: 'All Classes' },
        ...classes.map(c => ({ value: c.id, label: c.name }))
    ];

    const sectionOptions = [
        { value: 'all', label: 'All Sections' },
        ...sections.map(s => ({ value: s.id, label: s.name }))
    ];

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
                        <p className="text-muted-foreground mt-1">Manage student information and records</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={importing}>
                                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    Import
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={handleDownloadTemplate}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Template
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleImportClick}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload File
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredStudents.length === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Button variant="hero" onClick={() => navigate('/admission')}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Student
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Active</p>
                                    <p className="text-2xl font-bold">{stats.active}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Inactive</p>
                                    <p className="text-2xl font-bold">{stats.inactive}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Male</p>
                                    <p className="text-2xl font-bold">{stats.male}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-pink-100 rounded-lg">
                                    <Users className="w-6 h-6 text-pink-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Female</p>
                                    <p className="text-2xl font-bold">{stats.female}</p>
                                </div>
                            </div>
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
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Name, ID, Roll, Phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Class</Label>
                                <SearchableSelect
                                    options={classOptions}
                                    value={selectedClass}
                                    onValueChange={setSelectedClass}
                                    placeholder="Select class..."
                                    searchPlaceholder="Search class..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Section</Label>
                                <SearchableSelect
                                    options={sectionOptions}
                                    value={selectedSection}
                                    onValueChange={setSelectedSection}
                                    placeholder="All sections..."
                                    searchPlaceholder="Search section..."
                                    disabled={selectedClass === 'all' || sections.length === 0}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <SearchableSelect
                                    options={statusOptions}
                                    value={selectedStatus}
                                    onValueChange={setSelectedStatus}
                                    placeholder="All status..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Students Grid */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>
                                {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
                            </CardTitle>
                            {searchQuery && (
                                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                                    Clear Search
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No students found</h3>
                                <p className="text-muted-foreground mb-4">
                                    {searchQuery ? 'Try adjusting your search' : 'Add students to get started'}
                                </p>
                                {!searchQuery && (
                                    <Button variant="hero" onClick={() => navigate('/admission')}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Add First Student
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredStudents.map(student => (
                                    <Card key={student.id} className="hover:shadow-lg transition-shadow">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        checked={selectedStudents.has(student.id)}
                                                        onCheckedChange={() => toggleStudentSelection(student.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Avatar className="w-16 h-16">
                                                        <AvatarImage src={student.photo_url} />
                                                        <AvatarFallback className="text-lg">
                                                            {student.name_en?.[0]?.toUpperCase() || 'S'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-lg truncate">{student.name_en}</h3>
                                                            {student.name_bn && (
                                                                <p className="text-sm text-muted-foreground truncate">{student.name_bn}</p>
                                                            )}
                                                        </div>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => navigate(`/students/${student.id}`)}>
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleEditClick(student)}>
                                                                    <Edit className="w-4 h-4 mr-2" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                {student.status === 'active' ? (
                                                                    <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'inactive')}>
                                                                        Mark Inactive
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                                                        Mark Active
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => {
                                                                        setDeleteTarget(student);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <div className="mt-3 space-y-2">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Badge variant="outline">{student.student_id}</Badge>
                                                            <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                                                                {student.status}
                                                            </Badge>
                                                        </div>

                                                        <div className="text-sm space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-muted-foreground">Class:</span>
                                                                <span className="font-medium">{student.classes?.name || 'N/A'}</span>
                                                            </div>
                                                            {student.sections?.name && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-muted-foreground">Section:</span>
                                                                    <span className="font-medium">{student.sections.name}</span>
                                                                </div>
                                                            )}
                                                            {student.roll && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-muted-foreground">Roll:</span>
                                                                    <span className="font-medium">{student.roll}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {student.guardians?.father_mobile && (
                                                            <Separator className="my-2" />
                                                        )}

                                                        {student.guardians?.father_mobile && (
                                                            <div className="text-xs space-y-1">
                                                                <div className="text-muted-foreground">Guardian</div>
                                                                <div className="font-medium">{student.guardians.father_name}</div>
                                                                <div className="text-muted-foreground">{student.guardians.father_mobile}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bulk Actions - Bottom Bar */}
                {selectedStudents.size > 0 && (
                    <Card className="border-primary sticky bottom-4 shadow-lg">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Checkbox
                                        checked={selectedStudents.size === filteredStudents.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="font-medium">
                    {selectedStudents.size} of {filteredStudents.length} selected
                  </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedStudents(new Set())}
                                    >
                                        Clear Selection
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setBulkDeleteDialogOpen(true)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Selected
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Edit Student</DialogTitle>
                        <DialogDescription>Update student information</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(90vh-150px)]">
                        {editingStudent && (
                            <Tabs defaultValue="student" className="pr-4">
                                <TabsList className="grid w-full grid-cols-3 mb-4">
                                    <TabsTrigger value="student">Student</TabsTrigger>
                                    <TabsTrigger value="guardian">Guardian</TabsTrigger>
                                    <TabsTrigger value="address">Address</TabsTrigger>
                                </TabsList>

                                <TabsContent value="student" className="space-y-4">
                                    {/* Photo Upload */}
                                    <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
                                        <div className="relative">
                                            <Avatar className="w-24 h-24">
                                                <AvatarImage src={editPhotoPreview} />
                                                <AvatarFallback className="text-2xl">
                                                    {editingStudent.name_en?.[0]?.toUpperCase() || 'S'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleEditPhotoChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                id="edit-photo-upload"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label>Student Photo</Label>
                                            <p className="text-sm text-muted-foreground mb-2">Click to upload or use camera</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => document.getElementById('edit-photo-upload')?.click()}
                                                >
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Upload
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={startEditCamera}
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    Camera
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Camera Modal for Edit */}
                                    {showEditCamera && (
                                        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                                            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold">Capture Photo</h3>
                                                    <Button variant="ghost" size="sm" onClick={stopEditCamera}>✕</Button>
                                                </div>
                                                <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                                                    <video
                                                        ref={(el) => {
                                                            editVideoRef[1](el);
                                                            if (el && editStreamRef[0]) {
                                                                el.srcObject = editStreamRef[0];
                                                                el.play();
                                                            }
                                                        }}
                                                        autoPlay
                                                        playsInline
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="outline" onClick={stopEditCamera}>
                                                        Cancel
                                                    </Button>
                                                    <Button onClick={captureEditPhoto} variant="default">
                                                        <Camera className="w-4 h-4 mr-2" />
                                                        Capture
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Student ID</Label>
                                            <Input value={editingStudent.student_id} disabled />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Admission Date</Label>
                                            <Input
                                                type="date"
                                                value={editingStudent.admission_date || ''}
                                                onChange={(e) => setEditingStudent({...editingStudent, admission_date: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Name (English) *</Label>
                                            <Input
                                                value={editingStudent.name_en}
                                                onChange={(e) => setEditingStudent({...editingStudent, name_en: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Name (Bengali)</Label>
                                            <Input
                                                value={editingStudent.name_bn || ''}
                                                onChange={(e) => setEditingStudent({...editingStudent, name_bn: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Class *</Label>
                                            <SearchableSelect
                                                options={classes.map(c => ({ value: c.id, label: c.name }))}
                                                value={editingStudent.class_id}
                                                onValueChange={async (val) => {
                                                    setEditingStudent({...editingStudent, class_id: val, section_id: null});
                                                    const { data } = await supabase.from('sections').select('*').eq('class_id', val).order('name');
                                                    if (data) setEditSections(data);
                                                }}
                                                placeholder="Select class..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Section</Label>
                                            <SearchableSelect
                                                options={editSections.map(s => ({ value: s.id, label: s.name }))}
                                                value={editingStudent.section_id || ''}
                                                onValueChange={(val) => setEditingStudent({...editingStudent, section_id: val})}
                                                placeholder="Select section..."
                                                disabled={!editingStudent.class_id || editSections.length === 0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Roll</Label>
                                            <Input
                                                type="number"
                                                value={editingStudent.roll || ''}
                                                onChange={(e) => setEditingStudent({...editingStudent, roll: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Gender</Label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'male', label: 'Male' },
                                                    { value: 'female', label: 'Female' }
                                                ]}
                                                value={editingStudent.gender}
                                                onValueChange={(val) => setEditingStudent({...editingStudent, gender: val})}
                                                placeholder="Select..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date of Birth</Label>
                                            <Input
                                                type="date"
                                                value={editingStudent.dob || ''}
                                                onChange={(e) => setEditingStudent({...editingStudent, dob: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Blood Group</Label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'A+', label: 'A+' },
                                                    { value: 'A-', label: 'A-' },
                                                    { value: 'B+', label: 'B+' },
                                                    { value: 'B-', label: 'B-' },
                                                    { value: 'O+', label: 'O+' },
                                                    { value: 'O-', label: 'O-' },
                                                    { value: 'AB+', label: 'AB+' },
                                                    { value: 'AB-', label: 'AB-' }
                                                ]}
                                                value={editingStudent.blood_group || ''}
                                                onValueChange={(val) => setEditingStudent({...editingStudent, blood_group: val})}
                                                placeholder="Select..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Religion</Label>
                                            <Input
                                                value={editingStudent.religion || ''}
                                                onChange={(e) => setEditingStudent({...editingStudent, religion: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Shift</Label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'morning', label: 'Morning' },
                                                    { value: 'day', label: 'Day' }
                                                ]}
                                                value={editingStudent.shift || 'morning'}
                                                onValueChange={(val) => setEditingStudent({...editingStudent, shift: val})}
                                                placeholder="Select..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'active', label: 'Active' },
                                                    { value: 'inactive', label: 'Inactive' }
                                                ]}
                                                value={editingStudent.status}
                                                onValueChange={(val) => setEditingStudent({...editingStudent, status: val})}
                                                placeholder="Select..."
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="guardian" className="space-y-4">
                                    {editingStudent.guardian && (
                                        <>
                                            <div>
                                                <h3 className="font-semibold mb-4">Father Information</h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Father's Name *</Label>
                                                        <Input
                                                            value={editingStudent.guardian.father_name || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, father_name: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Father's NID</Label>
                                                        <Input
                                                            value={editingStudent.guardian.father_nid || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, father_nid: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Father's Mobile *</Label>
                                                        <Input
                                                            value={editingStudent.guardian.father_mobile || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, father_mobile: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Occupation</Label>
                                                        <Input
                                                            value={editingStudent.guardian.father_occupation || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, father_occupation: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div>
                                                <h3 className="font-semibold mb-4">Mother Information</h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Mother's Name</Label>
                                                        <Input
                                                            value={editingStudent.guardian.mother_name || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, mother_name: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Mother's Mobile</Label>
                                                        <Input
                                                            value={editingStudent.guardian.mother_mobile || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, mother_mobile: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div>
                                                <h3 className="font-semibold mb-4">Emergency Contact</h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Contact Name</Label>
                                                        <Input
                                                            value={editingStudent.guardian.emergency_contact_name || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, emergency_contact_name: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Contact Mobile</Label>
                                                        <Input
                                                            value={editingStudent.guardian.emergency_contact_mobile || ''}
                                                            onChange={(e) => setEditingStudent({
                                                                ...editingStudent,
                                                                guardian: {...editingStudent.guardian, emergency_contact_mobile: e.target.value}
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </TabsContent>

                                <TabsContent value="address" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Present Address</Label>
                                        <Textarea
                                            value={editingStudent.address_present || ''}
                                            onChange={(e) => setEditingStudent({...editingStudent, address_present: e.target.value})}
                                            rows={4}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Permanent Address</Label>
                                        <Textarea
                                            value={editingStudent.address_permanent || ''}
                                            onChange={(e) => setEditingStudent({...editingStudent, address_permanent: e.target.value})}
                                            rows={4}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingStudent({...editingStudent, address_permanent: editingStudent.address_present})}
                                    >
                                        Same as Present Address
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        )}
                    </ScrollArea>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button variant="hero" onClick={handleSaveEdit} disabled={uploadingPhoto}>
                            {uploadingPhoto ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedStudents.size} Students?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedStudents.size} selected students?
                            This will permanently remove all student records including attendance, marks, and fees.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                            Delete {selectedStudents.size} Students
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deleteTarget?.name_en}</strong>?
                            This will permanently remove all student records including attendance, marks, and fees.
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