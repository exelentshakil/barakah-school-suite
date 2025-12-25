import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickAction } from '@/components/dashboard/QuickAction';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { FeeDefaulters } from '@/components/dashboard/FeeDefaulters';
import { dashboardStats, schoolSettings } from '@/data/mockData';
import {
  Users,
  TrendingUp,
  Receipt,
  AlertTriangle,
  CalendarCheck,
  UserPlus,
  CreditCard,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">
            Assalamu Alaikum, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back to {schoolSettings.name}. Here's what's happening today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={dashboardStats.totalStudents}
            subtitle={`+${dashboardStats.newAdmissions} this month`}
            icon={Users}
            variant="primary"
            trend={{ value: 5.2, label: 'from last month', positive: true }}
            className="animate-fade-in stagger-1"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(dashboardStats.monthlyRevenue)}
            subtitle="January 2025"
            icon={TrendingUp}
            variant="success"
            trend={{ value: 12.5, label: 'from last month', positive: true }}
            className="animate-fade-in stagger-2"
          />
          <StatCard
            title="Fee Defaulters"
            value={dashboardStats.feeDefaulters}
            subtitle={formatCurrency(dashboardStats.pendingFees) + ' pending'}
            icon={AlertTriangle}
            variant="warning"
            className="animate-fade-in stagger-3"
          />
          <StatCard
            title="Today's Attendance"
            value={`${dashboardStats.attendancePercent}%`}
            subtitle={`${dashboardStats.todayPresent} present, ${dashboardStats.todayAbsent} absent`}
            icon={CalendarCheck}
            variant="default"
            className="animate-fade-in stagger-4"
          />
        </div>

        {/* Quick Actions */}
        {user?.role === 'admin' && (
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                title="New Admission"
                description="Register a new student"
                icon={UserPlus}
                href="/admission"
                variant="primary"
              />
              <QuickAction
                title="Collect Fee"
                description="Record fee payment"
                icon={CreditCard}
                href="/fees"
                variant="gold"
              />
              <QuickAction
                title="Mark Attendance"
                description="Today's attendance"
                icon={CalendarCheck}
                href="/attendance"
              />
              <QuickAction
                title="Send SMS"
                description="Notify parents"
                icon={MessageSquare}
                href="/sms"
              />
            </div>
          </div>
        )}

        {user?.role === 'teacher' && (
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <QuickAction
                title="Mark Attendance"
                description="Today's attendance"
                icon={CalendarCheck}
                href="/attendance"
                variant="primary"
              />
              <QuickAction
                title="Enter Marks"
                description="Exam results"
                icon={BookOpen}
                href="/exams"
              />
              <QuickAction
                title="View Students"
                description="My classes"
                icon={Users}
                href="/students"
              />
            </div>
          </div>
        )}

        {user?.role === 'accountant' && (
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <QuickAction
                title="Collect Fee"
                description="Record payment"
                icon={CreditCard}
                href="/fees"
                variant="gold"
              />
              <QuickAction
                title="View Defaulters"
                description="Pending payments"
                icon={AlertTriangle}
                href="/reports?tab=defaulters"
              />
              <QuickAction
                title="Daily Report"
                description="Today's collection"
                icon={Receipt}
                href="/reports"
              />
            </div>
          </div>
        )}

        {/* Activity & Defaulters */}
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <RecentActivity />
          <FeeDefaulters />
        </div>
      </div>
    </MainLayout>
  );
}
