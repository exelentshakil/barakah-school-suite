// FILE: src/components/layout/Sidebar.tsx - ROLE-BASED MENU
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Users, BookOpen, GraduationCap, Calendar,
    FileText, CreditCard, MessageSquare, Settings, Menu, X,
    ClipboardList, Award, IdCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MenuItem {
    title: string;
    icon: any;
    path: string;
    roles: string[]; // 'admin', 'teacher', 'accountant'
}

const MENU_ITEMS: MenuItem[] = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'teacher'] },
    { title: 'Students', icon: Users, path: '/students', roles: ['admin', 'teacher'] },
    { title: 'Admission', icon: GraduationCap, path: '/admission', roles: ['admin'] },
    { title: 'Attendance', icon: Calendar, path: '/attendance', roles: ['admin', 'teacher'] },
    { title: 'Exams', icon: BookOpen, path: '/exams', roles: ['admin', 'teacher'] },
    { title: 'Marks', icon: ClipboardList, path: '/marks', roles: ['admin', 'teacher'] },
    { title: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'teacher'] },
    { title: 'Certificates', icon: Award, path: '/certificates', roles: ['admin'] },
    { title: 'ID Cards', icon: IdCard, path: '/id-cards', roles: ['admin'] },
    { title: 'Fees', icon: CreditCard, path: '/fees', roles: ['admin', 'accountant'] },
    { title: 'SMS Center', icon: MessageSquare, path: '/sms', roles: ['admin'] },
    { title: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] }
];

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (value: boolean) => void;
    userRole: string;
}

export function Sidebar({ collapsed, setCollapsed, userRole }: SidebarProps) {
    const location = useLocation();

    const filteredMenu = MENU_ITEMS.filter(item => item.roles.includes(userRole));

    return (
        <aside className={cn(
            "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-50",
            collapsed ? "w-20" : "w-64"
        )}>
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-lg">School MS</span>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(collapsed && "mx-auto")}
                    >
                        {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </Button>
                </div>

                {/* Menu */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {filteredMenu.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                    collapsed && "justify-center",
                                    isActive
                                        ? "bg-primary text-white"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                                title={collapsed ? item.title : undefined}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span className="font-medium">{item.title}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Role Badge */}
                {!collapsed && (
                    <div className="p-4 border-t">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                userRole === 'admin' && "bg-purple-600",
                                userRole === 'teacher' && "bg-blue-600",
                                userRole === 'accountant' && "bg-green-600"
                            )} />
                            <span className="text-sm font-medium capitalize">{userRole}</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}