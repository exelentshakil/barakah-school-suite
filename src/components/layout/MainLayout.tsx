// FILE: src/components/layout/MainLayout.tsx - COMPLETE WITH SEARCH & NOTIFICATIONS
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Calendar,
    ClipboardList,
    DollarSign,
    FileText,
    Award,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Bell,
    Search,
    TrendingUp,
    BookOpen,
    UserCog,
    User,
    CreditCard,
    Building2,
    AlertCircle,
    CheckCircle,
    Clock,
    Loader2, IdCard
} from 'lucide-react';

interface MainLayoutProps {
    children: React.ReactNode;
}

interface SearchResult {
    type: 'student' | 'teacher' | 'class' | 'invoice';
    id: string;
    title: string;
    subtitle: string;
    href: string;
    icon: any;
}

interface Notification {
    id: string;
    type: 'payment' | 'absence' | 'exam' | 'general';
    title: string;
    message: string;
    time: string;
    read: boolean;
    icon: any;
    color: string;
}

const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['admin', 'teacher'] },
    { label: 'Students', icon: Users, href: '/students', roles: ['admin', 'teacher'] },
    { label: 'Admission', icon: GraduationCap, href: '/admission', roles: ['admin'] },
    { label: 'Attendance', icon: Calendar, href: '/attendance', roles: ['admin', 'teacher'] },
    { label: 'Exams', icon: BookOpen, href: '/exams', roles: ['admin', 'teacher'] },
    { label: 'Reports', icon: FileText, href: '/reports', roles: ['admin', 'teacher'] },
    { label: 'Certificates', icon: Award, href: '/certificates', roles: ['admin'] },
    { label: 'ID Cards', icon: IdCard, href: '/id-cards', roles: ['admin'] },
    { label: 'Fees', icon: CreditCard, href: '/fees', roles: ['admin', 'accountant'] },
    { label: 'SMS Center', icon: MessageSquare, href: '/sms', roles: ['admin'] },
    { label: 'Settings', icon: Settings, href: '/settings', roles: ['admin'] }
];



