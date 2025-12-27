import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClasses } from '@/hooks/useStudents';
import { useExams, useCreateExam, useMarks, useSaveMarks, useSubjects } from '@/hooks/useExams';
import {
  BookOpen,
  Plus,
  Calendar,
  FileText,
  Edit,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Exams() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    name: '',
    type: 'mid-term' as const,
    class_id: '',
    start_date: '',
    end_date: '',
  });
  
  const { data: classes } = useClasses();
  const { data: exams, isLoading } = useExams(selectedClass || undefined);
  const { data: subjects } = useSubjects(newExam.class_id);
  const createExam = useCreateExam();
  
  const handleCreateExam = () => {
    if (!newExam.name || !newExam.class_id || !newExam.start_date) return;
    
    createExam.mutate({
      ...newExam,
      subjects: subjects?.map(s => ({ subject_name: s.name, full_marks: s.full_marks || 100 })) || [],
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewExam({ name: '', type: 'mid-term', class_id: '', start_date: '', end_date: '' });
      },
    });
  };
  
  const getExamTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      'class-test': { label: 'Class Test', className: 'bg-info/10 text-info' },
      'mid-term': { label: 'Mid Term', className: 'bg-primary/10 text-primary' },
      'final': { label: 'Final', className: 'bg-warning/10 text-warning' },
      'annual': { label: 'Annual', className: 'bg-success/10 text-success' },
    };
    const v = variants[type] || variants['mid-term'];
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exams & Results</h1>
            <p className="text-muted-foreground mt-1">Manage exams and enter student marks</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
                <DialogDescription>Set up a new examination</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Exam Name</Label>
                  <Input
                    placeholder="e.g., Mid Term Exam 2025"
                    value={newExam.name}
                    onChange={(e) => setNewExam(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newExam.type}
                      onValueChange={(v) => setNewExam(p => ({ ...p, type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class-test">Class Test</SelectItem>
                        <SelectItem value="mid-term">Mid Term</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select
                      value={newExam.class_id}
                      onValueChange={(v) => setNewExam(p => ({ ...p, class_id: v }))}
                    >
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newExam.start_date}
                      onChange={(e) => setNewExam(p => ({ ...p, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newExam.end_date}
                      onChange={(e) => setNewExam(p => ({ ...p, end_date: e.target.value }))}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateExam} disabled={createExam.isPending}>
                  Create Exam
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-48">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Classes</SelectItem>
                    {classes?.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exams List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : exams?.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No exams found. Create your first exam!</p>
              </CardContent>
            </Card>
          ) : (
            exams?.map((exam, index) => (
              <Card
                key={exam.id}
                className="hover:shadow-lg transition-shadow cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedExam(exam.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{exam.name}</CardTitle>
                      <CardDescription>{exam.classes?.name}</CardDescription>
                    </div>
                    {getExamTypeBadge(exam.type || 'mid-term')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {exam.start_date ? format(new Date(exam.start_date), 'MMM d, yyyy') : 'Not set'}
                        {exam.end_date && ` - ${format(new Date(exam.end_date), 'MMM d, yyyy')}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>{exam.exam_subjects?.length || 0} subjects</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 gap-1">
                      <Edit className="w-3 h-3" />
                      Enter Marks
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Trophy className="w-3 h-3" />
                      Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
