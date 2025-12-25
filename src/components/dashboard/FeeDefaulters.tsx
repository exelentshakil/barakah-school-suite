import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockStudents } from '@/data/mockData';
import { MessageSquare, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FeeDefaulters() {
  const defaulters = mockStudents.filter(s => s.feeStatus === 'due' || s.feeStatus === 'partial');

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Fee Defaulters</h2>
          <p className="text-sm text-muted-foreground">{defaulters.length} students with pending fees</p>
        </div>
        <Link to="/reports?tab=defaulters">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </div>
      <div className="p-2">
        {defaulters.slice(0, 5).map((student) => (
          <div
            key={student.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={student.photoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {student.nameEn.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-foreground truncate">{student.nameEn}</p>
                <Badge variant={student.feeStatus as 'due' | 'partial'}>{student.feeStatus}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {student.className} • Roll {student.roll} • ৳{student.pendingAmount?.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" title="Send SMS">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Link to={`/fees?student=${student.id}`}>
                <Button variant="ghost" size="icon-sm" title="Collect Fee">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
