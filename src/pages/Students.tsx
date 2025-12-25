import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockStudents, classes } from '@/data/mockData';
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  IdCard,
  Trash2,
  Phone,
} from 'lucide-react';

export default function Students() {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = 
      student.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardian?.fatherMobile.includes(searchQuery);
    
    const matchesClass = classFilter === 'all' || student.classId === classFilter;
    const matchesFee = feeFilter === 'all' || student.feeStatus === feeFilter;

    return matchesSearch && matchesClass && matchesFee;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground mt-1">
              Manage all {mockStudents.length} students in your school
            </p>
          </div>
          <Link to="/admission">
            <Button variant="hero" className="gap-2">
              <Plus className="w-4 h-4" />
              New Admission
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fee Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="due">Due</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Students Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12"></TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Fee Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, index) => (
                <TableRow
                  key={student.id}
                  className="table-row-interactive"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={student.photoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getInitials(student.nameEn)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{student.nameEn}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-foreground">{student.className}</span>
                    <span className="text-muted-foreground"> • {student.sectionName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-foreground">{student.roll}</span>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{student.guardian?.fatherName}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="font-mono text-sm">{student.guardian?.fatherMobile}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.feeStatus as 'paid' | 'partial' | 'due'}>
                      {student.feeStatus === 'paid' && 'Paid'}
                      {student.feeStatus === 'partial' && `৳${student.pendingAmount}`}
                      {student.feeStatus === 'due' && `৳${student.pendingAmount}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <IdCard className="w-4 h-4 mr-2" />
                          ID Card
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No students found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-between text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p>Showing {filteredStudents.length} of {mockStudents.length} students</p>
        </div>
      </div>
    </MainLayout>
  );
}
