import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, TrendingDown, Plus, FileText,
    Calendar, Search, Filter, Download, Wallet, CreditCard,
    ArrowUpRight, ArrowDownRight, Users, Calculator, AlertCircle,
    Trash2, Edit, Save, X, MoreHorizontal, CheckCircle,
    ChevronDown, Printer, Building2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from "@/components/layout/MainLayout.tsx";

// --- CONSTANTS & CONFIG ---

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const CURRENCY_FORMAT = new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

// --- TYPES ---

interface Expense {
    id: string;
    expense_no: string;
    category_id: string;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    category?: { name: string };
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    invoice_id: string;
    invoice?: { invoice_no: string; student_id: string; student?: { name_en: string } };
    remarks?: string;
}

interface TransactionSummary {
    id: string;
    date: Date;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    method: string;
    reference?: string;
    status: string;
    originalData: Expense | Payment;
    isEditable: boolean;
}

// --- UTILITY COMPONENTS ---

const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }: any) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none ring-offset-white active:scale-95";
    const variants = {
        primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
        secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 shadow-sm",
        danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-sm",
        ghost: "hover:bg-slate-100 text-slate-600",
        outline: "border border-slate-200 hover:bg-slate-100 text-slate-900"
    };
    const sizes = {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2",
        icon: "h-9 w-9"
    };
    return (
        <button className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' }) => {
    const styles = {
        default: "bg-slate-100 text-slate-800",
        success: "bg-emerald-100 text-emerald-800 border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border-amber-200",
        danger: "bg-rose-100 text-rose-800 border-rose-200",
        outline: "border border-slate-200 text-slate-600"
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>
            {children}
        </span>
    );
};

// --- MAIN PAGE ---

