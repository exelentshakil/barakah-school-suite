// FILE: src/pages/Fees.tsx - WORLD CLASS FEES PAGE
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateReceipt } from '@/lib/receipt';
import {
    DollarSign,
    Loader2,
    Plus,
    MoreVertical,
    Eye,
    Printer,
    CheckCircle2,
    Clock,
    AlertCircle,
    Receipt,
    CreditCard,
    TrendingUp,
    Users,
    FileText,
    Download
} from 'lucide-react';

export default function Fees() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [feeHeads, setFeeHeads] = useState<any[]>([]);
    const [feePlans, setFeePlans] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Filters
    const [filterClass, setFilterClass] = useState('all');
    const [filterSection, setFilterSection] = useState('all');
    const [filterStudent, setFilterStudent] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Create Invoice Dialog
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [invoiceClass, setInvoiceClass] = useState('');
    const [invoiceSection, setInvoiceSection] = useState('');
    const [invoiceSections, setInvoiceSections] = useState<any[]>([]);
    const [invoiceStudent, setInvoiceStudent] = useState('');
    const [invoiceStudents, setInvoiceStudents] = useState<any[]>([]);
    const [selectedFeeHeads, setSelectedFeeHeads] = useState<Record<string, boolean>>({});
    const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Payment Dialog
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [transactionId, setTransactionId] = useState('');

    // Stats
    const [stats, setStats] = useState({
        totalDue: 0,
        totalPaid: 0,
        totalStudents: 0,
        pendingInvoices: 0
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
        if (filterClass && filterClass !== 'all') {
            loadFilterSections();
        } else {
            setSections([]);
            setFilterSection('all');
        }
    }, [filterClass]);

    useEffect(() => {
        loadInvoices();
    }, [filterClass, filterSection, filterStudent, filterStatus]);

    useEffect(() => {
        if (invoiceClass) {
            loadInvoiceSections();
            loadFeePlansForInvoice();
        } else {
            setInvoiceSections([]);
            setInvoiceSection('');
        }
    }, [invoiceClass]);

    useEffect(() => {
        if (invoiceSection) {
            loadFeePlansForInvoice();
        }
    }, [invoiceSection]);

    useEffect(() => {
        if (invoiceClass) {
            loadInvoiceStudents();
        }
    }, [invoiceClass, invoiceSection]);

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
            loadFeeHeads()
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

    const loadFilterSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', filterClass)
            .order('name');
        if (data) setSections(data);
    };

    const loadInvoiceSections = async () => {
        const { data } = await supabase
            .from('sections')
            .select('*')
            .eq('class_id', invoiceClass)
            .order('name');
        if (data) setInvoiceSections(data);
    };

    const loadFeeHeads = async () => {
        const { data } = await supabase
            .from('fee_heads')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (data) setFeeHeads(data);
    };

    const loadFeePlansForInvoice = async () => {
        if (!invoiceClass) return;

        let query = supabase
            .from('fee_plans')
            .select('*, fee_heads(name, type)')
            .eq('class_id', invoiceClass);

        if (invoiceSection) {
            query = query.or(`section_id.eq.${invoiceSection},section_id.is.null`);
        } else {
            query = query.is('section_id', null);
        }

        const { data } = await query;

        if (data) {
            setFeePlans(data);
            const amounts: Record<string, string> = {};
            data.forEach(plan => {
                amounts[plan.fee_head_id] = plan.amount.toString();
            });
            setCustomAmounts(amounts);
        }
    };

    const loadInvoiceStudents = async () => {
        let query = supabase
            .from('students')
            .select('id, name_en, student_id, roll')
            .eq('class_id', invoiceClass)
            .eq('status', 'active')
            .order('roll');

        if (invoiceSection) {
            query = query.eq('section_id', invoiceSection);
        }

        const { data } = await query;
        if (data) setInvoiceStudents(data);
    };

    const loadInvoices = async () => {
        let query = supabase
            .from('invoices')
            .select('*, students(name_en, student_id, roll), classes(name), sections(name)')
            .order('created_at', { ascending: false });

        if (user?.role === 'teacher' && allowedClasses.length > 0) {
            query = query.in('class_id', allowedClasses);
        }

        if (filterClass !== 'all') {
            query = query.eq('class_id', filterClass);
        }

        if (filterSection !== 'all') {
            query = query.eq('section_id', filterSection);
        }

        if (filterStudent !== 'all') {
            query = query.eq('student_id', filterStudent);
        }

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data } = await query;
        if (data) {
            setInvoices(data);
            calculateStats(data);
        }
    };

    const calculateStats = (data: any[]) => {
        const totalDue = data.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount)), 0);
        const totalPaid = data.reduce((sum, inv) => sum + parseFloat(inv.paid_amount), 0);
        const uniqueStudents = new Set(data.map(inv => inv.student_id)).size;
        const pending = data.filter(inv => inv.status === 'pending').length;

        setStats({
            totalDue,
            totalPaid,
            totalStudents: uniqueStudents,
            pendingInvoices: pending
        });
    };

    const handleCreateInvoice = async () => {
        if (!invoiceStudent || !invoiceClass) {
            toast({ title: "Please select student", variant: "destructive" });
            return;
        }

        const selectedIds = Object.entries(selectedFeeHeads).filter(([_, sel]) => sel).map(([id]) => id);
        if (selectedIds.length === 0) {
            toast({ title: "Please select at least one fee", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const total = selectedIds.reduce((sum, id) => sum + parseFloat(customAmounts[id] || '0'), 0);

            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    invoice_no: `INV-${Date.now()}`,
                    student_id: invoiceStudent,
                    class_id: invoiceClass,
                    section_id: invoiceSection || null,
                    invoice_date: new Date().toISOString().split('T')[0],
                    due_date: dueDate,
                    subtotal: total,
                    total_amount: total,
                    paid_amount: 0,
                    status: 'pending',
                    created_by: user?.id
                })
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            const items = selectedIds.map(feeHeadId => {
                const feeHead = feeHeads.find(f => f.id === feeHeadId);
                return {
                    invoice_id: invoice.id,
                    fee_head_id: feeHeadId,
                    fee_head_name: feeHead?.name,
                    amount: parseFloat(customAmounts[feeHeadId])
                };
            });

            const { error: itemsError } = await supabase.from('invoice_items').insert(items);
            if (itemsError) throw itemsError;

            toast({ title: "✓ Invoice created successfully!" });
            setInvoiceDialogOpen(false);
            resetInvoiceForm();
            loadInvoices();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const resetInvoiceForm = () => {
        setInvoiceClass('');
        setInvoiceSection('');
        setInvoiceStudent('');
        setSelectedFeeHeads({});
        setCustomAmounts({});
        setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    };

    const handleRecordPayment = async () => {
        if (!selectedInvoice || !paymentAmount) {
            toast({ title: "Please enter payment amount", variant: "destructive" });
            return;
        }

        const amount = parseFloat(paymentAmount);
        const dueAmount = parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.paid_amount);

        if (amount > dueAmount) {
            toast({ title: "Amount exceeds due amount", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error: paymentError } = await supabase.from('payments').insert({
                invoice_id: selectedInvoice.id,
                amount: amount,
                payment_method: paymentMethod,
                transaction_id: transactionId || null,
                received_by: user?.id
            });

            if (paymentError) throw paymentError;

            const newPaidAmount = parseFloat(selectedInvoice.paid_amount) + amount;
            const newStatus = newPaidAmount >= parseFloat(selectedInvoice.total_amount) ? 'paid' : 'partial';

            const { error: updateError } = await supabase
                .from('invoices')
                .update({
                    paid_amount: newPaidAmount,
                    status: newStatus
                })
                .eq('id', selectedInvoice.id);

            if (updateError) throw updateError;

            // Generate receipt
            const student = invoices.find(inv => inv.id === selectedInvoice.id)?.students;
            if (student) {
                const { data: school } = await supabase.from('school_settings').select('*').single();
                await generateReceipt({
                    ...selectedInvoice,
                    students: student,
                    payment_amount: amount,
                    payment_method: paymentMethod,
                    payment_date: new Date().toISOString()
                }, school);
            }

            toast({ title: "✓ Payment recorded & receipt generated!" });
            setPaymentDialogOpen(false);
            setPaymentAmount('');
            setTransactionId('');
            loadInvoices();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleReprintReceipt = async (invoice: any) => {
        const { data: school } = await supabase.from('school_settings').select('*').single();
        const { data: payment } = await supabase
            .from('payments')
            .select('*')
            .eq('invoice_id', invoice.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (payment) {
            await generateReceipt({
                ...invoice,
                payment_amount: payment.amount,
                payment_method: payment.payment_method,
                payment_date: payment.created_at
            }, school);
            toast({ title: "✓ Receipt downloaded!" });
        }
    };

    const totalInvoiceAmount = Object.entries(selectedFeeHeads)
        .filter(([_, sel]) => sel)
        .reduce((sum, [id]) => sum + parseFloat(customAmounts[id] || '0'), 0);

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

    const sectionOptions = [
        { value: 'all', label: 'All Sections' },
        ...sections.map(s => ({ value: s.id, label: s.name }))
    ];

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'partial', label: 'Partial' },
        { value: 'paid', label: 'Paid' }
    ];

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
                        <p className="text-muted-foreground mt-1">Manage student fees and payments</p>
                    </div>
                    <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="hero">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>Create Invoice</DialogTitle>
                                <DialogDescription>Generate a new fee invoice for a student</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[calc(90vh-180px)]">
                                <div className="space-y-4 pr-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Class *</Label>
                                            <SearchableSelect
                                                options={classes.map(c => ({ value: c.id, label: c.name }))}
                                                value={invoiceClass}
                                                onValueChange={setInvoiceClass}
                                                placeholder="Select class..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Section</Label>
                                            <SearchableSelect
                                                options={[
                                                    { value: '', label: 'All Sections' },
                                                    ...invoiceSections.map(s => ({ value: s.id, label: s.name }))
                                                ]}
                                                value={invoiceSection}
                                                onValueChange={setInvoiceSection}
                                                placeholder="Select section..."
                                                disabled={!invoiceClass || invoiceSections.length === 0}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Student *</Label>
                                        <SearchableSelect
                                            options={invoiceStudents.map(s => ({
                                                value: s.id,
                                                label: `${s.name_en} (${s.student_id}) - Roll: ${s.roll || 'N/A'}`
                                            }))}
                                            value={invoiceStudent}
                                            onValueChange={setInvoiceStudent}
                                            placeholder="Select student..."
                                            searchPlaceholder="Search by name or ID..."
                                            disabled={!invoiceClass || invoiceStudents.length === 0}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Due Date</Label>
                                        <Input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <Label>Fee Heads *</Label>
                                        <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                                            {feePlans.length > 0 ? (
                                                feePlans.map(plan => (
                                                    <div key={plan.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent">
                                                        <Checkbox
                                                            checked={selectedFeeHeads[plan.fee_head_id] || false}
                                                            onCheckedChange={(checked) => {
                                                                setSelectedFeeHeads(prev => ({
                                                                    ...prev,
                                                                    [plan.fee_head_id]: checked as boolean
                                                                }));
                                                            }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium">{plan.fee_heads?.name}</div>
                                                            <div className="text-xs text-muted-foreground">{plan.fee_heads?.type}</div>
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Amount"
                                                            className="w-32"
                                                            value={customAmounts[plan.fee_head_id] || ''}
                                                            onChange={(e) => setCustomAmounts(prev => ({
                                                                ...prev,
                                                                [plan.fee_head_id]: e.target.value
                                                            }))}
                                                            disabled={!selectedFeeHeads[plan.fee_head_id]}
                                                        />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                                    <p className="text-sm">No fee plans configured for this class</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                        <span className="font-semibold">Total Amount</span>
                                        <span className="text-2xl font-bold text-primary">৳{totalInvoiceAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </ScrollArea>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
                                <Button variant="hero" onClick={handleCreateInvoice} disabled={saving}>
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : 'Create Invoice'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Due</p>
                                    <p className="text-2xl font-bold">৳{stats.totalDue.toFixed(2)}</p>
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
                                    <p className="text-sm text-muted-foreground">Total Paid</p>
                                    <p className="text-2xl font-bold">৳{stats.totalPaid.toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Students</p>
                                    <p className="text-2xl font-bold">{stats.totalStudents}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
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
                        <div className="grid gap-4 md:grid-cols-4">
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
                                    options={sectionOptions}
                                    value={filterSection}
                                    onValueChange={setFilterSection}
                                    placeholder="All sections..."
                                    disabled={filterClass === 'all' || sections.length === 0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <SearchableSelect
                                    options={statusOptions}
                                    value={filterStatus}
                                    onValueChange={setFilterStatus}
                                    placeholder="All status..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Invoices Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>{invoices.length} Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice No</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-mono">{invoice.invoice_no}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{invoice.students?.name_en}</div>
                                            <div className="text-xs text-muted-foreground">{invoice.students?.student_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            {invoice.classes?.name}
                                            {invoice.sections && ` - ${invoice.sections.name}`}
                                        </TableCell>
                                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-semibold">৳{parseFloat(invoice.total_amount).toFixed(2)}</TableCell>
                                        <TableCell className="text-green-600 font-semibold">৳{parseFloat(invoice.paid_amount).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                invoice.status === 'paid' ? 'default' :
                                                    invoice.status === 'partial' ? 'secondary' : 'destructive'
                                            }>
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {invoice.status !== 'paid' && (
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setPaymentAmount((parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount)).toString());
                                                            setPaymentDialogOpen(true);
                                                        }}>
                                                            <CreditCard className="w-4 h-4 mr-2" />
                                                            Record Payment
                                                        </DropdownMenuItem>
                                                    )}
                                                    {parseFloat(invoice.paid_amount) > 0 && (
                                                        <DropdownMenuItem onClick={() => handleReprintReceipt(invoice)}>
                                                            <Printer className="w-4 h-4 mr-2" />
                                                            Print Receipt
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>Record a payment for invoice {selectedInvoice?.invoice_no}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Amount:</span>
                                <span className="font-semibold">৳{selectedInvoice && parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Already Paid:</span>
                                <span className="font-semibold text-green-600">৳{selectedInvoice && parseFloat(selectedInvoice.paid_amount).toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="font-semibold">Due Amount:</span>
                                <span className="text-lg font-bold text-red-600">
                  ৳{selectedInvoice && (parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.paid_amount)).toFixed(2)}
                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Amount *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter amount"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Method *</Label>
                            <SearchableSelect
                                options={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'bank', label: 'Bank Transfer' },
                                    { value: 'bkash', label: 'bKash' },
                                    { value: 'nagad', label: 'Nagad' },
                                    { value: 'rocket', label: 'Rocket' }
                                ]}
                                value={paymentMethod}
                                onValueChange={setPaymentMethod}
                                placeholder="Select method..."
                            />
                        </div>

                        {paymentMethod !== 'cash' && (
                            <div className="space-y-2">
                                <Label>Transaction ID</Label>
                                <Input
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    placeholder="Enter transaction ID"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                        <Button variant="hero" onClick={handleRecordPayment} disabled={saving}>
                            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : 'Record Payment'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}