export function MainLayout({ children }: MainLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Search
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    // Notifications
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        // Save notification read states to localStorage
        const readStates = notifications.reduce((acc, notif) => {
            acc[notif.id] = notif.read;
            return acc;
        }, {} as Record<string, boolean>);
        localStorage.setItem('notification_read_states', JSON.stringify(readStates));
    }, [notifications]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            performSearch();
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleSignOut = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (href: string) => location.pathname === href;

    const performSearch = async () => {
        setSearching(true);
        const results: SearchResult[] = [];

        try {
            // Search Students
            const { data: students } = await supabase
                .from('students')
                .select('id, student_id, name_en, classes(name)')
                .or(`name_en.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`)
                .limit(5);

            students?.forEach(s => {
                results.push({
                    type: 'student',
                    id: s.id,
                    title: s.name_en,
                    subtitle: `${s.student_id} • ${s.classes?.name || 'N/A'}`,
                    href: `/students/${s.id}`,
                    icon: Users
                });
            });

            // Search Teachers
            const { data: teachers } = await supabase
                .from('teachers')
                .select('id, name, subject')
                .ilike('name', `%${searchQuery}%`)
                .limit(3);

            teachers?.forEach(t => {
                results.push({
                    type: 'teacher',
                    id: t.id,
                    title: t.name,
                    subtitle: t.subject || 'Teacher',
                    href: `/teachers/${t.id}`,
                    icon: GraduationCap
                });
            });

            // Search Classes
            const { data: classes } = await supabase
                .from('classes')
                .select('id, name')
                .ilike('name', `%${searchQuery}%`)
                .limit(3);

            classes?.forEach(c => {
                results.push({
                    type: 'class',
                    id: c.id,
                    title: c.name,
                    subtitle: 'Class',
                    href: `/classes/${c.id}`,
                    icon: BookOpen
                });
            });

            // Search Invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id, invoice_no, total, students(name_en)')
                .ilike('invoice_no', `%${searchQuery}%`)
                .limit(3);

            invoices?.forEach(i => {
                results.push({
                    type: 'invoice',
                    id: i.id,
                    title: i.invoice_no,
                    subtitle: `${i.students?.name_en} • ৳${i.total}`,
                    href: `/fees`,
                    icon: CreditCard
                });
            });

            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const loadNotifications = async () => {
        setLoadingNotifications(true);
        const notifications: Notification[] = [];

        try {
            // Load saved read states
            const savedStates = localStorage.getItem('notification_read_states');
            const readStates = savedStates ? JSON.parse(savedStates) : {};

            // Recent Payments
            const { data: payments } = await supabase
                .from('payments')
                .select('amount, created_at, invoices(students(name_en))')
                .order('created_at', { ascending: false })
                .limit(3);

            payments?.forEach(p => {
                const id = `payment-${p.created_at}`;
                notifications.push({
                    id,
                    type: 'payment',
                    title: 'Payment Received',
                    message: `৳${p.amount} from ${p.invoices?.students?.name_en}`,
                    time: getRelativeTime(p.created_at),
                    read: readStates[id] || false,
                    icon: CheckCircle,
                    color: 'text-green-600'
                });
            });

            // Today's Absences
            const today = new Date().toISOString().split('T')[0];
            const { data: absences } = await supabase
                .from('attendance')
                .select('students(name_en)')
                .eq('date', today)
                .eq('status', 'absent')
                .limit(3);

            if (absences && absences.length > 0) {
                const id = `absence-${today}`;
                notifications.push({
                    id,
                    type: 'absence',
                    title: 'Absent Students',
                    message: `${absences.length} students absent today`,
                    time: 'Today',
                    read: readStates[id] || false,
                    icon: AlertCircle,
                    color: 'text-red-600'
                });
            }

            // Upcoming Exams
            const { data: exams } = await supabase
                .from('exams')
                .select('name, start_date')
                .gte('start_date', new Date().toISOString().split('T')[0])
                .order('start_date')
                .limit(2);

            exams?.forEach(e => {
                const id = `exam-${e.start_date}`;
                notifications.push({
                    id,
                    type: 'exam',
                    title: 'Upcoming Exam',
                    message: `${e.name} on ${new Date(e.start_date).toLocaleDateString('en-GB')}`,
                    time: getRelativeTime(e.start_date),
                    read: readStates[id] || false,
                    icon: Clock,
                    color: 'text-blue-600'
                });
            });

            // SMS Balance Warning
            const { data: smsCredits } = await supabase
                .from('sms_credits')
                .select('balance')
                .single();

            if (smsCredits && smsCredits.balance < 100) {
                const id = 'sms-low';
                notifications.unshift({
                    id,
                    type: 'general',
                    title: 'Low SMS Balance',
                    message: `Only ${smsCredits.balance} SMS credits remaining`,
                    time: 'Now',
                    read: readStates[id] || false,
                    icon: AlertCircle,
                    color: 'text-orange-600'
                });
            }

            setNotifications(notifications);
        } catch (error) {
            console.error('Notification error:', error);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const getRelativeTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB');
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                    <h1 className="text-lg font-bold">School Manager</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
                        <Search className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        onClick={() => setNotificationsOpen(true)}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                                {unreadCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full bg-white border-r transition-all duration-300 z-40",
                    "flex flex-col",
                    collapsed ? "lg:w-20" : "lg:w-64",
                    mobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full",
                    "lg:translate-x-0"
                )}
            >
                <div className={cn(
                    "h-16 border-b flex items-center transition-all duration-300",
                    collapsed ? "lg:justify-center lg:px-2" : "px-6"
                )}>
                    {!collapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-none">BarakahSoft</h1>
                                <p className="text-xs text-muted-foreground">School Management</p>
                            </div>
                        </div>
                    )}
                    {collapsed && (
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "hidden lg:flex absolute -right-3 top-20 h-6 w-6 rounded-full border bg-white shadow-md",
                        "hover:bg-gray-100 z-50"
                    )}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>

                <ScrollArea className="flex-1 py-4">
                    <nav className="space-y-1 px-3">
                        {filteredMenu.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                        "hover:bg-gray-100",
                                        active && "bg-primary text-white hover:bg-primary/90",
                                        collapsed && "lg:justify-center lg:px-0"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-5 h-5 flex-shrink-0",
                                        active ? "text-white" : "text-gray-600"
                                    )} />
                                    {!collapsed && (
                                        <span className={cn(
                                            "font-medium text-sm",
                                            active ? "text-white" : "text-gray-700"
                                        )}>
                      {item.label}
                    </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </ScrollArea>

                <div className={cn("border-t p-3", collapsed && "lg:flex lg:justify-center")}>
                    {!collapsed ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-white text-xs">
                                        {user?.email?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">Admin</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleSignOut}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={handleSignOut} className="w-10 h-10">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </aside>

            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />
            )}

            {/* Main Content */}
            <main className={cn("transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64", "pt-16 lg:pt-0")}>
                {/* Desktop Header */}
                <div className="hidden lg:flex h-16 bg-white border-b items-center justify-between px-6">
                    <div className="flex items-center gap-4 flex-1 max-w-xl relative">
                        <Search className="w-5 h-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search students, fees, exams..."
                            className="border-none focus-visible:ring-0 shadow-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchOpen(true)}
                        />
                        {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3" />}
                    </div>
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    <span>Notifications</span>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <Badge variant="secondary">{unreadCount} new</Badge>
                                        )}
                                        {unreadCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={markAllAsRead}
                                            >
                                                Mark all read
                                            </Button>
                                        )}
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[400px]">
                                    {loadingNotifications ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map((notif) => {
                                            const Icon = notif.icon;
                                            return (
                                                <DropdownMenuItem key={notif.id} className={cn(
                                                    "p-3 cursor-pointer",
                                                    !notif.read && "bg-blue-50"
                                                )}>
                                                    <div className="flex gap-3 w-full">
                                                        <Icon className={cn("w-5 h-5 flex-shrink-0", notif.color)} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium">{notif.title}</p>
                                                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                                                        </div>
                                                        {!notif.read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </ScrollArea>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="justify-center text-primary" onClick={loadNotifications}>
                                    Refresh Notifications
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="h-8 w-px bg-gray-200" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-primary text-white text-sm">
                                            {user?.email?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">Admin</p>
                                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/settings')}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="p-6">{children}</div>
            </main>

            {/* Search Dialog */}
            <Dialog open={searchOpen && searchQuery.length >= 2} onOpenChange={(open) => {
                setSearchOpen(open);
                if (!open) setSearchQuery('');
            }}>
                <DialogContent className="max-w-2xl max-h-[600px]">
                    <DialogHeader>
                        <DialogTitle>Search Results</DialogTitle>
                        <DialogDescription>
                            {searchResults.length} results for "{searchQuery}"
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2">
                            {searchResults.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No results found
                                </div>
                            ) : (
                                searchResults.map((result) => {
                                    const Icon = result.icon;
                                    return (
                                        <button
                                            key={result.id}
                                            onClick={() => {
                                                navigate(result.href);
                                                setSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-left transition-colors"
                                        >
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{result.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">{result.type}</Badge>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Mobile Notifications Dialog */}
            <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Notifications</span>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={markAllAsRead}
                                    >
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                            {notifications.map((notif) => {
                                const Icon = notif.icon;
                                return (
                                    <div key={notif.id} className={cn(
                                        "flex gap-3 p-3 rounded-lg hover:bg-gray-50",
                                        !notif.read && "bg-blue-50"
                                    )}>
                                        <Icon className={cn("w-5 h-5 flex-shrink-0", notif.color)} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{notif.title}</p>
                                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}