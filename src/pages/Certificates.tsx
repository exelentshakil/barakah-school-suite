import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useStudents } from '@/hooks/useStudents';
import { useCertificates, useCreateCertificate } from '@/hooks/useCertificates';
import {
  Award,
  Plus,
  Search,
  Printer,
  Download,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Certificates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [certificateType, setCertificateType] = useState<'transfer' | 'character' | 'hifz'>('transfer');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: students } = useStudents();
  const { data: certificates, isLoading } = useCertificates();
  const createCertificate = useCreateCertificate();
  
  const filteredStudents = students?.filter(s =>
    s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);
  
  const handleCreate = () => {
    if (!selectedStudent) return;
    
    createCertificate.mutate({
      student_id: selectedStudent,
      type: certificateType,
      reason,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setSelectedStudent('');
        setReason('');
      },
    });
  };
  
  const getCertificateTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      'transfer': { label: 'Transfer', className: 'bg-info/10 text-info' },
      'character': { label: 'Character', className: 'bg-success/10 text-success' },
      'hifz': { label: 'Hifz', className: 'bg-primary/10 text-primary' },
    };
    const v = variants[type] || variants['transfer'];
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Certificates</h1>
            <p className="text-muted-foreground mt-1">Generate transfer, character, and Hifz certificates</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="w-4 h-4" />
                New Certificate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Certificate</DialogTitle>
                <DialogDescription>Create a new certificate for a student</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Search Student</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchQuery && filteredStudents && filteredStudents.length > 0 && (
                    <div className="border rounded-lg overflow-hidden mt-2">
                      {filteredStudents.map(student => (
                        <button
                          key={student.id}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left ${
                            selectedStudent === student.id ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => {
                            setSelectedStudent(student.id);
                            setSearchQuery(student.name_en);
                          }}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={student.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {student.name_en.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{student.name_en}</p>
                            <p className="text-xs text-muted-foreground">{student.student_id} • {student.classes?.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Certificate Type</Label>
                  <Select value={certificateType} onValueChange={(v) => setCertificateType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer Certificate (TC)</SelectItem>
                      <SelectItem value="character">Character Certificate</SelectItem>
                      <SelectItem value="hifz">Hifz Completion Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason / Notes (Optional)</Label>
                  <Textarea
                    placeholder="Enter reason for certificate..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreate} 
                  disabled={!selectedStudent || createCertificate.isPending}
                >
                  Generate Certificate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Certificates Table */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Issued Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : certificates?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No certificates issued yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates?.map(cert => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono">{cert.certificate_no}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.students?.name_en}</p>
                          <p className="text-xs text-muted-foreground">{cert.students?.student_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getCertificateTypeBadge(cert.type)}</TableCell>
                      <TableCell>
                        {cert.issue_date ? format(new Date(cert.issue_date), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {cert.reason || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
