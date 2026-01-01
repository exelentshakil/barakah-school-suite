// FILE: src/pages/Admission.tsx - WORLD CLASS ADMISSION PAGE
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    UserPlus,
    Loader2,
    Save,
    Upload,
    FileText,
    User,
    Users,
    Home,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Admission() {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [feePlans, setFeePlans] = useState<any[]>([]);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Photo upload
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useState<HTMLVideoElement | null>(null);
    const streamRef = useState<MediaStream | null>(null);
    const [uploading, setUploading] = useState(false);

    // Student Info
    const [studentData, setStudentData] = useState({
        student_id: `STD-${Date.now()}`,
        name_en: '',
        name_bn: '',
        class_id: '',
        section_id: '',
        roll: '',
        gender: 'male',
        dob: '',
        blood_group: '',
        religion: 'Islam',
        address_present: '',
        address_permanent: '',
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active',
        photo_url: ''
    });

    // Guardian Info
    const [guardianData, setGuardianData] = useState({
        father_name: '',
        father_nid: '',
        father_mobile: '',
        father_occupation: '',
        mother_name: '',
        mother_nid: '',
        mother_mobile: '',
        mother_occupation: '',
        emergency_contact_name: '',
        emergency_contact_mobile: ''
    });

    // Invoice options
    const [createInvoice, setCreateInvoice] = useState(true);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (studentData.class_id) {
            loadSections();
            loadFeePlans();
        } else {
            setSections([]);
            setFeePlans([]);
            setStudentData(prev => ({ ...prev, section_id: '' }));
        }
    }, [studentData.class_id]);

    useEffect(() => {
        if (studentData.section_id) {
            loadFeePlans();
        }
    }, [studentData.section_id]);

    const loadClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('display_order');
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', studentData.class_id)
            .order('name');
        if (data) setSections(data);
    };

    const loadFeePlans = async () => {
        let query = supabase
            .from('fee_plans')
            .select('*, fee_heads(name, type)')
            .eq('class_id', studentData.class_id);

        if (studentData.section_id) {
            query = query.or(`section_id.eq.${studentData.section_id},section_id.is.null`);
        } else {
            query = query.is('section_id', null);
        }

        const { data } = await query;
        if (data) setFeePlans(data);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            streamRef[1](stream);
            if (videoRef[0]) {
                videoRef[0].srcObject = stream;
            }
            setShowCamera(true);
        } catch (error) {
            toast({
                title: "Camera Error",
                description: "Unable to access camera. Please check permissions.",
                variant: "destructive"
            });
        }
    };

    const stopCamera = () => {
        if (streamRef[0]) {
            streamRef[0].getTracks().forEach(track => track.stop());
            streamRef[1](null);
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (!videoRef[0]) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef[0].videoWidth;
        canvas.height = videoRef[0].videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(videoRef[0], 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setPhotoFile(file);
                    setPhotoPreview(canvas.toDataURL('image/jpeg'));
                    stopCamera();
                    toast({ title: "✓ Photo captured successfully!" });
                }
            }, 'image/jpeg', 0.95);
        }
    };

    const uploadPhoto = async () => {
        if (!photoFile) return null;

        setUploading(true);
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${studentData.student_id}-${Date.now()}.${fileExt}`;
        const filePath = `students/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(filePath, photoFile);

        if (uploadError) {
            toast({ title: "Photo upload failed", variant: "destructive" });
            setUploading(false);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath);

        setUploading(false);
        return urlData.publicUrl;
    };

    const handleSubmit = async () => {
        if (!studentData.name_en || !studentData.class_id) {
            toast({ title: "Please fill required fields", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            // Upload photo if exists
            let photoUrl = studentData.photo_url;
            if (photoFile) {
                const uploadedUrl = await uploadPhoto();
                if (uploadedUrl) photoUrl = uploadedUrl;
            }

            // Insert student
            const { data: student, error: studentError } = await supabase
                .from('students')
                .insert({ ...studentData, photo_url: photoUrl })
                .select()
                .single();

            if (studentError) throw studentError;

            // Insert guardian
            const { error: guardianError } = await supabase
                .from('guardians')
                .insert({
                    student_id: student.id,
                    father_name: guardianData.father_name,
                    father_nid: guardianData.father_nid,
                    father_mobile: guardianData.father_mobile,
                    father_occupation: guardianData.father_occupation,
                    mother_name: guardianData.mother_name,
                    mother_mobile: guardianData.mother_mobile,
                    emergency_contact_name: guardianData.emergency_contact_name,
                    emergency_contact_mobile: guardianData.emergency_contact_mobile
                });

            if (guardianError) throw guardianError;

            // Create invoice if enabled
            if (createInvoice && feePlans.length > 0) {
                const invoiceTotal = feePlans.reduce((sum, p) => sum + parseFloat(p.amount), 0);

                const { data: invoice, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        invoice_no: `INV-${Date.now()}`,
                        student_id: student.id,
                        class_id: studentData.class_id,
                        section_id: studentData.section_id || null,
                        invoice_date: new Date().toISOString().split('T')[0],
                        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        subtotal: invoiceTotal,
                        total_amount: invoiceTotal,
                        paid_amount: 0,
                        status: 'pending'
                    })
                    .select()
                    .single();

                if (!invoiceError && invoice) {
                    const items = feePlans.map(p => ({
                        invoice_id: invoice.id,
                        fee_head_id: p.fee_head_id,
                        fee_head_name: p.fee_heads?.name,
                        amount: parseFloat(p.amount)
                    }));
                    await supabase.from('invoice_items').insert(items);
                }
            }

            toast({ title: "✓ Student admitted successfully!" });
            navigate('/students');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const totalFees = feePlans.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">New Admission</h1>
                            <p className="text-muted-foreground mt-1">Add a new student to the system</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-sm">
                        ID: {studentData.student_id}
                    </Badge>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Admission Form</CardTitle>
                                <CardDescription>Fill in student and guardian information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="student" className="space-y-6">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="student" className="gap-2">
                                            <User className="w-4 h-4" />
                                            Student
                                        </TabsTrigger>
                                        <TabsTrigger value="guardian" className="gap-2">
                                            <Users className="w-4 h-4" />
                                            Guardian
                                        </TabsTrigger>
                                        <TabsTrigger value="address" className="gap-2">
                                            <Home className="w-4 h-4" />
                                            Address
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Student Info Tab */}
                                    <TabsContent value="student" className="space-y-4">
                                        {/* Photo Upload */}
                                        <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center bg-background overflow-hidden">
                                                    {photoPreview ? (
                                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera className="w-8 h-8 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    id="photo-upload"
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
                                                        onClick={() => document.getElementById('photo-upload')?.click()}
                                                    >
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Upload
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={startCamera}
                                                    >
                                                        <Camera className="w-4 h-4 mr-2" />
                                                        Camera
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Camera Modal */}
                                        {showCamera && (
                                            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                                                <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-lg font-semibold">Capture Photo</h3>
                                                        <Button variant="ghost" size="sm" onClick={stopCamera}>✕</Button>
                                                    </div>
                                                    <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                                                        <video
                                                            ref={(el) => {
                                                                videoRef[1](el);
                                                                if (el && streamRef[0]) {
                                                                    el.srcObject = streamRef[0];
                                                                    el.play();
                                                                }
                                                            }}
                                                            autoPlay
                                                            playsInline
                                                            className="w-full h-auto"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="outline" onClick={stopCamera}>
                                                            Cancel
                                                        </Button>
                                                        <Button onClick={capturePhoto} variant="default">
                                                            <Camera className="w-4 h-4 mr-2" />
                                                            Capture
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Name (English) *</Label>
                                                <Input
                                                    value={studentData.name_en}
                                                    onChange={(e) => setStudentData({...studentData, name_en: e.target.value})}
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Name (Bengali)</Label>
                                                <Input
                                                    value={studentData.name_bn}
                                                    onChange={(e) => setStudentData({...studentData, name_bn: e.target.value})}
                                                    placeholder="জন ডো"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Class *</Label>
                                                <SearchableSelect
                                                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                                                    value={studentData.class_id}
                                                    onValueChange={(val) => setStudentData({...studentData, class_id: val, section_id: ''})}
                                                    placeholder="Select class..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Section</Label>
                                                <SearchableSelect
                                                    options={sections.map(s => ({ value: s.id, label: s.name }))}
                                                    value={studentData.section_id}
                                                    onValueChange={(val) => setStudentData({...studentData, section_id: val})}
                                                    placeholder="Select section..."
                                                    disabled={!studentData.class_id || sections.length === 0}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Roll</Label>
                                                <Input
                                                    type="number"
                                                    value={studentData.roll}
                                                    onChange={(e) => setStudentData({...studentData, roll: e.target.value})}
                                                    placeholder="1"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Gender *</Label>
                                                <SearchableSelect
                                                    options={[
                                                        { value: 'male', label: 'Male' },
                                                        { value: 'female', label: 'Female' }
                                                    ]}
                                                    value={studentData.gender}
                                                    onValueChange={(val) => setStudentData({...studentData, gender: val})}
                                                    placeholder="Select..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date of Birth</Label>
                                                <Input
                                                    type="date"
                                                    value={studentData.dob}
                                                    onChange={(e) => setStudentData({...studentData, dob: e.target.value})}
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
                                                    value={studentData.blood_group}
                                                    onValueChange={(val) => setStudentData({...studentData, blood_group: val})}
                                                    placeholder="Select..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Religion</Label>
                                                <Input
                                                    value={studentData.religion}
                                                    onChange={(e) => setStudentData({...studentData, religion: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Admission Date *</Label>
                                                <Input
                                                    type="date"
                                                    value={studentData.admission_date}
                                                    onChange={(e) => setStudentData({...studentData, admission_date: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Guardian Info Tab */}
                                    <TabsContent value="guardian" className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold mb-4">Father Information</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Father's Name *</Label>
                                                    <Input
                                                        value={guardianData.father_name}
                                                        onChange={(e) => setGuardianData({...guardianData, father_name: e.target.value})}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Father's NID</Label>
                                                    <Input
                                                        value={guardianData.father_nid}
                                                        onChange={(e) => setGuardianData({...guardianData, father_nid: e.target.value})}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Father's Mobile *</Label>
                                                    <Input
                                                        value={guardianData.father_mobile}
                                                        onChange={(e) => setGuardianData({...guardianData, father_mobile: e.target.value})}
                                                        placeholder="+880 1712345678"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Occupation</Label>
                                                    <Input
                                                        value={guardianData.father_occupation}
                                                        onChange={(e) => setGuardianData({...guardianData, father_occupation: e.target.value})}
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
                                                        value={guardianData.mother_name}
                                                        onChange={(e) => setGuardianData({...guardianData, mother_name: e.target.value})}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Mother's NID</Label>
                                                    <Input
                                                        value={guardianData.mother_nid}
                                                        onChange={(e) => setGuardianData({...guardianData, mother_nid: e.target.value})}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Mother's Mobile</Label>
                                                    <Input
                                                        value={guardianData.mother_mobile}
                                                        onChange={(e) => setGuardianData({...guardianData, mother_mobile: e.target.value})}
                                                        placeholder="+880 1712345678"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Occupation</Label>
                                                    <Input
                                                        value={guardianData.mother_occupation}
                                                        onChange={(e) => setGuardianData({...guardianData, mother_occupation: e.target.value})}
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
                                                        value={guardianData.emergency_contact_name}
                                                        onChange={(e) => setGuardianData({...guardianData, emergency_contact_name: e.target.value})}
                                                        placeholder="Emergency contact person"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Contact Mobile</Label>
                                                    <Input
                                                        value={guardianData.emergency_contact_mobile}
                                                        onChange={(e) => setGuardianData({...guardianData, emergency_contact_mobile: e.target.value})}
                                                        placeholder="+880 1712345678"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Address Tab */}
                                    <TabsContent value="address" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Present Address *</Label>
                                            <Textarea
                                                value={studentData.address_present}
                                                onChange={(e) => setStudentData({...studentData, address_present: e.target.value})}
                                                rows={4}
                                                placeholder="Enter complete present address"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Permanent Address</Label>
                                            <Textarea
                                                value={studentData.address_permanent}
                                                onChange={(e) => setStudentData({...studentData, address_permanent: e.target.value})}
                                                rows={4}
                                                placeholder="Enter permanent address (if different)"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStudentData({...studentData, address_permanent: studentData.address_present})}
                                        >
                                            Same as Present Address
                                        </Button>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="space-y-6">
                        {/* Fee Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Fee Structure
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {feePlans.length > 0 ? (
                                    <>
                                        <ScrollArea className="h-48">
                                            <div className="space-y-2">
                                                {feePlans.map(plan => (
                                                    <div key={plan.id} className="flex items-center justify-between p-2 border rounded">
                                                        <div>
                                                            <div className="font-medium text-sm">{plan.fee_heads?.name}</div>
                                                            <div className="text-xs text-muted-foreground">{plan.fee_heads?.type}</div>
                                                        </div>
                                                        <div className="font-semibold">৳{parseFloat(plan.amount).toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                        <Separator />
                                        <div className="flex items-center justify-between font-bold text-lg">
                                            <span>Total</span>
                                            <span className="text-primary">৳{totalFees.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <Label className="cursor-pointer">Create Invoice</Label>
                                            <Switch checked={createInvoice} onCheckedChange={setCreateInvoice} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No fee plans configured</p>
                                        <p className="text-xs">Select class and section first</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardContent className="pt-6 space-y-3">
                                <Button
                                    variant="hero"
                                    className="w-full"
                                    size="lg"
                                    onClick={() => setConfirmDialogOpen(true)}
                                    disabled={loading || uploading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Admitting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Admit Student
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => navigate('/students')}>
                                    Cancel
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Quick Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Required Fields</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    {studentData.name_en ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                    <span>Student Name</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {studentData.class_id ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                    <span>Class</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {guardianData.father_name ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                    <span>Father's Name</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {guardianData.father_mobile ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                    <span>Father's Mobile</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {studentData.address_present ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                    <span>Present Address</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Admission</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to admit <strong>{studentData.name_en}</strong> to{' '}
                            <strong>{classes.find(c => c.id === studentData.class_id)?.name}</strong>
                            {studentData.section_id && ` - ${sections.find(s => s.id === studentData.section_id)?.name}`}?
                            {createInvoice && feePlans.length > 0 && (
                                <span className="block mt-2">
                  An invoice of <strong>৳{totalFees.toFixed(2)}</strong> will be created.
                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit}>
                            Confirm Admission
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
}