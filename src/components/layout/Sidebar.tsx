import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  CalendarCheck,
  FileText,
  CreditCard,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  IdCard,
  Award,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('admin' | 'teacher' | 'accountant')[];
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'accountant'] },
  { title: 'Students', href: '/students', icon: Users, roles: ['admin', 'teacher'] },
  { title: 'Admission', href: '/admission', icon: GraduationCap, roles: ['admin'] },
  { title: 'Fee Collection', href: '/fees', icon: Receipt, roles: ['admin', 'accountant'] },
  { title: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin', 'teacher'] },
  { title: 'Exams & Results', href: '/exams', icon: BookOpen, roles: ['admin', 'teacher'] },
  { title: 'ID Cards', href: '/id-cards', icon: IdCard, roles: ['admin'] },
  { title: 'Certificates', href: '/certificates', icon: Award, roles: ['admin'] },
  { title: 'SMS Center', href: '/sms', icon: MessageSquare, roles: ['admin'], badge: '500' },
  { title: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'accountant'] },
  { title: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-sidebar-foreground">BarakahSoft</h1>
              <p className="text-[10px] text-sidebar-foreground/60">School Manager</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            
            const linkContent = (
              <NavLink
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-primary font-medium",
                  isActive && "shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70",
                  collapsed ? "w-5 h-5" : "w-4 h-4"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm">{item.title}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary font-medium">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                    {item.badge && <span className="ml-2 text-primary">({item.badge})</span>}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* User Info */}
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
          </div>
        )}
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={logout}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </Button>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
