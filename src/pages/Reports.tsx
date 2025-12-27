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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudents, useClasses } from '@/hooks/useStudents';
import { useInvoices, usePayments } from '@/hooks/useFees';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Users,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  const { data: students } = useStudents();
  const { data: classes } = useClasses();
  const { data: invoices } = useInvoices();
  const { data: payments } = usePayments();
  
  // Calculate stats
  const totalStudents = students?.length || 0;
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const pendingAmount = invoices?.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total || 0), 0) || 0;
  const defaultersCount = invoices?.filter(i => i.status === 'unpaid').length || 0;
  
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">Generate and export school reports</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button variant="hero" className="gap-2">
              <Download className="w-4 h-4" />
              Export All
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">৳{totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/10">
                  <Receipt className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">৳{pendingAmount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending Fees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{defaultersCount}</p>
                  <p className="text-sm text-muted-foreground">Fee Defaulters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="animate-fade-in">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="fees">Fee Collection</TabsTrigger>
            <TabsTrigger value="defaulters">Defaulters</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
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
                <div className="flex items-end">
                  <Button className="gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Report</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => exportToCSV(students?.map(s => ({
                    ID: s.student_id,
                    Name: s.name_en,
                    Class: s.classes?.name,
                    Section: s.sections?.name,
                    Roll: s.roll,
                    Guardian: s.guardians?.father_name,
                    Mobile: s.guardians?.father_mobile,
                  })) || [], 'students-report')}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.slice(0, 10).map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono">{student.student_id}</TableCell>
                        <TableCell>{student.name_en}</TableCell>
                        <TableCell>{student.classes?.name} • {student.sections?.name}</TableCell>
                        <TableCell>{student.roll}</TableCell>
                        <TableCell>{student.guardians?.father_name}</TableCell>
                        <TableCell className="font-mono">{student.guardians?.father_mobile}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fee Collection Report</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => exportToCSV(payments?.map(p => ({
                    Date: p.payment_date,
                    Invoice: p.invoices?.invoice_no,
                    Student: p.invoices?.students?.name_en,
                    Amount: p.amount,
                    Method: p.payment_method,
                  })) || [], 'fee-collection-report')}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.slice(0, 10).map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.payment_date ? format(new Date(payment.payment_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-mono">{payment.invoices?.invoice_no}</TableCell>
                        <TableCell>{payment.invoices?.students?.name_en}</TableCell>
                        <TableCell className="font-semibold">৳{(payment.amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaulters" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fee Defaulters</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.filter(i => i.status !== 'paid').slice(0, 10).map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_no}</TableCell>
                        <TableCell>{invoice.students?.name_en}</TableCell>
                        <TableCell className="font-semibold text-destructive">
                          ৳{(invoice.total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'partial' ? 'secondary' : 'destructive'}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select date range and class to generate attendance report</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
