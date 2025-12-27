import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useClasses } from '@/hooks/useStudents';
import { useSMSCredits, useSMSLogs, useSendSMS } from '@/hooks/useSMS';
import {
  MessageSquare,
  Send,
  CreditCard,
  History,
  Users,
  Filter,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';

const messageTemplates = [
  { id: 'fee-reminder', label: 'Fee Reminder', text: 'Dear Parent, your child\'s fee of ৳{amount} is due. Please pay by {date}.' },
  { id: 'attendance', label: 'Absence Alert', text: 'Dear Parent, {student_name} was absent today ({date}). Please inform us of the reason.' },
  { id: 'exam-notice', label: 'Exam Notice', text: 'Dear Parent, {exam_name} will start from {date}. Please ensure your child is prepared.' },
  { id: 'holiday', label: 'Holiday Notice', text: 'Dear Parent, school will remain closed on {date} due to {reason}.' },
];

export default function SMS() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  
  const { data: classes } = useClasses();
  const { data: credits } = useSMSCredits();
  const { data: logs, isLoading: logsLoading } = useSMSLogs();
  const sendSMS = useSendSMS();
  
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.text);
    }
  };
  
  const handleSend = () => {
    if (!message || recipients.length === 0) return;
    sendSMS.mutate({ recipients, message });
  };
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      'sent': { label: 'Sent', className: 'bg-success/10 text-success' },
      'failed': { label: 'Failed', className: 'bg-destructive/10 text-destructive' },
      'pending': { label: 'Pending', className: 'bg-warning/10 text-warning' },
    };
    const v = variants[status] || variants['pending'];
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SMS Center</h1>
            <p className="text-muted-foreground mt-1">Send SMS notifications to parents</p>
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-4">
                <CreditCard className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{credits?.balance || 0}</p>
                  <p className="text-sm opacity-80">SMS Credits</p>
                </div>
                <Button variant="secondary" size="sm" className="ml-4">
                  <Plus className="w-4 h-4 mr-1" />
                  Buy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="compose" className="animate-fade-in">
          <TabsList>
            <TabsTrigger value="compose" className="gap-2">
              <Send className="w-4 h-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Compose Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compose Message</CardTitle>
                    <CardDescription>Send SMS to selected recipients</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Parents</SelectItem>
                            <SelectItem value="defaulters">Fee Defaulters</SelectItem>
                            {classes?.map(cls => (
                              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Template</Label>
                        <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {messageTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Message</Label>
                        <span className="text-sm text-muted-foreground">{message.length}/160</span>
                      </div>
                      <Textarea
                        placeholder="Type your message here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Additional Numbers (Optional)</Label>
                      <Input
                        placeholder="01XXXXXXXXX, 01XXXXXXXXX"
                        onChange={(e) => setRecipients(e.target.value.split(',').map(r => r.trim()))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview & Send */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{message || 'Your message will appear here...'}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipients</span>
                      <span className="font-medium">{recipients.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMS Count</span>
                      <span className="font-medium">{Math.ceil(message.length / 160) || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost</span>
                      <span className="font-medium">৳{((recipients.length || 0) * 0.5).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="hero" 
                    className="w-full gap-2" 
                    onClick={handleSend}
                    disabled={!message || recipients.length === 0 || sendSMS.isPending}
                  >
                    <Send className="w-4 h-4" />
                    Send SMS
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  SMS History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : logs?.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No SMS sent yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs?.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="font-mono">{log.recipient}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{log.message}</TableCell>
                          <TableCell>{getStatusBadge(log.status || 'pending')}</TableCell>
                          <TableCell className="text-right">৳{(log.cost || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
