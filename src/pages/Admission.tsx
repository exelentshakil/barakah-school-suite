import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { classes, feeStructure, schoolSettings } from '@/data/mockData';
import {
  User,
  Users,
  MapPin,
  GraduationCap,
  Receipt,
  Camera,
  Save,
  ArrowLeft,
  Upload,
} from 'lucide-react';

export default function Admission() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [selectedClass, setSelectedClass] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 900) + 100;
    return `${schoolSettings.code}-${year}-${String(sequence).padStart(3, '0')}`;
  };

  const [studentId] = useState(generateStudentId);

  const getFeePreview = () => {
    if (!selectedClass) return null;
    const fees = feeStructure[selectedClass];
    if (!fees) return null;
    
    return {
      admission: fees.admission || 0,
      session: fees.session || 0,
      monthly: fees.monthly || 0,
      total: (fees.admission || 0) + (fees.session || 0) + (fees.monthly || 0),
    };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Student Registered Successfully!",
      description: `Student ID: ${studentId}`,
    });
    navigate('/students');
  };

  const feePreview = getFeePreview();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 animate-fade-in">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Admission</h1>
            <p className="text-muted-foreground">Register a new student to the school</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal" className="gap-2">
                    <User className="w-4 h-4 hidden sm:block" />
                    Personal
                  </TabsTrigger>
                  <TabsTrigger value="guardian" className="gap-2">
                    <Users className="w-4 h-4 hidden sm:block" />
                    Guardian
                  </TabsTrigger>
                  <TabsTrigger value="academic" className="gap-2">
                    <GraduationCap className="w-4 h-4 hidden sm:block" />
                    Academic
                  </TabsTrigger>
                  <TabsTrigger value="address" className="gap-2">
                    <MapPin className="w-4 h-4 hidden sm:block" />
                    Address
                  </TabsTrigger>
                </TabsList>

                {/* Personal Info */}
                <TabsContent value="personal" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Enter the student's personal details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <Avatar className="w-24 h-24 border-4 border-muted">
                            <AvatarImage src={photoPreview || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                              <Camera className="w-8 h-8" />
                            </AvatarFallback>
                          </Avatar>
                          <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                          </label>
                        </div>
                        <div className="flex-1">
                          <Label>Student ID</Label>
                          <Input value={studentId} readOnly className="font-mono bg-muted" />
                          <p className="text-xs text-muted-foreground mt-1">Auto-generated, cannot be changed</p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="nameEn">Name (English) *</Label>
                          <Input id="nameEn" placeholder="Full name in English" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nameBn">নাম (বাংলা)</Label>
                          <Input id="nameBn" placeholder="বাংলায় পূর্ণ নাম" className="font-bengali" />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="dob">Date of Birth *</Label>
                          <Input id="dob" type="date" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender *</Label>
                          <Select required>
                            <SelectTrigger id="gender">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bloodGroup">Blood Group</Label>
                          <Select>
                            <SelectTrigger id="bloodGroup">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="religion">Religion *</Label>
                        <Select required>
                          <SelectTrigger id="religion">
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="islam">Islam</SelectItem>
                            <SelectItem value="hinduism">Hinduism</SelectItem>
                            <SelectItem value="christianity">Christianity</SelectItem>
                            <SelectItem value="buddhism">Buddhism</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Guardian Info */}
                <TabsContent value="guardian" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Guardian Information</CardTitle>
                      <CardDescription>Enter parent/guardian details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-foreground">Father's Information</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="fatherName">Father's Name *</Label>
                            <Input id="fatherName" placeholder="Full name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fatherMobile">Mobile Number *</Label>
                            <Input id="fatherMobile" placeholder="01XXXXXXXXX" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fatherOccupation">Occupation</Label>
                            <Input id="fatherOccupation" placeholder="e.g., Business, Teacher" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fatherNid">NID Number</Label>
                            <Input id="fatherNid" placeholder="National ID number" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-foreground">Mother's Information</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="motherName">Mother's Name *</Label>
                            <Input id="motherName" placeholder="Full name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="motherMobile">Mobile Number</Label>
                            <Input id="motherMobile" placeholder="01XXXXXXXXX" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-foreground">Emergency Contact</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="emergencyName">Contact Name *</Label>
                            <Input id="emergencyName" placeholder="Who picks up the student" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emergencyMobile">Mobile Number *</Label>
                            <Input id="emergencyMobile" placeholder="01XXXXXXXXX" required />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Academic Info */}
                <TabsContent value="academic" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Academic Information</CardTitle>
                      <CardDescription>Class, section, and enrollment details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="class">Class *</Label>
                          <Select value={selectedClass} onValueChange={setSelectedClass} required>
                            <SelectTrigger id="class">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map(cls => (
                                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="section">Section *</Label>
                          <Select required>
                            <SelectTrigger id="section">
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="section-a">Section A</SelectItem>
                              <SelectItem value="section-b">Section B</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="shift">Shift</Label>
                          <Select>
                            <SelectTrigger id="shift">
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="morning">Morning</SelectItem>
                              <SelectItem value="day">Day</SelectItem>
                              <SelectItem value="evening">Evening</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="roll">Roll Number</Label>
                          <Input id="roll" type="number" placeholder="Auto-assigned if empty" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admissionDate">Admission Date *</Label>
                        <Input id="admissionDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Address */}
                <TabsContent value="address" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Address Information</CardTitle>
                      <CardDescription>Student's residential address</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="presentAddress">Present Address *</Label>
                        <Textarea id="presentAddress" placeholder="House, Road, Area, City" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="permanentAddress">Permanent Address</Label>
                        <Textarea id="permanentAddress" placeholder="Leave empty if same as present address" />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Fee Preview */}
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Fee Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {feePreview ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Admission Fee</span>
                        <span className="font-medium">৳{feePreview.admission.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Session Fee</span>
                        <span className="font-medium">৳{feePreview.session.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Fee</span>
                        <span className="font-medium">৳{feePreview.monthly.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-border pt-3 mt-3">
                        <div className="flex justify-between font-semibold">
                          <span>Total Due Now</span>
                          <span className="text-primary">৳{feePreview.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Select a class to see fee structure
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button type="submit" variant="hero" size="lg" className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  Save & Register
                </Button>
                <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
