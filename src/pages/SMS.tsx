// FILE: src/pages/SMS.tsx - ACCURATE PER-RECIPIENT SMS CALCULATION
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
    Zap, History, CheckCircle, XCircle, DollarSign, Gem, Star, Flame, Info
} from 'lucide-react';

const SMS_TEMPLATES = {
    attendance: [
        { id: 'absence_alert', name: 'Absence Alert', message: 'প্রিয় {parent_name}, {student_name} আজ ({date}) অনুপস্থিত। Class: {class}, Roll: {roll}। - {school_name}' },
        { id: 'present_confirm', name: 'Present', message: 'প্রিয় {parent_name}, {student_name} আজ উপস্থিত। - {school_name}' }
    ],
    finance: [
        { id: 'fee_due', name: 'Fee Due', message: 'প্রিয় {parent_name}, {student_name} এর ফি বকেয়া ৳{due_amount}। Invoice: {invoice_no}। - {school_name}' },
        { id: 'payment_success', name: 'Payment', message: 'প্রিয় {parent_name}, {student_name} এর ৳{paid_amount} ফি পরিশোধ হয়েছে। ধন্যবাদ। - {school_name}' }
    ],
    general: [{ id: 'custom', name: 'Custom', message: 'প্রিয় {parent_name}, আপনার বার্তা। - {school_name}' }]
};

const VARIABLES = ['{parent_name}', '{student_name}', '{class}', '{roll}', '{date}', '{total_amount}', '{due_amount}', '{invoice_no}', '{school_name}'];

