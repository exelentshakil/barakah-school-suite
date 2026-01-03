// FILE: src/pages/SMS.tsx - ENHANCED TEMPLATES FOR SALES
import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendBulkSMS, getSMSBalance, getSMSInfo } from '@/lib/sms';
import { initiateSMSRecharge } from '@/lib/sms-payment';
import { cn } from '@/lib/utils';
import {
    MessageSquare, Send, Loader2, Users, CreditCard, Plus, Sparkles, TrendingUp,
    Zap, History, CheckCircle, XCircle, DollarSign, Gem, Star, Flame, Info,
    GraduationCap, Megaphone
} from 'lucide-react';

// --- NEW TEMPLATES ADDED HERE ---
const SMS_TEMPLATES = {
    attendance: [
        { id: 'absence_alert', name: 'Absence Alert', message: 'প্রিয় {parent_name}, {student_name} আজ ({date}) অনুপস্থিত। Class: {class}, Roll: {roll}। - {school_name}' },
        { id: 'present_confirm', name: 'Present Info', message: 'প্রিয় {parent_name}, {student_name} আজ স্কুলে উপস্থিত হয়েছে। - {school_name}' },
        { id: 'late_entry', name: 'Late Entry', message: 'প্রিয় অভিভাবক, {student_name} আজ দেরিতে স্কুলে প্রবেশ করেছে। - {school_name}' }
    ],
    academic: [
        { id: 'result_published', name: '🎓 Result Published', message: 'প্রিয় {parent_name}, {student_name}-এর {exam_name} পরীক্ষার ফলাফল প্রকাশ করা হয়েছে। জিপিএ: {gpa}। বিস্তারিত অফিসে দেখুন। - {school_name}' },
        { id: 'exam_schedule', name: '📅 Exam Routine', message: 'নোটিশ: আগামী {date} থেকে {exam_name} পরীক্ষা শুরু হবে। প্রবেশপত্র সংগ্রহ করুন। - {school_name}' },
        { id: 'progress_report', name: '📈 Progress Report', message: 'প্রিয় অভিভাবক, আগামী {date} তারিখে প্রগ্রেস রিপোর্ট প্রদান করা হবে। উপস্থিত থাকার অনুরোধ রইল। - {school_name}' }
    ],
    finance: [
        { id: 'fee_due', name: 'Fee Due Warning', message: 'প্রিয় {parent_name}, {student_name} এর ফি বকেয়া ৳{due_amount}। পরিশোধের শেষ তারিখ {date}। - {school_name}' },
        { id: 'payment_success', name: 'Payment Received', message: 'ধন্যবাদ! {student_name} এর ৳{paid_amount} ফি গ্রহণ করা হলো। Invoice: {invoice_no}। - {school_name}' }
    ],
    marketing: [
        { id: 'admission_open', name: '📢 Admission Open', message: 'ভর্তি চলছে! {school_name}-এ নতুন শিক্ষাবর্ষে ভর্তি চলছে। আপনার পরিচিতদের জানাতে অনুরোধ রইল। আসন সংখ্যা সীমিত।' },
        { id: 'school_closed', name: '🏖️ Holiday Notice', message: 'নোটিশ: {event_name} উপলক্ষে আগামী {date} স্কুল বন্ধ থাকবে। - {school_name}' },
        { id: 'greeting', name: '🎉 Festival Wish', message: 'পবিত্র {event_name} উপলক্ষে আপনাকে ও আপনার পরিবারকে শুভেচ্ছা। - {school_name}' }
    ]
};

const VARIABLES = [
    '{parent_name}', '{student_name}', '{class}', '{roll}', '{date}',
    '{total_amount}', '{due_amount}', '{invoice_no}', '{school_name}',
    '{exam_name}', '{gpa}', '{event_name}'
];

const RECHARGE_PACKAGES = [
    { sms: 500, price: 500, bonus: 0, badge: 'Starter', color: 'blue' },
    { sms: 2000, price: 1900, bonus: 100, badge: 'Popular', color: 'purple' },
    { sms: 5000, price: 4500, bonus: 500, badge: 'Best Value', color: 'green' },
    { sms: 10000, price: 8500, bonus: 1500, badge: 'Institution', color: 'orange' }
];

