import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { mockStudents, feeStructure } from '@/data/mockData';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Receipt,
  CreditCard,
  Printer,
  MessageSquare,
  User,
  Phone,
  GraduationCap,
} from 'lucide-react';

export default function Fees() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFees, setSelectedFees] = useState<string[]>(['monthly']);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');

  const searchResults = searchQuery.length >= 2
    ? mockStudents.filter(s =>
        s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.guardian?.fatherMobile.includes(searchQuery)
      ).slice(0, 5)
    : [];

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
  };

  const fees = selectedStudent ? feeStructure[selectedStudent.classId] : null;

  const calculateTotal = () => {
    if (!fees) return 0;
    let total = 0;
    if (selectedFees.includes('admission')) total += fees.admission || 0;
    if (selectedFees.includes('session')) total += fees.session || 0;
    if (selectedFees.includes('monthly')) total += fees.monthly || 0;
    
    const discountAmount = discount ? parseFloat(discount) : 0;
    return total - discountAmount;
  };

  const handleCollect = () => {
    toast({
      title: "Payment Collected Successfully!",
      description: `Receipt: FEE-2025-${Math.floor(Math.random() * 9000) + 1000}`,
    });
    setSelectedStudent(null);
    setSelectedFees(['monthly']);
    setDiscount('');
    setAmountPaid('');
  };

  const total = calculateTotal();
  const paidAmount = amountPaid ? parseFloat(amountPaid) : 0;
  const change = paidAmount - total;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Fee Collection</h1>
          <p className="text-muted-foreground mt-1">Search for a student and collect fees</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Search & Student Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Find Student
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      {searchResults.map(student => (
                        <button
                          key={student.id}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                          onClick={() => handleSelectStudent(student)}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={student.photoUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {student.nameEn.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{student.nameEn}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.studentId} • {student.className}
                            </p>
                          </div>
                          <Badge variant={student.feeStatus as 'paid' | 'partial' | 'due'}>
                            {student.feeStatus}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Student */}
            {selectedStudent && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Student Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={selectedStudent.photoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {selectedStudent.nameEn.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Student Name</p>
                          <p className="font-medium">{selectedStudent.nameEn}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Student ID</p>
                          <p className="font-mono font-medium">{selectedStudent.studentId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Class</p>
                          <p className="font-medium">{selectedStudent.className} • {selectedStudent.sectionName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Guardian</p>
                          <p className="font-medium">{selectedStudent.guardian?.fatherMobile}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fee Selection */}
            {selectedStudent && fees && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Select Fees</CardTitle>
                  <CardDescription>Choose which fees to collect</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {fees.admission && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="admission"
                            checked={selectedFees.includes('admission')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFees([...selectedFees, 'admission']);
                              } else {
                                setSelectedFees(selectedFees.filter(f => f !== 'admission'));
                              }
                            }}
                          />
                          <Label htmlFor="admission" className="cursor-pointer">
                            Admission Fee
                          </Label>
                        </div>
                        <span className="font-semibold">৳{fees.admission.toLocaleString()}</span>
                      </div>
                    )}
                    {fees.session && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="session"
                            checked={selectedFees.includes('session')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFees([...selectedFees, 'session']);
                              } else {
                                setSelectedFees(selectedFees.filter(f => f !== 'session'));
                              }
                            }}
                          />
                          <Label htmlFor="session" className="cursor-pointer">
                            Session Fee
                          </Label>
                        </div>
                        <span className="font-semibold">৳{fees.session.toLocaleString()}</span>
                      </div>
                    )}
                    {fees.monthly && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="monthly"
                            checked={selectedFees.includes('monthly')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFees([...selectedFees, 'monthly']);
                              } else {
                                setSelectedFees(selectedFees.filter(f => f !== 'monthly'));
                              }
                            }}
                          />
                          <Label htmlFor="monthly" className="cursor-pointer">
                            Monthly Fee (January 2025)
                          </Label>
                        </div>
                        <span className="font-semibold">৳{fees.monthly.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="discount">Discount (৳)</Label>
                      <Input
                        id="discount"
                        type="number"
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="method">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bkash">bKash</SelectItem>
                          <SelectItem value="nagad">Nagad</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card className="sticky top-24 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStudent && fees ? (
                  <>
                    <div className="space-y-2 text-sm">
                      {selectedFees.includes('admission') && fees.admission && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Admission Fee</span>
                          <span>৳{fees.admission.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedFees.includes('session') && fees.session && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Session Fee</span>
                          <span>৳{fees.session.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedFees.includes('monthly') && fees.monthly && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Fee</span>
                          <span>৳{fees.monthly.toLocaleString()}</span>
                        </div>
                      )}
                      {discount && parseFloat(discount) > 0 && (
                        <div className="flex justify-between text-success">
                          <span>Discount</span>
                          <span>-৳{parseFloat(discount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">৳{total.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amountPaid">Amount Received (৳)</Label>
                      <Input
                        id="amountPaid"
                        type="number"
                        placeholder={total.toString()}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="text-lg font-semibold"
                      />
                    </div>

                    {paidAmount > 0 && change >= 0 && (
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                        <div className="flex justify-between font-semibold text-success">
                          <span>Change</span>
                          <span>৳{change.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-4">
                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full gap-2"
                        onClick={handleCollect}
                        disabled={selectedFees.length === 0}
                      >
                        <CreditCard className="w-4 h-4" />
                        Collect Payment
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2">
                          <Printer className="w-4 h-4" />
                          Print
                        </Button>
                        <Button variant="outline" className="gap-2">
                          <MessageSquare className="w-4 h-4" />
                          SMS
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      Search and select a student to collect fees
                    </p>
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
