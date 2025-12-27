import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStudents, useClasses, useSections } from '@/hooks/useStudents';
import { useSchoolSettings } from '@/hooks/useSettings';
import {
  IdCard,
  Search,
  Printer,
  Download,
  CheckSquare,
  Square,
  GraduationCap,
} from 'lucide-react';

export default function IDCards() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  
  const { data: students } = useStudents();
  const { data: classes } = useClasses();
  const { data: sections } = useSections(selectedClass);
  const { data: schoolSettings } = useSchoolSettings();
  
  const filteredStudents = students?.filter(s => {
    const matchesSearch = !searchQuery || 
      s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || s.class_id === selectedClass;
    const matchesSection = !selectedSection || s.section_id === selectedSection;
    return matchesSearch && matchesClass && matchesSection;
  });
  
  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudents(newSet);
  };
  
  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents?.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents?.map(s => s.id)));
    }
  };
  
  const selectedStudentData = students?.filter(s => selectedStudents.has(s.id));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ID Cards</h1>
            <p className="text-muted-foreground mt-1">Generate and print student ID cards</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" disabled={selectedStudents.size === 0}>
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="hero" className="gap-2" disabled={selectedStudents.size === 0}>
              <Printer className="w-4 h-4" />
              Print ({selectedStudents.size})
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Student Selection */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="animate-fade-in">
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
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
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sections</SelectItem>
                      {sections?.map(sec => (
                        <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base">Select Students</CardTitle>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="gap-2">
                  {selectedStudents.size === filteredStudents?.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredStudents?.map((student, index) => (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStudents.has(student.id) 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <Checkbox checked={selectedStudents.has(student.id)} />
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={student.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {student.name_en.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{student.name_en}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.student_id} • {student.classes?.name} • Roll: {student.roll}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ID Card Preview */}
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IdCard className="w-5 h-5 text-primary" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStudentData && selectedStudentData.length > 0 ? (
                  <div className="space-y-4">
                    {selectedStudentData.slice(0, 2).map(student => (
                      <div
                        key={student.id}
                        className="w-full aspect-[1.586] rounded-xl overflow-hidden shadow-lg"
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        <div className="h-full p-4 flex flex-col text-white">
                          {/* Header */}
                          <div className="flex items-center gap-2 pb-2 border-b border-white/20">
                            <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-sm leading-tight">
                                {schoolSettings?.name || 'School Name'}
                              </p>
                              <p className="text-[10px] opacity-80">Student Identity Card</p>
                            </div>
                          </div>
                          
                          {/* Body */}
                          <div className="flex-1 flex items-center gap-3 py-3">
                            <Avatar className="w-16 h-16 border-2 border-white/30">
                              <AvatarImage src={student.photo_url || undefined} />
                              <AvatarFallback className="bg-white/20 text-white text-lg">
                                {student.name_en.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <p className="font-bold text-sm">{student.name_en}</p>
                              <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                                <p><span className="opacity-70">ID:</span> {student.student_id}</p>
                                <p><span className="opacity-70">Class:</span> {student.classes?.name}</p>
                                <p><span className="opacity-70">Roll:</span> {student.roll}</p>
                                <p><span className="opacity-70">Blood:</span> {student.blood_group || '-'}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Footer */}
                          <div className="text-center pt-2 border-t border-white/20">
                            <p className="text-[8px] opacity-70">
                              Session: {schoolSettings?.session_year || '2025-2026'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedStudentData.length > 2 && (
                      <p className="text-center text-sm text-muted-foreground">
                        +{selectedStudentData.length - 2} more cards
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <IdCard className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Select students to preview ID cards</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