const RECHARGE_PACKAGES = [
    { sms: 500, price: 500, bonus: 0, badge: 'Starter', color: 'blue' },
    { sms: 1000, price: 990, bonus: 0, badge: 'Popular', color: 'purple' },
    { sms: 1500, price: 1490, bonus: 0, badge: 'Best Value', color: 'green' }
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

        const variables: Record<string, string> = {
            '{parent_name}': student.guardians?.father_name || student.guardians?.mother_name || 'অভিভাবক',
            '{student_name}': student.name_en || student.name_bn || '',
            '{class}': student.classes?.name || '',
            '{section}': student.sections?.name || '',
            '{roll}': student.roll?.toString() || '',
            '{student_id}': student.student_id || '',
            '{school_name}': 'Global Quranic School',
            '{date}': today.toLocaleDateString('en-GB'),
            '{month}': today.toLocaleDateString('en-US', { month: 'long' }),
            '{total_amount}': totalAmount.toString(),
            '{due_amount}': dueAmount.toString(),
            '{paid_amount}': paidAmount.toString(),
            '{invoice_no}': firstInvoice?.invoice_no || ''
        };

        let result = template;
        Object.entries(variables).forEach(([key, value]) => {
            result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });
        return result;
    };

    // ACCURATE: Calculate SMS for each recipient
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
        const smsPerRecipient: number[] = [];

        recipients.forEach(student => {
            const finalMessage = replaceVariables(message, student);
            const smsCount = getSMSInfo(finalMessage).count;
            totalSMS += smsCount;
            smsPerRecipient.push(smsCount);
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
            toast({ title: "Error", description: "No recipients", variant: "destructive" });
            return;
        }

        const smsData = recipients.map(student => {
            const phone = student.guardians?.father_mobile || student.guardians?.mother_mobile;
            if (!phone) return null;
            return { mobile: phone, message: replaceVariables(message, student) };
        }).filter(Boolean) as { mobile: string; message: string }[];

        if (smsData.length === 0) {
            toast({ title: "Error", description: "No valid phones", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const sentCount = await sendBulkSMS(smsData);
            toast({ title: "✓ Sent", description: `${sentCount} messages` });
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
            toast({ title: "Redirecting...", description: "Opening payment..." });
            await initiateSMSRecharge(packageData);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const filteredStudents = students.filter(s => s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || s.roll?.toString().includes(searchQuery));

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-8">
                    <div className="absolute inset-0 bg-grid-white/10" />
                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <MessageSquare className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white flex items-center gap-2">
                                    SMS Center <Sparkles className="w-6 h-6" />
                                </h1>
                                <p className="text-white/90 text-lg">Engage parents instantly</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Card className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-6 h-6" />
                                        <div>
                                            <p className="text-sm text-white/80">Balance</p>
                                            <p className="text-3xl font-bold">{balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Button size="lg" onClick={() => setRechargeOpen(true)} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30">
                                <Plus className="w-5 h-5 mr-2" />Recharge
                            </Button>
                            <Button size="lg" onClick={() => setHistoryOpen(true)} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30">
                                <History className="w-5 h-5 mr-2" />History
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2 border-2 shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-purple-600" />Compose</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <Tabs defaultValue="attendance">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                                    <TabsTrigger value="finance">Finance</TabsTrigger>
                                    <TabsTrigger value="general">Custom</TabsTrigger>
                                </TabsList>
                                {Object.entries(SMS_TEMPLATES).map(([category, templates]) => (
                                    <TabsContent key={category} value={category}>
                                        <ScrollArea className="h-[180px]">
                                            <div className="space-y-2 pr-4">
                                                {templates.map(template => (
                                                    <Button key={template.id} variant={selectedTemplate === template.id ? 'default' : 'outline'} className={cn("w-full justify-start text-left h-auto py-2.5 px-3", selectedTemplate === template.id && "bg-purple-600")} onClick={() => selectTemplate(template.id)}>
                                                        <div className="w-full">
                                                            <div className="font-semibold text-xs mb-0.5">{template.name}</div>
                                                            <div className="text-[10px] opacity-80 line-clamp-2 whitespace-normal leading-tight">{template.message}</div>
                                                        </div>
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                ))}
                            </Tabs>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold">Message *</label>
                                    <Button variant="ghost" size="sm" onClick={() => setMessage('')}>Clear</Button>
                                </div>
                                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type..." rows={6} className="font-bengali text-base resize-none border-2" />
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{message.length} chars</Badge>
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                            {accurateSMSCalculation.avgSMS} avg SMS
                                        </Badge>
                                        {accurateSMSCalculation.minSMS !== accurateSMSCalculation.maxSMS && (
                                            <Badge variant="outline" className="text-xs">
                                                {accurateSMSCalculation.minSMS}-{accurateSMSCalculation.maxSMS} SMS range
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">160 chars = 1 SMS</span>
                                </div>
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-3 bg-blue-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    <h4 className="font-semibold text-xs">Variables</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {VARIABLES.map(v => (
                                        <Button key={v} variant="outline" size="sm" onClick={() => insertVariable(v)} className="text-[10px] h-7 px-2">
                                            <Plus className="w-3 h-3 mr-0.5" />{v}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-2">
                            <CardHeader className="bg-green-50"><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-green-600" />Recipients</CardTitle></CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <SearchableSelect options={[{ value: 'all', label: '📢 All' }, { value: 'class', label: '🎓 Class' }, { value: 'individual', label: '👤 Select' }]} value={recipientType} onValueChange={setRecipientType} />
                                {recipientType === 'class' && (
                                    <>
                                        <SearchableSelect options={classes.map(c => ({ value: c.id, label: c.name }))} value={selectedClass} onValueChange={setSelectedClass} placeholder="Class" />
                                        {selectedClass && <SearchableSelect options={[{ value: '', label: 'All' }, ...sections.map(s => ({ value: s.id, label: s.name }))]} value={selectedSection} onValueChange={setSelectedSection} />}
                                    </>
                                )}
                                <SearchableSelect options={[{ value: '', label: 'All' }, { value: 'present', label: '✓ Present' }, { value: 'absent', label: '✗ Absent' }]} value={attendanceFilter} onValueChange={setAttendanceFilter} />
                                <SearchableSelect options={[{ value: '', label: 'All' }, { value: 'due', label: '💰 Due' }, { value: 'paid', label: '✓ Paid' }]} value={feeFilter} onValueChange={setFeeFilter} />
                                {recipientType === 'individual' && (
                                    <>
                                        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                        <ScrollArea className="h-[200px] border-2 rounded p-2">
                                            {filteredStudents.map(s => (
                                                <div key={s.id} className="flex items-center gap-2 mb-1.5 p-1.5 hover:bg-gray-50 rounded">
                                                    <Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={(checked) => checked ? setSelectedStudents([...selectedStudents, s.id]) : setSelectedStudents(selectedStudents.filter(id => id !== s.id))} />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-medium">{s.name_en}</p>
                                                        <p className="text-[10px] text-muted-foreground">Roll {s.roll}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-2 bg-purple-50">
                            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4" />Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Recipients</span>
                                    <Badge variant="secondary">{accurateSMSCalculation.recipients}</Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    Total SMS
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </span>
                                    <Badge className="bg-blue-600 text-base font-bold">{accurateSMSCalculation.totalSMS}</Badge>
                                </div>
                                {accurateSMSCalculation.recipients > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Info className="w-3 h-3" />
                                            <span className="font-semibold">Calculated per recipient</span>
                                        </div>
                                        <div className="text-[10px] space-y-0.5">
                                            <div>Avg: {accurateSMSCalculation.avgSMS} SMS/person</div>
                                            <div>Range: {accurateSMSCalculation.minSMS}-{accurateSMSCalculation.maxSMS} SMS</div>
                                        </div>
                                    </div>
                                )}
                                <Button onClick={sendSMS} disabled={loading || balance < accurateSMSCalculation.totalSMS || accurateSMSCalculation.recipients === 0} className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 mt-2">
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                    Send {accurateSMSCalculation.totalSMS} SMS
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recharge */}
                <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Gem className="w-5 h-5 text-purple-600" />Recharge SMS</DialogTitle></DialogHeader>
                        <div className="grid md:grid-cols-3 gap-4 p-2">
                            {RECHARGE_PACKAGES.map(pkg => (
                                <Card key={pkg.sms} className={cn("border-2 hover:border-purple-400 hover:shadow-xl transition-all cursor-pointer relative", pkg.badge === 'Best Value' && "border-green-400 ring-2 ring-green-200", pkg.badge === 'Popular' && "border-purple-400")} onClick={() => handleRecharge(pkg)}>
                                    {pkg.badge && (
                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                                            <Badge className={cn("text-xs font-bold px-2.5 py-0.5 shadow-md", pkg.color === 'green' && "bg-green-500", pkg.color === 'purple' && "bg-purple-500", pkg.color === 'blue' && "bg-blue-500")}>
                                                {pkg.badge === 'Best Value' && <Star className="w-3 h-3 mr-1" />}
                                                {pkg.badge === 'Popular' && <Flame className="w-3 h-3 mr-1" />}
                                                {pkg.badge}
                                            </Badge>
                                        </div>
                                    )}
                                    <CardContent className="p-5 text-center space-y-2.5">
                                        <div className="text-3xl font-bold text-purple-600">{pkg.sms.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground font-medium">SMS</div>
                                        {pkg.bonus > 0 && (
                                            <div>
                                                <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5 font-bold">+{pkg.bonus} BONUS</Badge>
                                                <div className="text-[10px] text-green-600 font-semibold mt-1">= {(pkg.sms + pkg.bonus).toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className="text-3xl font-bold py-1">৳{pkg.price}</div>
                                        <Button className="w-full h-9 text-sm font-semibold shadow-md hover:shadow-lg">
                                            <DollarSign className="w-3.5 h-3.5 mr-1" />Buy Now
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* History */}
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" />SMS History</DialogTitle></DialogHeader>
                        <ScrollArea className="h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Date</TableHead>
                                        <TableHead className="text-xs">Recipient</TableHead>
                                        <TableHead className="text-xs">Message</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs">Total SMS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {smsHistory.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-[10px]">{new Date(log.created_at).toLocaleString('en-GB', { hour12: false })}</TableCell>
                                            <TableCell className="font-mono text-[10px]">{log.recipient_number}</TableCell>
                                            <TableCell className="max-w-xs truncate text-[10px]">{log.message}</TableCell>
                                            <TableCell>
                                                {log.status === 'sent' ? (
                                                    <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Sent</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5"><XCircle className="w-2.5 h-2.5 mr-0.5" />Failed</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-[10px] font-semibold">{log.sms_count}</TableCell>
                                        </TableRow>
                                    ))}
                                    {smsHistory.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No history</TableCell></TableRow>
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