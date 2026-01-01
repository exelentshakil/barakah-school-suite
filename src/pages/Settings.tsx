// FILE: src/pages/Settings.tsx - STREAMLINED WORLD CLASS SETTINGS
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    Settings as SettingsIcon,
    Loader2,
    Plus,
    Trash2,
    Edit,
    Save,
    DollarSign,
    Users,
    BookOpen,
    School,
    GraduationCap,
    MoreVertical,
    AlertCircle,
    CheckCircle2,
    Building2,
    Mail,
    Phone,
    Globe,
    Calendar,
    FileText,
    CreditCard
} from 'lucide-react';
import {cn} from "@/lib/utils.ts";

export default function Settings() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{type: string, id: string} | null>(null);

    // School Settings
    const [schoolSettings, setSchoolSettings] = useState<any>({
        name: '',
        name_bn: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        academic_year: '',
        session_year: ''
    });

    // Classes & Sections & Subjects
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedClassForSection, setSelectedClassForSection] = useState('');
    const [selectedClassForSubject, setSelectedClassForSubject] = useState('');

    // Fee Configuration
    const [feeHeads, setFeeHeads] = useState<any[]>([]);
    const [feePlans, setFeePlans] = useState<any[]>([]);
    const [feePlanDialogOpen, setFeePlanDialogOpen] = useState(false);
    const [feePlanClass, setFeePlanClass] = useState('');
    const [feePlanSection, setFeePlanSection] = useState('all');
    const [feePlanSections, setFeePlanSections] = useState<any[]>([]);
    const [selectedFeeHeadsForPlan, setSelectedFeeHeadsForPlan] = useState<Record<string, boolean>>({});
    const [feeAmounts, setFeeAmounts] = useState<Record<string, string>>({});

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('teacher');
    const [userClasses, setUserClasses] = useState<Record<string, boolean>>({});
    const [userSections, setUserSections] = useState<Record<string, Record<string, boolean>>>({});

    useEffect(() => {
        if (user?.role === 'admin') {
            loadAllData();
        }
    }, [user]);

    useEffect(() => {
        if (selectedClassForSection) loadSections(selectedClassForSection);
    }, [selectedClassForSection]);

    useEffect(() => {
        if (selectedClassForSubject) loadSubjects(selectedClassForSubject);
    }, [selectedClassForSubject]);

    useEffect(() => {
        if (feePlanClass) loadFeePlanSections();
    }, [feePlanClass]);

    // Load all sections when opening user dialog for teacher assignments
    useEffect(() => {
        if (userDialogOpen && classes.length > 0) {
            loadAllSections();
        }
    }, [userDialogOpen, classes]);

    const loadAllSections = async () => {
        const { data } = await supabase.from('sections').select('*').order('name');
        if (data) setSections(data);
    };

    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
            loadSchoolSettings(),
            loadClasses(),
            loadFeeHeads(),
            loadFeePlans(),
            loadUsers()
        ]);
        setLoading(false);
    };

    const loadSchoolSettings = async () => {
        const { data } = await supabase.from('school_settings').select('*').single();
        if (data) setSchoolSettings(data);
    };

    const loadFeePlanSections = async () => {
        const { data } = await supabase.from('sections').select('*').eq('class_id', feePlanClass).order('name');
        if (data) setFeePlanSections(data);
    };

    const loadFeeHeads = async () => {
        const { data } = await supabase.from('fee_heads').select('*').order('name');
        if (data) setFeeHeads(data);
    };

    const loadFeePlans = async () => {
        const { data } = await supabase
            .from('fee_plans')
            .select('*, classes(name), sections(name), fee_heads(name, type)')
            .order('class_id');
        if (data) setFeePlans(data);
    };

