import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockStudents, recentPayments } from '@/data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { Receipt, UserPlus, CalendarCheck, Bell } from 'lucide-react';

interface Activity {
  id: string;
  type: 'payment' | 'admission' | 'attendance' | 'notification';
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  iconBg: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Fee Payment Received',
    description: 'Abdullah Rahman paid ৳2,200',
    time: '5 minutes ago',
    icon: Receipt,
    iconBg: 'bg-success/10 text-success',
  },
  {
    id: '2',
    type: 'admission',
    title: 'New Admission',
    description: 'Khadija Sultana joined KG',
    time: '2 hours ago',
    icon: UserPlus,
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    id: '3',
    type: 'attendance',
    title: 'Attendance Marked',
    description: 'Class 1A - 28/30 present',
    time: '3 hours ago',
    icon: CalendarCheck,
    iconBg: 'bg-info/10 text-info',
  },
  {
    id: '4',
    type: 'notification',
    title: 'SMS Sent',
    description: '12 absence notifications sent',
    time: '4 hours ago',
    icon: Bell,
    iconBg: 'bg-warning/10 text-warning',
  },
];

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-5 border-b border-border">
        <h2 className="font-semibold text-foreground">Recent Activity</h2>
      </div>
      <div className="p-2">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`p-2 rounded-lg ${activity.iconBg}`}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{activity.title}</p>
              <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