export default function AccountingPage() {
    // --- STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');

    // Filters
    const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'this_year'>('this_month');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [filterCategory, setFilterCategory] = useState('all');

    // Data
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

    // UI State
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [toasts, setToasts] = useState<{id: number, title: string, desc: string, type: 'success' | 'error'}[]>([]);

    // Edit/Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        category_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'cash',
        status: 'approved'
    });

    // --- UTILS ---

    const addToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, desc, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const handlePrint = () => {
        window.print();
    };

    const exportToCSV = () => {
        const headers = ["Date", "Type", "Category", "Description", "Reference", "Amount", "Method", "Status"];
        const rows = stats.transactions.map(t => [
            t.date.toLocaleDateString(),
            t.type,
            t.category,
            `"${t.description.replace(/"/g, '""')}"`,
            t.reference || '-',
            t.amount,
            t.method,
            t.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `financial_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast("Export Ready", "The CSV file has been downloaded successfully.");
    };

    // --- DATA FETCHING ---

    const fetchFinancials = async () => {
        setIsLoading(true);
        try {
            if (!supabase) throw new Error("No connection");

            const [catRes, expRes, payRes] = await Promise.all([
                supabase.from('expense_categories').select('*'),
                supabase.from('expenses').select(`*, category:expense_categories(name)`).order('date', { ascending: false }),
                supabase.from('payments').select(`*, invoice:invoices(invoice_no, student:students(name_en))`).order('payment_date', { ascending: false })
            ]);

            if (catRes.error) throw catRes.error;
            if (expRes.error) throw expRes.error;
            if (payRes.error) throw payRes.error;

            setCategories(catRes.data || []);
            setExpenses(expRes.data as any || []);
            setPayments(payRes.data as any || []);

        } catch (error) {
            console.log("Using Mock Data (Dev Mode)");
            setCategories([
                { id: '1', name: 'Salaries' }, { id: '2', name: 'Utilities' }, { id: '3', name: 'Rent' },
                { id: '4', name: 'Maintenance' }, { id: '5', name: 'Software' }
            ]);
            // Mock data strictly for dev fallback
            if (expenses.length === 0) {
                setExpenses([
                    { id: '1', expense_no: 'EXP-101', category_id: '1', amount: 150000, date: '2025-12-01', description: 'Staff Salaries', payment_method: 'bank', status: 'approved', created_at: '', category: { name: 'Salaries' } },
                    { id: '2', expense_no: 'EXP-102', category_id: '2', amount: 12000, date: '2025-12-05', description: 'Electric Bill', payment_method: 'bkash', status: 'approved', created_at: '', category: { name: 'Utilities' } },
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchFinancials(); }, []);

    // --- CRUD ACTIONS ---

    const handleOpenModal = (expense?: Expense) => {
        if (expense) {
            setEditingId(expense.id);
            setFormData({
                category_id: expense.category_id,
                amount: expense.amount.toString(),
                date: expense.date,
                description: expense.description,
                payment_method: expense.payment_method,
                status: expense.status
            });
        } else {
            setEditingId(null);
            setFormData({ category_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', payment_method: 'cash', status: 'approved' });
        }
        setIsExpenseModalOpen(true);
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (supabase) {
                if (editingId) {
                    // Update
                    const { error } = await supabase.from('expenses').update({
                        ...formData,
                        amount: parseFloat(formData.amount)
                    }).eq('id', editingId);
                    if (error) throw error;
                    addToast("Expense Updated", "Record updated successfully.");
                } else {
                    // Create
                    const { error } = await supabase.from('expenses').insert({
                        ...formData,
                        amount: parseFloat(formData.amount),
                        expense_no: `EXP-${Date.now().toString().slice(-6)}`,
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    });
                    if (error) throw error;
                    addToast("Expense Recorded", "New expense saved successfully.");
                }
            } else {
                // Mock Logic
                if (editingId) {
                    setExpenses(prev => prev.map(ex => ex.id === editingId ? { ...ex, ...formData, amount: parseFloat(formData.amount) } as any : ex));
                } else {
                    const newExp = {
                        ...formData,
                        id: Date.now().toString(),
                        amount: parseFloat(formData.amount),
                        expense_no: `EXP-MOCK`,
                        category: categories.find(c => c.id === formData.category_id)
                    };
                    setExpenses(prev => [newExp as any, ...prev]);
                }
                addToast("Success (Mock)", "Operation successful");
            }

            setIsExpenseModalOpen(false);
            fetchFinancials(); // Refresh data!

        } catch (error: any) {
            addToast("Error", error.message, "error");
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Are you sure you want to delete this expense record?")) return;

        try {
            if (supabase) {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (error) throw error;
            } else {
                setExpenses(prev => prev.filter(e => e.id !== id));
            }
            addToast("Deleted", "Expense record removed.");
            fetchFinancials();
        } catch (error: any) {
            addToast("Error", error.message, "error");
        }
    };

    // --- ANALYTICS ENGINE ---

    const stats = useMemo(() => {
        // 1. Combine Data
        const allTx: TransactionSummary[] = [
            ...expenses.map(e => ({
                id: e.id, date: new Date(e.date), type: 'expense' as const,
                category: e.category?.name || 'Uncategorized', description: e.description,
                amount: Number(e.amount), method: e.payment_method, reference: e.expense_no,
                status: e.status, originalData: e, isEditable: true
            })),
            ...payments.map(p => ({
                id: p.id, date: new Date(p.payment_date), type: 'income' as const,
                category: 'Tuition & Fees', description: `${p.remarks || 'Fee Payment'} - ${p.invoice?.student?.name_en || 'Student'}`,
                amount: Number(p.amount), method: p.payment_method, reference: p.invoice?.invoice_no,
                status: 'collected', originalData: p, isEditable: false
            }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime());

        // 2. Filter Logic
        const now = new Date();
        const filteredTx = allTx.filter(t => {
            // Text Search
            const matchSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.amount.toString().includes(searchQuery);

            // Date Filter
            let matchDate = true;
            if (dateRange === 'this_month') {
                matchDate = t.date.getMonth() === now.getMonth() && t.date.getFullYear() === now.getFullYear();
            } else if (dateRange === 'last_month') {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                matchDate = t.date.getMonth() === lastMonth.getMonth() && t.date.getFullYear() === lastMonth.getFullYear();
            } else if (dateRange === 'this_year') {
                matchDate = t.date.getFullYear() === now.getFullYear();
            }

            // Category & Type Filter
            const matchType = filterType === 'all' ? true : t.type === filterType;
            const matchCat = filterCategory === 'all' ? true : t.category === filterCategory;

            return matchSearch && matchDate && matchType && matchCat;
        });

        // 3. KPI Calculations
        const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        // 4. Chart Data
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleString('default', { month: 'short' });

            const monthIncome = allTx.filter(t => t.type === 'income' && t.date.getMonth() === d.getMonth() && t.date.getFullYear() === d.getFullYear()).reduce((sum,t) => sum+t.amount,0);
            const monthExpense = allTx.filter(t => t.type === 'expense' && t.date.getMonth() === d.getMonth() && t.date.getFullYear() === d.getFullYear()).reduce((sum,t) => sum+t.amount,0);

            chartData.push({ name: label, income: monthIncome, expense: monthExpense, profit: monthIncome - monthExpense });
        }

        // 5. Pie Data
        const categoryMap = new Map();
        filteredTx.filter(t => t.type === 'expense').forEach(t => {
            categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
        });
        const pieData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

        return { transactions: filteredTx, totalIncome, totalExpense, net: totalIncome - totalExpense, chartData, pieData };
    }, [expenses, payments, searchQuery, dateRange, filterType, filterCategory]);

    return (
        <MainLayout>
            <style>{`
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body * { visibility: hidden; }
                    .print-section, .print-section * { visibility: visible; }
                    .print-section { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .print-header { display: block !important; margin-bottom: 20px; }
                }
            `}</style>

            <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8 animate-in fade-in duration-500 font-sans">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Building2 size={16} /> School Business Intelligence
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as any)}
                                className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer h-10"
                            >
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                                <option value="this_year">This Year</option>
                            </select>
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        <Button variant="secondary" onClick={exportToCSV}>
                            <Download size={16} className="mr-2" /> Export
                        </Button>
                        <Button variant="primary" onClick={() => handleOpenModal()}>
                            <Plus size={18} className="mr-2" /> Record Expense
                        </Button>
                    </div>
                </div>

                {/* --- KPI STATS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between">
                            <div><p className="text-slate-500 text-sm font-medium">Income</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{CURRENCY_FORMAT.format(stats.totalIncome)}</h3></div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg h-fit"><Wallet size={20}/></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between">
                            <div><p className="text-slate-500 text-sm font-medium">Expense</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{CURRENCY_FORMAT.format(stats.totalExpense)}</h3></div>
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg h-fit"><TrendingDown size={20}/></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between">
                            <div><p className="text-slate-500 text-sm font-medium">Net Profit</p><h3 className={`text-2xl font-bold mt-1 ${stats.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{CURRENCY_FORMAT.format(stats.net)}</h3></div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg h-fit"><Calculator size={20}/></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between">
                            <div><p className="text-slate-500 text-sm font-medium">Tx Count</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.transactions.length}</h3></div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg h-fit"><FileText size={20}/></div>
                        </div>
                    </div>
                </div>

                {/* --- TABS --- */}
                <div className="border-b border-slate-200 no-print">
                    <nav className="flex space-x-8">
                        {['dashboard', 'transactions'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* --- TAB CONTENT: DASHBOARD --- */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 fade-in duration-300 no-print">
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Cash Flow Trend</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value) => CURRENCY_FORMAT.format(Number(value))} />
                                        <Legend />
                                        <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#colorIncome)" />
                                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExpense)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Expenses Breakdown</h3>
                            <div className="h-64 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {stats.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => CURRENCY_FORMAT.format(Number(value))} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                                    <span className="text-xs text-slate-400 uppercase font-bold">Total</span>
                                    <span className="text-lg font-bold text-slate-800">{stats.pieData.length} Cats</span>
                                </div>
                            </div>
                            <div className="space-y-2 mt-4">
                                {stats.pieData.slice(0,3).map((e,i) => (
                                    <div key={i} className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background: COLORS[i]}}></span>{e.name}</span><span className="font-medium">{CURRENCY_FORMAT.format(e.value)}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: TRANSACTIONS (WITH PRINT/FILTER) --- */}
                {(activeTab === 'transactions' || activeTab === 'reports') && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300 print-section">

                        {/* Hidden Print Header */}
                        <div className="hidden print-header p-6 border-b border-black">
                            <h1 className="text-2xl font-bold">Financial Statement</h1>
                            <p>Generated on: {new Date().toLocaleDateString()}</p>
                            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                                <div>Total Income: {CURRENCY_FORMAT.format(stats.totalIncome)}</div>
                                <div>Total Expense: {CURRENCY_FORMAT.format(stats.totalExpense)}</div>
                                <div>Net: {CURRENCY_FORMAT.format(stats.net)}</div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="text" placeholder="Search transactions..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                           value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <div className="relative">
                                    <Button variant={isFilterOpen ? "primary" : "outline"} size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                                        <Filter size={16} />
                                    </Button>
                                    {isFilterOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-20 animate-in fade-in zoom-in-95">
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                                                    <select className="w-full mt-1 text-sm border-slate-200 rounded-md bg-slate-50 p-1" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                                                        <option value="all">All Types</option>
                                                        <option value="income">Income Only</option>
                                                        <option value="expense">Expense Only</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
                                                    <select className="w-full mt-1 text-sm border-slate-200 rounded-md bg-slate-50 p-1" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                                        <option value="all">All Categories</option>
                                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button variant="outline" size="icon" onClick={handlePrint}>
                                    <Printer size={16} />
                                </Button>
                            </div>
                            <div className="text-sm text-slate-500">
                                Showing {stats.transactions.length} records
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Date & Ref</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 no-print text-center">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {stats.transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-slate-800">{t.date.toLocaleDateString('en-GB')}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{t.reference}</div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{t.description}</td>
                                        <td className="px-6 py-3"><Badge>{t.category}</Badge></td>
                                        <td className={`px-6 py-3 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                            {t.type === 'expense' && '- '}{CURRENCY_FORMAT.format(t.amount)}
                                        </td>
                                        <td className="px-6 py-3 text-center no-print">
                                            {t.isEditable && (
                                                <div className="flex justify-center items-center gap-1">
                                                    <button onClick={() => handleOpenModal(t.originalData as Expense)} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-md transition-colors" title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteExpense(t.id)} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                            {!t.isEditable && <span className="text-xs text-slate-300 italic">Locked</span>}
                                        </td>
                                    </tr>
                                ))}
                                {stats.transactions.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">No records found.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL --- */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setIsExpenseModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Expense' : 'Record Expense'}</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Category</label>
                                    <div className="relative">
                                        <select required className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                                            <option value="">Select...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Amount (BDT)</label>
                                    <input type="number" required min="0" className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                           value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Description</label>
                                <textarea required rows={3} className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Date</label>
                                    <input type="date" required className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                           value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Method</label>
                                    <div className="relative">
                                        <select className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                                            <option value="cash">Cash</option>
                                            <option value="bank">Bank Transfer</option>
                                            <option value="bkash">Mobile Money</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3 justify-end">
                                <Button type="button" variant="secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">{editingId ? 'Update Record' : 'Save Record'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- TOASTS --- */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-slate-200 bg-white transform transition-all animate-in slide-in-from-right w-80`}>
                        <div className={`mt-0.5 p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-900">{toast.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{toast.desc}</p>
                        </div>
                        <button onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                    </div>
                ))}
            </div>

        </MainLayout>
    );
}