// ALSO ADD useEffect TO AUTO-RELOAD:
    useEffect(() => {
        loadUsers();
        loadClasses();
        loadSections();
        loadSubjects();
    }, []);

    // ADD THESE LOAD FUNCTIONS IF MISSING:
    const loadClasses = async () => {
        const { data } = await supabase
            .from('classes')
            .select('*')
            .order('display_order');
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .order('name');
        if (data) setSections(data);
    };

    const loadSubjects = async () => {
        const { data } = await supabase
            .from('subjects')
            .select('*')
            .order('name');
        if (data) setSubjects(data);
    };

    const handleSaveSchoolSettings = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('school_settings')
            .update(schoolSettings)
            .eq('id', schoolSettings.id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "✓ Saved successfully!" });
        }
        setSaving(false);
    };

    const handleAddClass = async (name: string, nameBn: string) => {
        const { error } = await supabase.from('classes').insert({
            name, name_bn: nameBn, display_order: classes.length
        });
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else { toast({ title: "✓ Class added!" }); loadClasses(); }
    };

    const handleAddSection = async (name: string) => {
        const { error } = await supabase.from('sections').insert({
            class_id: selectedClassForSection, name
        });
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else { toast({ title: "✓ Section added!" }); loadSections(selectedClassForSection); }
    };

    const handleAddSubject = async (name: string, nameBn: string, fullMarks: number, passMarks: number) => {
        const { error } = await supabase.from('subjects').insert({
            class_id: selectedClassForSubject, name, name_bn: nameBn, full_marks: fullMarks, pass_marks: passMarks
        });
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else { toast({ title: "✓ Subject added!" }); loadSubjects(selectedClassForSubject); }
    };

    const handleAddFeeHead = async (name: string, type: string) => {
        const { error } = await supabase.from('fee_heads').insert({ name, type, is_active: true });
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else { toast({ title: "✓ Fee head added!" }); loadFeeHeads(); }
    };

    const handleToggleFeeHead = async (id: string, isActive: boolean) => {
        await supabase.from('fee_heads').update({ is_active: !isActive }).eq('id', id);
        loadFeeHeads();
    };

    const handleCreateFeePlan = async () => {
        if (!feePlanClass) return toast({ title: "Select a class", variant: "destructive" });

        const selectedIds = Object.entries(selectedFeeHeadsForPlan).filter(([_, sel]) => sel).map(([id]) => id);
        if (selectedIds.length === 0) return toast({ title: "Select at least one fee head", variant: "destructive" });

        setSaving(true);
        const plans = selectedIds.map(feeHeadId => ({
            class_id: feePlanClass,
            section_id: feePlanSection === 'all' ? null : feePlanSection,
            fee_head_id: feeHeadId,
            amount: parseFloat(feeAmounts[feeHeadId] || '0')
        }));

        const { error } = await supabase.from('fee_plans').insert(plans);
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else {
            toast({ title: "✓ Fee plan created!" });
            setFeePlanDialogOpen(false);
            setFeePlanClass(''); setFeePlanSection('all'); setSelectedFeeHeadsForPlan({}); setFeeAmounts({});
            loadFeePlans();
        }
        setSaving(false);
    };

    const [userSubjects, setUserSubjects] = useState<Record<string, Record<string, boolean>>>({});

    const handleCreateUser = async () => {
        if (!newUserName || !newUserEmail || !newUserPassword || !newUserRole) {
            toast({ title: "Error", description: "All fields required", variant: "destructive" });
            return;
        }

        setSaving(true);

        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword
            });

            if (authError) throw authError;
            const userId = authData.user?.id;

            // Create profile
            await supabase.from('profiles').insert({
                user_id: userId,
                name: newUserName,
                email: newUserEmail
            });

            // Create role
            await supabase.from('user_roles').insert({
                user_id: userId,
                role: newUserRole
            });

            // Create teacher assignments (if teacher)
            if (newUserRole === 'teacher') {
                const assignments: any[] = [];

                // Loop through selected classes
                Object.keys(userClasses).forEach(classId => {
                    if (!userClasses[classId]) return;

                    const selectedSections = userSections[classId] || {};
                    const selectedSubjects = userSubjects[classId] || {};

                    // Get sections for this class (or null for all sections)
                    const sectionIds = Object.keys(selectedSections).filter(sid => selectedSections[sid]);
                    const subjectIds = Object.keys(selectedSubjects).filter(sid => selectedSubjects[sid]);

                    // If no sections selected, assign to all sections (null)
                    const sectionsToAssign = sectionIds.length > 0 ? sectionIds : [null];

                    // Create assignment for each section + subject combination
                    sectionsToAssign.forEach(sectionId => {
                        subjectIds.forEach(subjectId => {
                            assignments.push({
                                user_id: userId,
                                class_id: classId,
                                section_id: sectionId,
                                subject_id: subjectId
                            });
                        });
                    });
                });

                if (assignments.length > 0) {
                    await supabase.from('teacher_assignments').insert(assignments);
                }
            }

            toast({ title: "✓ Created", description: `${newUserRole} account created` });

            // Reset form
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('teacher');
            setUserClasses({});
            setUserSections({});
            setUserSubjects({});
            setUserDialogOpen(false);

            loadUsers();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // ADD THESE STATE & HANDLER FUNCTIONS:

    const [editingUser, setEditingUser] = useState<any>(null);



    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Delete ${user.name}? This action cannot be undone.`)) return;

        setSaving(true);
        try {
            const userId = user.user_id;

            // Delete assignments
            await supabase.from('teacher_assignments').delete().eq('user_id', userId);

            // Delete role
            await supabase.from('user_roles').delete().eq('user_id', userId);

            // Delete profile
            await supabase.from('profiles').delete().eq('user_id', userId);

            // Delete auth user (admin only)
            // Note: This requires admin privileges in Supabase

            toast({ title: "✓ Deleted", description: "User removed" });
            loadUsers();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

// PROPER SOLUTION: Store admin session, create user, restore admin session

    const handleSaveUser = async () => {
        if (!newUserName || !newUserEmail || !newUserRole) {
            toast({ title: "Error", description: "All fields required", variant: "destructive" });
            return;
        }

        if (!editingUser && !newUserPassword) {
            toast({ title: "Error", description: "Password required", variant: "destructive" });
            return;
        }

        setSaving(true);

        try {
            let userId = editingUser?.user_id;

            if (!editingUser) {
                // STORE ADMIN SESSION
                const { data: { session: adminSession } } = await supabase.auth.getSession();
                const adminAccessToken = adminSession?.access_token;
                const adminRefreshToken = adminSession?.refresh_token;

                if (!adminAccessToken || !adminRefreshToken) {
                    throw new Error('Admin session not found');
                }

                // Create new user (will auto-login as them)
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: newUserEmail,
                    password: newUserPassword
                });

                if (authError) throw authError;
                userId = authData.user?.id;

                if (!userId) throw new Error('Failed to create user');

                // Create profile
                await supabase.from('profiles').insert({
                    user_id: userId,
                    name: newUserName,
                    email: newUserEmail
                });

                // Create role
                await supabase.from('user_roles').insert({
                    user_id: userId,
                    role: newUserRole
                });

                // Create assignments (if teacher)
                if (newUserRole === 'teacher') {
                    const assignments: any[] = [];

                    Object.keys(userClasses).forEach(classId => {
                        if (!userClasses[classId]) return;

                        const selectedSections = userSections[classId] || {};
                        const selectedSubjects = userSubjects[classId] || {};

                        const sectionIds = Object.keys(selectedSections).filter(sid => selectedSections[sid]);
                        const subjectIds = Object.keys(selectedSubjects).filter(sid => selectedSubjects[sid]);

                        const sectionsToAssign = sectionIds.length > 0 ? sectionIds : [null];

                        sectionsToAssign.forEach(sectionId => {
                            subjectIds.forEach(subjectId => {
                                assignments.push({
                                    user_id: userId,
                                    class_id: classId,
                                    section_id: sectionId,
                                    subject_id: subjectId
                                });
                            });
                        });
                    });

                    if (assignments.length > 0) {
                        await supabase.from('teacher_assignments').insert(assignments);
                    }
                }

                // RESTORE ADMIN SESSION
                await supabase.auth.setSession({
                    access_token: adminAccessToken,
                    refresh_token: adminRefreshToken
                });

                toast({
                    title: "✓ User Created",
                    description: `${newUserRole} account created successfully`
                });

                setEditingUser(null);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('teacher');
                setUserClasses({});
                setUserSections({});
                setUserSubjects({});
                setUserDialogOpen(false);

                loadUsers();

            } else {
                // UPDATE EXISTING USER
                await supabase.from('profiles').update({
                    name: newUserName
                }).eq('user_id', userId);

                // Update role
                await supabase.from('user_roles').upsert({
                    user_id: userId,
                    role: newUserRole
                }, { onConflict: 'user_id' });

                // Delete old assignments
                await supabase.from('teacher_assignments').delete().eq('user_id', userId);

                // Create new assignments (if teacher)
                if (newUserRole === 'teacher') {
                    const assignments: any[] = [];

                    Object.keys(userClasses).forEach(classId => {
                        if (!userClasses[classId]) return;

                        const selectedSections = userSections[classId] || {};
                        const selectedSubjects = userSubjects[classId] || {};

                        const sectionIds = Object.keys(selectedSections).filter(sid => selectedSections[sid]);
                        const subjectIds = Object.keys(selectedSubjects).filter(sid => selectedSubjects[sid]);

                        const sectionsToAssign = sectionIds.length > 0 ? sectionIds : [null];

                        sectionsToAssign.forEach(sectionId => {
                            subjectIds.forEach(subjectId => {
                                assignments.push({
                                    user_id: userId,
                                    class_id: classId,
                                    section_id: sectionId,
                                    subject_id: subjectId
                                });
                            });
                        });
                    });

                    if (assignments.length > 0) {
                        await supabase.from('teacher_assignments').insert(assignments);
                    }
                }

                toast({ title: "✓ Updated", description: "User updated successfully" });

                setEditingUser(null);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('teacher');
                setUserClasses({});
                setUserSections({});
                setUserSubjects({});
                setUserDialogOpen(false);

                loadUsers();
            }

        } catch (error: any) {
            console.error('User save error:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

// 2. FIX handleEditUser - Properly load assignments
    const handleEditUser = (user: any) => {

        setEditingUser(user);
        setNewUserName(user.name);
        setNewUserEmail(user.email);
        setNewUserPassword('');
        setNewUserRole(user.user_roles?.[0]?.role || 'teacher');

        // Reset first
        setUserClasses({});
        setUserSections({});
        setUserSubjects({});

        // Load existing assignments
        if (user.user_roles?.[0]?.role === 'teacher' && user.teacher_assignments?.length > 0) {
            const classes: Record<string, boolean> = {};
            const sections: Record<string, Record<string, boolean>> = {};
            const subjects: Record<string, Record<string, boolean>> = {};


            user.teacher_assignments.forEach((a: any) => {

                // Mark class as selected
                classes[a.class_id] = true;

                // Mark section as selected (if exists)
                if (a.section_id) {
                    if (!sections[a.class_id]) sections[a.class_id] = {};
                    sections[a.class_id][a.section_id] = true;
                }

                // Mark subject as selected
                if (a.subject_id) {
                    if (!subjects[a.class_id]) subjects[a.class_id] = {};
                    subjects[a.class_id][a.subject_id] = true;
                }
            });


            setUserClasses(classes);
            setUserSections(sections);
            setUserSubjects(subjects);
        }

        setUserDialogOpen(true);
    };

// 3. FIX loadUsers - Include all necessary relations
    const loadUsers = async () => {
        setLoading(true);

        try {
            // Get all profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            if (!profiles || profiles.length === 0) {
                setUsers([]);
                setLoading(false);
                return;
            }

            const userIds = profiles.map(p => p.user_id);

            // Get roles
            const { data: roles } = await supabase
                .from('user_roles')
                .select('*')
                .in('user_id', userIds);

            // Get teacher assignments with ALL relations
            const { data: assignments } = await supabase
                .from('teacher_assignments')
                .select(`
                id,
                user_id,
                class_id,
                section_id,
                subject_id,
                classes(id, name),
                sections(id, name),
                subjects(id, name)
            `)
                .in('user_id', userIds);

            // Combine data
            const combinedUsers = profiles.map(profile => {
                const userRoles = roles?.filter(r => r.user_id === profile.user_id) || [];
                const userAssignments = assignments?.filter(a => a.user_id === profile.user_id) || [];

                return {
                    ...profile,
                    user_roles: userRoles,
                    teacher_assignments: userAssignments
                };
            });

            setUsers(combinedUsers);

        } catch (error: any) {
            console.error('Error loading users:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDialogClose = (open: boolean) => {
        setUserDialogOpen(open);
        if (!open) {
            // Reset form when closing
            setEditingUser(null);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('teacher');
            setUserClasses({});
            setUserSections({});
            setUserSubjects({});
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase.from(deleteTarget.type).delete().eq('id', deleteTarget.id);
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else {
            toast({ title: "✓ Deleted!" });
            if (deleteTarget.type === 'classes') loadClasses();
            if (deleteTarget.type === 'sections') loadSections(selectedClassForSection);
            if (deleteTarget.type === 'subjects') loadSubjects(selectedClassForSubject);
            if (deleteTarget.type === 'fee_heads') loadFeeHeads();
            if (deleteTarget.type === 'fee_plans') loadFeePlans();
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    if (loading) {
        return <MainLayout><div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
    }

    if (user?.role !== 'admin') {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-96 text-center">
                    <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">Only administrators can access settings.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground mt-1">Manage your school configuration</p>
                    </div>
                    <Badge variant="outline" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Active</Badge>
                </div>

                <Tabs defaultValue="school" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="school" className="gap-2"><Building2 className="w-4 h-4" />School</TabsTrigger>
                        <TabsTrigger value="academic" className="gap-2"><GraduationCap className="w-4 h-4" />Academic</TabsTrigger>
                        <TabsTrigger value="fees" className="gap-2"><DollarSign className="w-4 h-4" />Fees</TabsTrigger>
                        <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
                    </TabsList>

                    {/* School Info */}
                    <TabsContent value="school">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><School className="w-5 h-5" />School Information</CardTitle>
                                <CardDescription>Update your school's basic information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Building2 className="w-4 h-4" />School Name (English) *</Label>
                                        <Input value={schoolSettings.name} onChange={(e) => setSchoolSettings({...schoolSettings, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>School Name (Bengali)</Label>
                                        <Input value={schoolSettings.name_bn} onChange={(e) => setSchoolSettings({...schoolSettings, name_bn: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><FileText className="w-4 h-4" />Code *</Label>
                                        <Input value={schoolSettings.code} onChange={(e) => setSchoolSettings({...schoolSettings, code: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Phone className="w-4 h-4" />Phone *</Label>
                                        <Input value={schoolSettings.phone} onChange={(e) => setSchoolSettings({...schoolSettings, phone: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</Label>
                                        <Input type="email" value={schoolSettings.email} onChange={(e) => setSchoolSettings({...schoolSettings, email: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Globe className="w-4 h-4" />Website</Label>
                                        <Input value={schoolSettings.website} onChange={(e) => setSchoolSettings({...schoolSettings, website: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" />Academic Year *</Label>
                                        <Input value={schoolSettings.academic_year} onChange={(e) => setSchoolSettings({...schoolSettings, academic_year: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Session Year *</Label>
                                        <Input value={schoolSettings.session_year} onChange={(e) => setSchoolSettings({...schoolSettings, session_year: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Address *</Label>
                                    <Textarea value={schoolSettings.address} onChange={(e) => setSchoolSettings({...schoolSettings, address: e.target.value})} rows={3} />
                                </div>
                                <Separator />
                                <Button variant="hero" onClick={handleSaveSchoolSettings} disabled={saving} size="lg">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Academic */}
                    <TabsContent value="academic">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Classes</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <QuickAdd onAdd={(name, nameBn) => handleAddClass(name, nameBn)} placeholder1="Class name" placeholder2="Bengali" />
                                    <ScrollArea className="h-96">
                                        <div className="space-y-2">
                                            {classes.map(cls => (
                                                <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                                    <div><div className="font-medium">{cls.name}</div>{cls.name_bn && <div className="text-sm text-muted-foreground">{cls.name_bn}</div>}</div>
                                                    <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ type: 'classes', id: cls.id }); setDeleteDialogOpen(true); }}>
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" />Sections</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <SearchableSelect options={classes.map(c => ({ value: c.id, label: c.name }))} value={selectedClassForSection} onValueChange={setSelectedClassForSection} placeholder="Select class..." />
                                    <QuickAdd onAdd={(name) => handleAddSection(name)} placeholder1="Section name" disabled={!selectedClassForSection} single />
                                    <ScrollArea className="h-80">
                                        <div className="space-y-2">
                                            {sections.map(sec => (
                                                <div key={sec.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                                    <div className="font-medium">{sec.name}</div>
                                                    <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ type: 'sections', id: sec.id }); setDeleteDialogOpen(true); }}>
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2">
                                <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <SearchableSelect options={classes.map(c => ({ value: c.id, label: c.name }))} value={selectedClassForSubject} onValueChange={setSelectedClassForSubject} placeholder="Select class..." />
                                    <SubjectAdd onAdd={(name, nameBn, full, pass) => handleAddSubject(name, nameBn, full, pass)} disabled={!selectedClassForSubject} />
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {subjects.map(sub => (
                                            <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                                <div><div className="font-medium">{sub.name}</div><div className="text-xs text-muted-foreground">Full: {sub.full_marks} | Pass: {sub.pass_marks}</div></div>
                                                <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ type: 'subjects', id: sub.id }); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Fees */}
                    <TabsContent value="fees">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" />Fee Heads</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FeeHeadAdd onAdd={(name, type) => handleAddFeeHead(name, type)} />
                                    <ScrollArea className="h-96">
                                        <div className="space-y-2">
                                            {feeHeads.map(head => (
                                                <div key={head.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                                    <div className="flex-1"><div className="font-medium">{head.name}</div><div className="text-sm text-muted-foreground">{head.type}</div></div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch checked={head.is_active} onCheckedChange={() => handleToggleFeeHead(head.id, head.is_active)} />
                                                        <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ type: 'fee_heads', id: head.id }); setDeleteDialogOpen(true); }}>
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Fee Plans</CardTitle>
                                    <Dialog open={feePlanDialogOpen} onOpenChange={setFeePlanDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />New Plan</Button></DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader><DialogTitle>Create Fee Plan</DialogTitle><DialogDescription>Set fees for class/section</DialogDescription></DialogHeader>
                                            <div className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2"><Label>Class *</Label><SearchableSelect options={classes.map(c => ({ value: c.id, label: c.name }))} value={feePlanClass} onValueChange={setFeePlanClass} placeholder="Select..." /></div>
                                                    <div className="space-y-2"><Label>Section</Label><SearchableSelect options={[{ value: 'all', label: 'All Sections' }, ...feePlanSections.map(s => ({ value: s.id, label: s.name }))]} value={feePlanSection} onValueChange={setFeePlanSection} placeholder="All..." /></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fee Heads *</Label>
                                                    <ScrollArea className="h-64 border rounded-lg p-4">
                                                        <div className="space-y-3">
                                                            {feeHeads.filter(h => h.is_active).map(head => (
                                                                <div key={head.id} className="flex items-center gap-4">
                                                                    <Checkbox checked={selectedFeeHeadsForPlan[head.id] || false} onCheckedChange={(c) => setSelectedFeeHeadsForPlan(p => ({ ...p, [head.id]: c as boolean }))} />
                                                                    <div className="flex-1"><div className="font-medium">{head.name}</div><div className="text-xs text-muted-foreground">{head.type}</div></div>
                                                                    <Input type="number" step="0.01" placeholder="Amount" className="w-32" value={feeAmounts[head.id] || ''} onChange={(e) => setFeeAmounts(p => ({ ...p, [head.id]: e.target.value }))} disabled={!selectedFeeHeadsForPlan[head.id]} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                                <Button variant="hero" className="w-full" onClick={handleCreateFeePlan} disabled={saving}>
                                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : 'Create Fee Plan'}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        <div className="space-y-2">
                                            {feePlans.map(plan => (
                                                <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                                    <div><div className="font-medium">{plan.classes?.name}{plan.sections && ` - ${plan.sections.name}`}</div><div className="text-sm text-muted-foreground">{plan.fee_heads?.name}: ৳{parseFloat(plan.amount).toFixed(2)}</div></div>
                                                    <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ type: 'fee_plans', id: plan.id }); setDeleteDialogOpen(true); }}>
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Users Tab - WITH DELETE & EDIT */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5" />Users
                                    </CardTitle>
                                    <CardDescription>Manage staff accounts</CardDescription>
                                </div>
                                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button><Plus className="w-4 h-4 mr-2" />Add User</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
                                            <DialogDescription>{editingUser ? 'Update user details' : 'Add new staff member'}</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Name *</Label>
                                                    <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Email *</Label>
                                                    <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} disabled={!!editingUser} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Password {editingUser && '(leave blank to keep current)'}</Label>
                                                    <Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder={editingUser ? "Leave blank to keep current" : "Enter password"} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Role *</Label>
                                                    <SearchableSelect
                                                        options={[
                                                            { value: 'teacher', label: '👨‍🏫 Teacher' },
                                                            { value: 'accountant', label: '💰 Accountant' },
                                                            { value: 'admin', label: '👑 Admin' }
                                                        ]}
                                                        value={newUserRole}
                                                        onValueChange={setNewUserRole}
                                                        placeholder="Select role..."
                                                    />
                                                </div>
                                            </div>

                                            {newUserRole === 'teacher' && (
                                                <div className="space-y-3">
                                                    <Label className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        Teaching Assignments (Class → Section → Subjects)
                                                    </Label>
                                                    <ScrollArea className="h-96 border rounded-lg p-4">
                                                        <div className="space-y-4">
                                                            {classes.map(cls => {
                                                                const classSections = sections.filter(s => s.class_id === cls.id);
                                                                const classSubjects = subjects.filter(s => s.class_id === cls.id);

                                                                return (
                                                                    <div key={cls.id} className="border rounded-lg p-3 space-y-3">
                                                                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                                                            <Checkbox
                                                                                checked={userClasses[cls.id] || false}
                                                                                onCheckedChange={() => setUserClasses(p => ({ ...p, [cls.id]: !p[cls.id] }))}
                                                                            />
                                                                            <School className="w-4 h-4 text-blue-600" />
                                                                            <span className="font-semibold">{cls.name}</span>
                                                                        </div>

                                                                        {userClasses[cls.id] && (
                                                                            <div className="ml-6 space-y-3">
                                                                                {classSections.length > 0 ? (
                                                                                    <div className="space-y-2">
                                                                                        <div className="text-xs font-semibold text-muted-foreground">SECTIONS:</div>
                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            {classSections.map(sec => (
                                                                                                <div key={sec.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                                                                                                    <Checkbox
                                                                                                        checked={userSections[cls.id]?.[sec.id] || false}
                                                                                                        onCheckedChange={() => setUserSections(p => ({
                                                                                                            ...p,
                                                                                                            [cls.id]: { ...(p[cls.id] || {}), [sec.id]: !(p[cls.id]?.[sec.id]) }
                                                                                                        }))}
                                                                                                    />
                                                                                                    <span className="text-sm font-medium">{sec.name}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-xs text-muted-foreground italic">No sections</div>
                                                                                )}

                                                                                {classSubjects.length > 0 ? (
                                                                                    <div className="space-y-2">
                                                                                        <div className="text-xs font-semibold text-muted-foreground">SUBJECTS:</div>
                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            {classSubjects.map(subj => (
                                                                                                <div key={subj.id} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                                                                                    <Checkbox
                                                                                                        checked={userSubjects[cls.id]?.[subj.id] || false}
                                                                                                        onCheckedChange={() => setUserSubjects(p => ({
                                                                                                            ...p,
                                                                                                            [cls.id]: { ...(p[cls.id] || {}), [subj.id]: !(p[cls.id]?.[subj.id]) }
                                                                                                        }))}
                                                                                                    />
                                                                                                    <BookOpen className="w-3 h-3 text-green-600" />
                                                                                                    <span className="text-sm">{subj.name}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-xs text-muted-foreground italic">No subjects</div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </ScrollArea>
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                                        <div className="font-semibold text-blue-900 mb-1">💡 How it works:</div>
                                                        <ul className="text-blue-700 space-y-1 text-xs">
                                                            <li>• Select class first, then choose sections (optional)</li>
                                                            <li>• Select subjects this teacher will teach</li>
                                                            <li>• Teacher can mark attendance for all selected classes</li>
                                                            <li>• Teacher can enter marks only for assigned subjects</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            <Button variant="hero" className="w-full" onClick={handleSaveUser} disabled={saving}>
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        {editingUser ? 'Updating...' : 'Creating...'}
                                                    </>
                                                ) : (
                                                    editingUser ? 'Update User' : 'Create User'
                                                )}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Assignments</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-medium">{u.name}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={cn(
                                                            u.user_roles?.[0]?.role === 'admin' && "bg-purple-600",
                                                            u.user_roles?.[0]?.role === 'teacher' && "bg-blue-600",
                                                            u.user_roles?.[0]?.role === 'accountant' && "bg-green-600"
                                                        )}
                                                    >
                                                        {u.user_roles?.[0]?.role || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {u.teacher_assignments?.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {u.teacher_assignments.slice(0, 3).map((a: any, i: number) => (
                                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                                    <Badge variant="outline" className="font-normal">
                                                                        {a.classes?.name}
                                                                        {a.sections?.name && ` - ${a.sections.name}`}
                                                                    </Badge>
                                                                    <Badge variant="secondary" className="font-normal">
                                                                        {a.subjects?.name}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                            {u.teacher_assignments.length > 3 && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    +{u.teacher_assignments.length - 3} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditUser(u)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteUser(u)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this item?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the item and all related data.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
}

// Helper Components
function QuickAdd({ onAdd, placeholder1, placeholder2, disabled, single }: any) {
    const [val1, setVal1] = useState('');
    const [val2, setVal2] = useState('');
    return (
        <div className="flex gap-2">
            <Input placeholder={placeholder1} value={val1} onChange={(e) => setVal1(e.target.value)} disabled={disabled} />
            {!single && <Input placeholder={placeholder2} value={val2} onChange={(e) => setVal2(e.target.value)} disabled={disabled} className="w-32" />}
            <Button onClick={() => { onAdd(val1, val2); setVal1(''); setVal2(''); }} disabled={disabled || !val1} size="icon"><Plus className="w-4 h-4" /></Button>
        </div>
    );
}

function SubjectAdd({ onAdd, disabled }: any) {
    const [name, setName] = useState('');
    const [nameBn, setNameBn] = useState('');
    const [full, setFull] = useState('100');
    const [pass, setPass] = useState('33');
    return (
        <div className="grid gap-4 md:grid-cols-5">
            <Input placeholder="Subject" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} className="md:col-span-2" />
            <Input placeholder="Bengali" value={nameBn} onChange={(e) => setNameBn(e.target.value)} disabled={disabled} />
            <Input type="number" placeholder="Full" value={full} onChange={(e) => setFull(e.target.value)} disabled={disabled} />
            <Input type="number" placeholder="Pass" value={pass} onChange={(e) => setPass(e.target.value)} disabled={disabled} />
            <Button onClick={() => { onAdd(name, nameBn, parseInt(full), parseInt(pass)); setName(''); setNameBn(''); setFull('100'); setPass('33'); }} disabled={disabled || !name} className="md:col-span-5"><Plus className="w-4 h-4 mr-2" />Add Subject</Button>
        </div>
    );
}

function FeeHeadAdd({ onAdd }: any) {
    const [name, setName] = useState('');
    const [type, setType] = useState('monthly');
    return (
        <div className="flex gap-2">
            <Input placeholder="Fee head name" value={name} onChange={(e) => setName(e.target.value)} />
            <SearchableSelect options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }, { value: 'one-time', label: 'One-time' }]} value={type} onValueChange={setType} placeholder="Type" />
            <Button onClick={() => { onAdd(name, type); setName(''); }} disabled={!name} size="icon"><Plus className="w-4 h-4" /></Button>
        </div>
    );
}