export default function SMS() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [message, setMessage] = useState('');
    const [recipientType, setRecipientType] = useState('all');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [attendanceFilter, setAttendanceFilter] = useState('');
    const [feeFilter, setFeeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [smsHistory, setSmsHistory] = useState<any[]>([]);

    const [rechargeOpen, setRechargeOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => { loadBalance(); loadClasses(); loadHistory(); }, []);
    useEffect(() => { if (selectedClass) loadSections(); }, [selectedClass]);
    useEffect(() => { loadStudents(); }, [selectedClass, selectedSection, attendanceFilter, feeFilter, recipientType]);

    const loadBalance = async () => {
        const bal = await getSMSBalance();
        setBalance(bal);
    };

    const loadClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('display_order');
        if (data) setClasses(data);
    };

    const loadSections = async () => {
        const { data } = await supabase.from('sections').select('*').eq('class_id', selectedClass).order('name');
        if (data) setSections(data);
    };

    const loadStudents = async () => {
        setLoading(true);
        let query = supabase.from('students').select(`*, classes(name), sections(name), guardians(father_name, father_mobile, mother_name, mother_mobile), invoices(id, invoice_no, total, paid_amount, status)`).eq('status', 'active');

        if (recipientType === 'class' && selectedClass) {
            query = query.eq('class_id', selectedClass);
            if (selectedSection) query = query.eq('section_id', selectedSection);
        }

        const { data } = await query;
        let filteredStudents = data || [];

        // Apply Local Filters
        if (attendanceFilter) {
            const today = new Date().toISOString().split('T')[0];
            const { data: attendance } = await supabase.from('attendance').select('student_id, status').eq('date', today).eq('status', attendanceFilter);
            const attendanceIds = attendance?.map(a => a.student_id) || [];
            filteredStudents = filteredStudents.filter(s => attendanceIds.includes(s.id));
        }

        if (feeFilter && filteredStudents.length > 0) {
            filteredStudents = filteredStudents.filter(student => {
                const totalDue = student.invoices?.reduce((sum: number, inv: any) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0) || 0;
                if (feeFilter === 'due') return totalDue > 0;
                if (feeFilter === 'paid') return totalDue === 0;
                return true;
            });
        }

        setStudents(filteredStudents);
        setLoading(false);
    };

    const loadHistory = async () => {
        const { data } = await supabase.from('sms_log').select('*').order('created_at', { ascending: false }).limit(50);
        if (data) setSmsHistory(data);
    };

    const selectTemplate = (templateId: string) => {
        const allTemplates = Object.values(SMS_TEMPLATES).flat();
        const template = allTemplates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            setMessage(template.message);
        }
    };

    const insertVariable = (variable: string) => {
        setMessage(prev => prev + variable);
    };

    const replaceVariables = (template: string, student: any) => {
        const today = new Date();
        const totalAmount = student.invoices?.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
        const paidAmount = student.invoices?.reduce((sum: number, inv: any) => sum + (inv.paid_amount || 0), 0) || 0;
        const dueAmount = totalAmount - paidAmount;
        const firstInvoice = student.invoices?.[0];

        // Fetch school name from local storage or default
        const schoolName = 'Global Quranic School'; // In real app, fetch from school_settings

        const variables: Record<string, string> = {
            '{parent_name}': student.guardians?.father_name || student.guardians?.mother_name || 'অভিভাবক',
            '{student_name}': student.name_en || student.name_bn || '',
            '{class}': student.classes?.name || '',
            '{section}': student.sections?.name || '',
            '{roll}': student.roll?.toString() || '',
            '{student_id}': student.student_id || '',
            '{school_name}': schoolName,
            '{date}': today.toLocaleDateString('en-GB'),
            '{month}': today.toLocaleDateString('en-US', { month: 'long' }),
            '{total_amount}': totalAmount.toString(),
            '{due_amount}': dueAmount.toString(),
            '{paid_amount}': paidAmount.toString(),
            '{invoice_no}': firstInvoice?.invoice_no || '',
            // Placeholder defaults for manual edit items
            '{exam_name}': 'Annual',
            '{gpa}': '5.00',
            '{event_name}': 'Eid'
        };

        let result = template;
        Object.entries(variables).forEach(([key, value]) => {
            result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });
        return result;
    };

    // ACCURATE: Calculate SMS for each recipient to avoid underestimating costs
    const accurateSMSCalculation = useMemo(() => {
        if (!message.trim()) return { totalSMS: 0, recipients: 0, minSMS: 0, maxSMS: 0, avgSMS: 0 };

        let recipients: any[] = [];
        if (recipientType === 'all') recipients = students;
        else if (recipientType === 'class') recipients = students;
        else if (recipientType === 'individual') recipients = students.filter(s => selectedStudents.includes(s.id));

        if (recipients.length === 0) return { totalSMS: 0, recipients: 0, minSMS: 0, maxSMS: 0, avgSMS: 0 };

        let totalSMS = 0;
        let minSMS = Infinity;
        let maxSMS = 0;

        recipients.forEach(student => {
            const finalMessage = replaceVariables(message, student);
            const smsCount = getSMSInfo(finalMessage).count;
            totalSMS += smsCount;
            if (smsCount < minSMS) minSMS = smsCount;
            if (smsCount > maxSMS) maxSMS = smsCount;
        });

        const avgSMS = recipients.length > 0 ? (totalSMS / recipients.length).toFixed(1) : 0;

        return {
            totalSMS,
            recipients: recipients.length,
            minSMS: minSMS === Infinity ? 0 : minSMS,
            maxSMS,
            avgSMS: parseFloat(avgSMS as string)
        };
    }, [message, students, recipientType, selectedClass, selectedSection, selectedStudents]);

    const sendSMS = async () => {
        if (!message.trim()) {
            toast({ title: "Error", description: "Message required", variant: "destructive" });
            return;
        }

        let recipients: any[] = [];
        if (recipientType === 'all') recipients = students;
        else if (recipientType === 'class') {
            if (!selectedClass) {
                toast({ title: "Error", description: "Select class", variant: "destructive" });
                return;
            }
            recipients = students;
        } else if (recipientType === 'individual') {
            if (selectedStudents.length === 0) {
                toast({ title: "Error", description: "Select students", variant: "destructive" });
                return;
            }
            recipients = students.filter(s => selectedStudents.includes(s.id));
        }

        if (recipients.length === 0) {
            toast({ title: "Error", description: "No recipients found", variant: "destructive" });
            return;
        }

        const smsData = recipients.map(student => {
            const phone = student.guardians?.father_mobile || student.guardians?.mother_mobile;
            if (!phone) return null;
            return { mobile: phone, message: replaceVariables(message, student) };
        }).filter(Boolean) as { mobile: string; message: string }[];

        if (smsData.length === 0) {
            toast({ title: "Error", description: "No valid phone numbers found", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const sentCount = await sendBulkSMS(smsData);
            toast({ title: "✓ Sent Successfully", description: `${sentCount} messages sent` });
            loadBalance();
            loadHistory();
            setMessage('');
            setSelectedTemplate('');
            setSelectedStudents([]);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async (packageData: any) => {
        try {
            setRechargeOpen(false);
            toast({ title: "Redirecting...", description: "Opening payment gateway..." });
            await initiateSMSRecharge(packageData);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const filteredStudents = students.filter(s => s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || s.roll?.toString().includes(searchQuery));

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Hero / Balance Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 p-8 shadow-xl">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute -bottom-8 left-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white min-w-[160px] float-left">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <CreditCard className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-200 uppercase font-semibold">Balance</p>
                                            <p className="text-2xl font-bold">{balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <div>
                                <h1 className="text-4xl font-bold text-white flex items-center gap-2">
                                    SMS Center
                                </h1>
                                <p className="text-indigo-200 text-lg">Instant Parent Communication</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">

                            <Button size="lg" onClick={() => setRechargeOpen(true)} className="h-16 bg-white text-indigo-900 hover:bg-indigo-50 border-0 font-bold shadow-lg">
                                <Plus className="w-5 h-5 mr-2" />Recharge Now
                            </Button>
                            <Button size="lg" onClick={() => setHistoryOpen(true)} variant="outline" className="h-16 bg-white text-indigo-900 hover:bg-indigo-50 border-0 font-bold shadow-lg">
                                <History className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* LEFT COLUMN: COMPOSER */}
                    <Card className="lg:col-span-2 border shadow-lg flex flex-col h-full">
                        <CardHeader className="border-b bg-gray-50/50 pb-4">
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Zap className="w-5 h-5 text-purple-600 fill-purple-600" />
                                Compose Message
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6 flex-1">
                            <Tabs defaultValue="academic" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1">
                                    <TabsTrigger value="academic" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Academic</TabsTrigger>
                                    <TabsTrigger value="attendance" className="data-[state=active]:bg-white data-[state=active]:text-purple-600">Attendance</TabsTrigger>
                                    <TabsTrigger value="finance" className="data-[state=active]:bg-white data-[state=active]:text-green-600">Fees</TabsTrigger>
                                    <TabsTrigger value="marketing" className="data-[state=active]:bg-white data-[state=active]:text-orange-600">Notices</TabsTrigger>
                                </TabsList>

                                {Object.entries(SMS_TEMPLATES).map(([category, templates]) => (
                                    <TabsContent key={category} value={category} className="mt-4">
                                        <ScrollArea className="h-[140px] rounded-lg border bg-gray-50/50 p-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {templates.map(template => (
                                                    <Button
                                                        key={template.id}
                                                        variant="outline"
                                                        className={cn(
                                                            "justify-start text-left h-auto py-3 px-4 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all",
                                                            selectedTemplate === template.id && "border-purple-600 bg-purple-50 ring-1 ring-purple-600"
                                                        )}
                                                        onClick={() => selectTemplate(template.id)}
                                                    >
                                                        <div className="w-full">
                                                            <div className="font-bold text-xs mb-1 flex items-center gap-2">
                                                                {category === 'academic' && <GraduationCap className="w-3 h-3 text-blue-500" />}
                                                                {category === 'marketing' && <Megaphone className="w-3 h-3 text-orange-500" />}
                                                                {template.name}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground line-clamp-2 whitespace-normal leading-relaxed">
                                                                {template.message}
                                                            </div>
                                                        </div>
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                ))}
                            </Tabs>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-gray-700">Message Content</label>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                            Tip: Update text inside {'{}'}
                                        </Badge>
                                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setMessage('')}>Clear</Button>
                                    </div>
                                </div>
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Select a template or type your message here..."
                                    rows={5}
                                    className="font-bengali text-base resize-none border-gray-300 focus:border-purple-500 focus:ring-purple-500 min-h-[120px]"
                                />

                                {/* SMS Counter Stats */}
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-medium text-gray-500">Characters: <span className="text-gray-900 font-bold">{message.length}</span></div>
                                        <div className="h-4 w-px bg-gray-300"></div>
                                        <Badge variant={accurateSMSCalculation.maxSMS > 1 ? "secondary" : "outline"} className={cn("text-xs", accurateSMSCalculation.maxSMS > 1 && "bg-orange-100 text-orange-700")}>
                                            {accurateSMSCalculation.avgSMS} SMS / person
                                        </Badge>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        Note: Bengali characters take more space (70 chars = 1 SMS)
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    <h4 className="font-semibold text-xs text-blue-900">Dynamic Variables</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {VARIABLES.map(v => (
                                        <button
                                            key={v}
                                            onClick={() => insertVariable(v)}
                                            className="px-2 py-1 rounded bg-white border border-blue-200 text-[10px] text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* RIGHT COLUMN: RECIPIENTS & SEND */}
                    <div className="space-y-6">
                        <Card className="border shadow-md">
                            <CardHeader className="bg-gray-50 py-3">
                                <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
                                    <Users className="w-4 h-4" /> Select Recipients
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Send To</label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'all', label: '📢 All Students' },
                                            { value: 'class', label: '🎓 Specific Class' },
                                            { value: 'individual', label: '👤 Specific Students' }
                                        ]}
                                        value={recipientType}
                                        onValueChange={setRecipientType}
                                    />
                                </div>

                                {recipientType === 'class' && (
                                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                                        <SearchableSelect options={classes.map(c => ({ value: c.id, label: c.name }))} value={selectedClass} onValueChange={setSelectedClass} placeholder="Select Class" />
                                        <SearchableSelect options={[{ value: '', label: 'All Sections' }, ...sections.map(s => ({ value: s.id, label: s.name }))]} value={selectedSection} onValueChange={setSelectedSection} placeholder="Section (Opt)" disabled={!selectedClass} />
                                    </div>
                                )}

                                {/* Filters */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-400">Attendance</label>
                                        <SearchableSelect options={[{ value: '', label: 'Everyone' }, { value: 'present', label: '✓ Present Today' }, { value: 'absent', label: '✗ Absent Today' }]} value={attendanceFilter} onValueChange={setAttendanceFilter} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-400">Fees Status</label>
                                        <SearchableSelect options={[{ value: '', label: 'Everyone' }, { value: 'due', label: '💰 Has Dues' }, { value: 'paid', label: '✓ Paid Full' }]} value={feeFilter} onValueChange={setFeeFilter} />
                                    </div>
                                </div>

                                {recipientType === 'individual' && (
                                    <div className="animate-in fade-in">
                                        <Input placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mb-2 h-8 text-xs" />
                                        <ScrollArea className="h-[180px] border rounded-md bg-white p-2">
                                            {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                                <div key={s.id} className="flex items-center gap-2 mb-1 p-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => {
                                                    selectedStudents.includes(s.id)
                                                        ? setSelectedStudents(selectedStudents.filter(id => id !== s.id))
                                                        : setSelectedStudents([...selectedStudents, s.id])
                                                }}>
                                                    <Checkbox checked={selectedStudents.includes(s.id)} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate">{s.name_en}</p>
                                                        <p className="text-[10px] text-muted-foreground">Roll: {s.roll} • {s.classes?.name}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-4 text-xs text-muted-foreground">No students found</div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* SUMMARY & SEND CARD */}
                        <Card className="border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base text-indigo-900">
                                    <TrendingUp className="w-4 h-4" /> Cost Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-2 rounded border text-center">
                                        <div className="text-[10px] text-muted-foreground uppercase">Recipients</div>
                                        <div className="text-xl font-bold text-gray-800">{accurateSMSCalculation.recipients}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border text-center border-indigo-200">
                                        <div className="text-[10px] text-indigo-600 uppercase font-bold">Total Cost</div>
                                        <div className="text-xl font-bold text-indigo-700">{accurateSMSCalculation.totalSMS} SMS</div>
                                    </div>
                                </div>

                                {accurateSMSCalculation.recipients > 0 && accurateSMSCalculation.totalSMS > balance && (
                                    <div className="bg-red-50 text-red-700 text-xs p-2 rounded flex items-center gap-2 border border-red-200">
                                        <XCircle className="w-4 h-4" />
                                        Insufficient balance! Needs {accurateSMSCalculation.totalSMS - balance} more.
                                    </div>
                                )}

                                <Button
                                    onClick={sendSMS}
                                    disabled={loading || balance < accurateSMSCalculation.totalSMS || accurateSMSCalculation.recipients === 0}
                                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all text-base font-bold"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 w-5 h-5" />}
                                    Send Message
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* RECHARGE MODAL */}
                <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl">
                                <Gem className="w-6 h-6 text-purple-600" /> Recharge Packages
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
                            {RECHARGE_PACKAGES.map(pkg => (
                                <Card
                                    key={pkg.sms}
                                    className={cn(
                                        "border-2 hover:shadow-xl transition-all cursor-pointer relative group overflow-hidden",
                                        pkg.badge === 'Best Value' ? "border-green-400 ring-4 ring-green-50" : "border-gray-200 hover:border-purple-300"
                                    )}
                                    onClick={() => handleRecharge(pkg)}
                                >
                                    {pkg.badge && (
                                        <div className="absolute top-0 right-0">
                                            <Badge className={cn(
                                                "rounded-tl-none rounded-br-none rounded-tr-md rounded-bl-xl text-[10px] px-3 py-1 uppercase tracking-wider font-bold shadow-sm",
                                                pkg.color === 'green' && "bg-green-500",
                                                pkg.color === 'purple' && "bg-purple-600",
                                                pkg.color === 'orange' && "bg-orange-500",
                                                pkg.color === 'blue' && "bg-blue-500"
                                            )}>
                                                {pkg.badge}
                                            </Badge>
                                        </div>
                                    )}
                                    <CardContent className="p-5 text-center flex flex-col items-center justify-between h-full pt-8">
                                        <div className="space-y-1">
                                            <div className="text-3xl font-extrabold text-gray-800">{pkg.sms.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-widest">SMS Credits</div>
                                        </div>

                                        <div className="my-4 w-full space-y-2">
                                            <div className="text-2xl font-bold text-purple-700">৳{pkg.price}</div>
                                            {pkg.bonus > 0 ? (
                                                <div className="text-xs bg-green-50 text-green-700 py-1 px-2 rounded-full font-bold border border-green-100">
                                                    +{pkg.bonus} Free Bonus
                                                </div>
                                            ) : <div className="h-6"></div>}
                                        </div>

                                        <Button className={cn("w-full font-bold", pkg.badge === 'Best Value' ? "bg-green-600 hover:bg-green-700" : "bg-gray-900 hover:bg-gray-800")}>
                                            Select
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* HISTORY MODAL */}
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                    <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Recent Log</DialogTitle></DialogHeader>
                        <ScrollArea className="flex-1">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="w-[140px]">Date</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Message Preview</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {smsHistory.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                                            <TableCell className="font-mono text-xs font-semibold">{log.recipient_number}</TableCell>
                                            <TableCell className="max-w-[200px] truncate text-xs text-gray-600" title={log.message}>{log.message}</TableCell>
                                            <TableCell className="text-center">
                                                {log.status === 'sent' ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-2">Sent</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-xs">{log.sms_count}</TableCell>
                                        </TableRow>
                                    ))}
                                    {smsHistory.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No history found</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}