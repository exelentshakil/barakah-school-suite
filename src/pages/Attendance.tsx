import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClasses, useSections } from '@/hooks/useStudents';
import { useStudentsForAttendance, useAttendance, useMarkAttendance, useAttendanceStats } from '@/hooks/useAttendance';
import {
  CalendarCheck,
  Check,
  X,
  Clock,
  Calendar,
  Save,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export default function Attendance() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  
  const { data: classes } = useClasses();
  const { data: sections } = useSections(selectedClass);
  const { data: students, isLoading: loadingStudents } = useStudentsForAttendance(selectedClass, selectedSection);
  const { data: existingAttendance } = useAttendance(selectedDate, selectedClass, selectedSection);
  const { data: stats } = useAttendanceStats(selectedDate);
  const markAttendance = useMarkAttendance();
  
  // Load existing attendance
  useEffect(() => {
    if (existingAttendance) {
      const map: Record<string, AttendanceStatus> = {};
      existingAttendance.forEach(a => {
        if (a.status) {
          map[a.student_id] = a.status;
        }
      });
      setAttendanceMap(map);
    }
  }, [existingAttendance]);
  
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };
  
  const handleMarkAll = (status: AttendanceStatus) => {
    if (!students) return;
    const map: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      map[s.id] = status;
    });
    setAttendanceMap(map);
  };
  
  const handleSave = () => {
    const records = Object.entries(attendanceMap).map(([student_id, status]) => ({
      student_id,
      date: selectedDate,
      status,
    }));
    markAttendance.mutate({ records });
  };
  
  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <Check className="w-4 h-4" />;
      case 'absent': return <X className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      case 'leave': return <Calendar className="w-4 h-4" />;
    }
  };
  
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-success text-success-foreground';
      case 'absent': return 'bg-destructive text-destructive-foreground';
      case 'late': return 'bg-warning text-warning-foreground';
      case 'leave': return 'bg-info text-info-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground mt-1">Mark daily student attendance</p>
          </div>
          <Button variant="hero" className="gap-2" onClick={handleSave} disabled={markAttendance.isPending}>
            <Save className="w-4 h-4" />
            Save Attendance
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-4 animate-fade-in">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-success/10">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-success">{stats.present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-warning/10">
                    <AlertCircle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">{stats.late + stats.leave}</p>
                    <p className="text-sm text-muted-foreground">Late/Leave</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sections</SelectItem>
                    {sections?.map(sec => (
                      <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')}>
                    All Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')}>
                    All Absent
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        {selectedClass && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                Mark Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : students?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No students found</p>
              ) : (
                <div className="space-y-2">
                  {students?.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-center font-mono text-muted-foreground">
                          {student.roll || index + 1}
                        </span>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.photo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {student.name_en.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.name_en}</p>
                          <p className="text-xs text-muted-foreground font-mono">{student.student_id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(['present', 'absent', 'late', 'leave'] as AttendanceStatus[]).map(status => (
                          <Button
                            key={status}
                            variant={attendanceMap[student.id] === status ? 'default' : 'outline'}
                            size="sm"
                            className={attendanceMap[student.id] === status ? getStatusColor(status) : ''}
                            onClick={() => handleStatusChange(student.id, status)}
                          >
                            {getStatusIcon(status)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedClass && (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Select a class to mark attendance</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
