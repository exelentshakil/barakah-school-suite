// FILE: src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
    Maximize, Minimize, Activity, TrendingUp, Users, DollarSign,
    Zap, ArrowUpRight, ArrowDownRight, Wallet, Loader2, Signal, WifiOff,
    CalendarClock, Briefcase
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {useNavigate} from "react-router-dom";

// --- HOOKS ---
const useLocalStorage = (key: string, initialValue: any) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });
    const setValue = (value: any) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.log(error);
        }
    };
    return [storedValue, setValue];
};

const COLORS = {
    primary: '#3b82f6',
    purple: '#8b5cf6',
};

export default function Dashboard() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    const [realtimeMode, setRealtimeMode] = useLocalStorage('dash_realtime', true);
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [monthlyTarget, setMonthlyTarget] = useState(3500000); // Default, updates from DB
    const [dynamicTarget, setDynamicTarget] = useState(0);

    // Data States
    const [kpi, setKpi] = useState({
        revenue: 0, revenueGrowth: 0,
        students: 0, activeStudents: 0,
        attendance: 0,
        cashflow: 0
    });
    const [charts, setCharts] = useState<any>({
        revenueTrend: [],
        attendanceTrend: [],
    });
    const [feed, setFeed] = useState<any[]>([]);
    const [financials, setFinancials] = useState({
        dueNext7Days: 0,
        pendingInvoicesCount: 0
    });

    // --- FIX: FULL SCREEN SYNC ---
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // --- DATA LOADERS ---
    const loadFinancials = async () => {
        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();

        // 1. Revenue This Month (Cash Flow)
        const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .gte('created_at', startOfMonth);

        const currentRev = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // 2. Revenue Last Month (for growth calc)
        const startOfLastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1).toISOString();
        const { data: lastPayments } = await supabase
            .from('payments')
            .select('amount')
            .gte('created_at', startOfLastMonth)
            .lt('created_at', startOfMonth);

        const lastRev = lastPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const growth = lastRev > 0 ? ((currentRev - lastRev) / lastRev) * 100 : 100;

        // 3. Chart Data
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

            const { data } = await supabase.from('payments').select('amount').gte('created_at', start).lt('created_at', end);
            months.push({
                name: d.toLocaleDateString('en-US', { month: 'short' }),
                value: data?.reduce((s, p) => s + Number(p.amount), 0) || 0
            });
        }

        // --- NEW: SMART DYNAMIC TARGET LOGIC ---

        // A. Calculate Recurring Potential (Based on Active Students & Monthly Plans)
        const { data: activeStudents } = await supabase.from('students').select('class_id, section_id').eq('status', 'active');
        const { data: monthlyPlans } = await supabase
            .from('fee_plans')
            .select('amount, class_id, section_id, fee_heads!inner(type)')
            .eq('fee_heads.type', 'monthly');

        let recurringPotential = 0;
        if (activeStudents && monthlyPlans) {
            recurringPotential = activeStudents.reduce((total, student) => {
                const studentFees = monthlyPlans.reduce((sum, plan) => {
                    const classMatch = plan.class_id === student.class_id;
                    const sectionMatch = plan.section_id === null || plan.section_id === student.section_id;
                    return (classMatch && sectionMatch) ? sum + Number(plan.amount) : sum;
                }, 0);
                return total + studentFees;
            }, 0);
        }

        // B. Calculate Actual Demand (Total Invoices Created This Month)
        // This catches non-monthly fees (Exams, Admission, etc.)
        const { data: currentMonthInvoices } = await supabase
            .from('invoices')
            .select('total_amount')
            .gte('invoice_date', startOfMonth);

        const totalInvoiced = currentMonthInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

        // C. The "Smart Target" is whichever is higher.
        // If invoices generated > recurring potential, use invoices. Otherwise, use potential.
        // Also ensure Target is at least equal to Revenue (handles past-due collections boosting revenue)
        let finalTarget = Math.max(recurringPotential, totalInvoiced);
        if (currentRev > finalTarget) finalTarget = currentRev; // Prevents > 100% visual glitch

        setDynamicTarget(finalTarget);

        // --- END SMART TARGET ---

        // 4. Forecast Data (Due Next 7 Days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const today = new Date().toISOString();

        const { data: dueInvoices } = await supabase
            .from('invoices')
            .select('total, paid_amount, student_id')
            .lte('due_date', nextWeek.toISOString())
            .neq('status', 'paid');

        const dueAmount = dueInvoices?.reduce((sum, i) => sum + (Number(i.total) - Number(i.paid_amount || 0)), 0) || 0;
        const uniqueStudentIds = new Set(dueInvoices?.map(i => i.student_id)).size;

        setKpi(prev => ({ ...prev, revenue: currentRev, revenueGrowth: growth, cashflow: currentRev * 0.45 }));
        setCharts(prev => ({ ...prev, revenueTrend: months }));
        setFinancials(prev => ({ ...prev, dueNext7Days: dueAmount, pendingInvoicesCount: uniqueStudentIds }));
    };

    const navigate = useNavigate();
    const loadAcademics = async () => {
        const { count: total } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { count: active } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active');

        const today = new Date().toISOString().split('T')[0];
        const { data: att } = await supabase.from('attendance').select('status').eq('date', today);
        const present = att?.filter(a => a.status === 'present').length || 0;
        const rate = active ? (present / active) * 100 : 0;

        const trend = [];
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const { data } = await supabase.from('attendance').select('status').eq('date', dStr);
            const p = data?.filter(a => a.status === 'present').length || 0;
            trend.push({ day: d.toLocaleDateString('en-US', {weekday: 'short'}), rate: active ? (p/active)*100 : 0 });
        }

        setKpi(prev => ({ ...prev, students: total || 0, activeStudents: active || 0, attendance: rate }));
        setCharts(prev => ({ ...prev, attendanceTrend: trend }));
    };

    const loadActivityFeed = async () => {
        const { data: payments } = await supabase
            .from('payments')
            .select('amount, created_at, invoices(students(name_en))')
            .order('created_at', { ascending: false })
            .limit(10);

        const formatted = payments?.map(p => ({
            type: 'money',
            title: `Received ৳${p.amount}`,
            desc: p.invoices?.students?.name_en || 'Unknown Student',
            time: new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        })) || [];
        setFeed(formatted);
    };

    const loadSettings = async () => {
        const { data } = await supabase.from('school_settings').select('monthly_target').single();
        if (data?.monthly_target) setMonthlyTarget(Number(data.monthly_target));
    };

    // --- REALTIME SUBSCRIPTION ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([loadSettings(), loadFinancials(), loadAcademics(), loadActivityFeed()]);
            setLoading(false);
        };
        init();

        if (!realtimeMode) { setRealtimeStatus('disconnected'); return; }
        setRealtimeStatus('connecting');

        const channel = supabase.channel('dashboard-main-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                toast({ title: "💰 New Payment", className: "bg-green-50 border-green-200" });
                loadFinancials(); loadActivityFeed();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
                loadAcademics();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
                else setRealtimeStatus('disconnected');
            });

        return () => { supabase.removeChannel(channel); };
    }, [realtimeMode]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(val);

    const DashboardContent = () => (
        <div className={`space-y-4 ${isFullScreen ? 'p-6 bg-slate-50 min-h-screen' : ''}`}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-blue-600">
                            Principal's Overview
                        </h1>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}</span>
                            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                            {realtimeStatus === 'connected' ?
                                <span className="flex items-center text-green-600 gap-1 font-medium bg-green-50 px-2 py-0.5 rounded-full"><Signal className="w-3 h-3 animate-pulse" /> Live</span> :
                                <span className="flex items-center text-orange-600 gap-1 font-medium bg-orange-50 px-2 py-0.5 rounded-full"><WifiOff className="w-3 h-3" /> Offline</span>
                            }
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 relative">
                        <Switch checked={realtimeMode} onCheckedChange={setRealtimeMode} id="rt-mode" />
                        <Label htmlFor="rt-mode" className="text-xs font-medium cursor-pointer">Live</Label>
                    </div>
                    <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="hover:bg-slate-100">
                        {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            {/* KPI BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue */}
                <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="w-24 h-24 text-blue-600" />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                                <h3 className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(kpi.revenue)}</h3>
                            </div>
                            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-bold ${kpi.revenueGrowth >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                {kpi.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1"/> : <ArrowDownRight className="w-3 h-3 mr-1"/>}
                                {Math.abs(kpi.revenueGrowth).toFixed(0)}%
                            </div>
                        </div>
                        {/* The New Progress Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Collected</span>
                                <span className="font-medium text-slate-600">
                                    {dynamicTarget > 0 ? ((kpi.revenue / dynamicTarget) * 100).toFixed(0) : 0}% of Potential
                                </span>
                            </div>
                            <Progress value={(kpi.revenue / dynamicTarget) * 100} className="h-2" />
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                <span>0</span>
                                {/* Shows the calculated potential revenue instead of static goal */}
                                <span>Potential: {formatCurrency(dynamicTarget)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance */}
                <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group overflow-hidden relative">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users className="w-24 h-24 text-purple-600" />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Attendance Today</p>
                                <h3 className="text-3xl font-bold text-slate-800 mt-1">{kpi.attendance.toFixed(1)}%</h3>
                            </div>
                            <Badge variant="outline" className={`${kpi.attendance < 80 ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'} border-transparent`}>
                                {kpi.activeStudents} Active
                            </Badge>
                        </div>
                        <Progress value={kpi.attendance} className={`h-1.5 bg-slate-100 [&>*]:${kpi.attendance < 75 ? 'bg-red-500' : 'bg-purple-500'}`} />
                        <p className="text-xs text-muted-foreground mt-2">
                            {kpi.attendance < 75 ? '⚠️ Below standard' : '✨ Excellent turnout'}
                        </p>
                    </CardContent>
                </Card>

                {/* Net Profit */}
                <Card className="border-0 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-medium">Net Operating Cash</span>
                            </div>
                            <h3 className="text-3xl font-bold">{formatCurrency(kpi.cashflow)}</h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs opacity-60">
                            <span>Estimated Margin: ~45%</span>
                            <span>Stable</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-6 grid grid-cols-1 gap-3 h-full content-center">
                        <Button onClick={ () => navigate('/sms') } className="w-full justify-between bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 shadow-none h-12" variant="outline">
                            Send Urgent SMS <Zap className="w-4 h-4" />
                        </Button>
                        <Button onClick={ () => navigate('/fees') }className="w-full justify-between bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0 shadow-none h-12" variant="outline">
                            Record Fee Payment <DollarSign className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row - COMPACT MODE (Reduced Height) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[300px]">
                {/* Main Graph */}
                <Card className="lg:col-span-2 border-0 shadow-md">
                    <CardHeader className="pb-0 pt-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="w-4 h-4 text-blue-500" /> Revenue Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts.revenueTrend}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `${val/1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                                />
                                <Area type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Live Feed */}
                <Card className="border-0 shadow-md flex flex-col overflow-hidden">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-2 pt-3 px-4">
                        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Activity className="w-3 h-3 text-orange-500" /> Live Transactions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative">
                        <ScrollArea className="h-[200px]">
                            {feed.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2 opacity-20" />
                                    <p className="text-xs">Waiting for live data...</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {feed.map((item, i) => (
                                        <div key={i} className="px-4 py-2 hover:bg-slate-50 transition-colors flex gap-3 items-center animate-in slide-in-from-right-2 duration-300">
                                            <div className="bg-green-100 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                                                <DollarSign className="w-3 h-3 text-green-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                                {item.time}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row - Attendance & Forecast */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Attendance Radar */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <CalendarClock className="w-4 h-4" /> 7-Day Attendance Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.attendanceTrend} barGap={0}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={5} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', fontSize: '12px'}} />
                                <Bar dataKey="rate" fill={COLORS.purple} radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Financial Forecast */}
                <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Total Outstanding Dues
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 mb-3">
                            <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(financials.dueNext7Days)}</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Students with Pending Invoices</span>
                                <span className="font-semibold">{financials.pendingInvoicesCount} Students</span>
                            </div>
                            <Progress value={60} className="h-1.5 bg-indigo-200 [&>*]:bg-indigo-600" />
                            <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-100/50 p-2 rounded-lg border border-indigo-100">
                                <Zap className="w-3 h-3 flex-shrink-0" />
                                <span>Action: Send bulk SMS to these {financials.pendingInvoicesCount} students.</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return isFullScreen ? (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-auto animate-in fade-in duration-300">
            {loading ? (
                <div className="h-screen w-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : <div className="container mx-auto p-4 max-w-[1600px]"><DashboardContent /></div>}
        </div>
    ) : (
        <MainLayout>
            {loading ? (
                <div className="h-96 w-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : <DashboardContent />}
        </MainLayout>
    );
}