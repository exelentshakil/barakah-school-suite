import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClasses, useSections } from '@/hooks/useStudents';
import { useFeeHeads } from '@/hooks/useFees';
import { useSchoolSettings, useUpdateSettings, useUserRoles } from '@/hooks/useSettings';
import {
  Settings as SettingsIcon,
  School,
  Users,
  BookOpen,
  Receipt,
  Save,
  Plus,
  Trash2,
  Edit,
  Shield,
} from 'lucide-react';

export default function Settings() {
  const { data: schoolSettings, isLoading } = useSchoolSettings();
  const { data: classes } = useClasses();
  const { data: feeHeads } = useFeeHeads();
  const { data: userRoles } = useUserRoles();
  const updateSettings = useUpdateSettings();
  
  const [formData, setFormData] = useState({
    name: '',
    name_bn: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    academic_year: '',
    session_year: '',
  });
  
  useEffect(() => {
    if (schoolSettings) {
      setFormData({
        name: schoolSettings.name || '',
        name_bn: schoolSettings.name_bn || '',
        code: schoolSettings.code || '',
        address: schoolSettings.address || '',
        phone: schoolSettings.phone || '',
        email: schoolSettings.email || '',
        website: schoolSettings.website || '',
        academic_year: schoolSettings.academic_year || '',
        session_year: schoolSettings.session_year || '',
      });
    }
  }, [schoolSettings]);
  
  const handleSave = () => {
    updateSettings.mutate(formData);
  };
  
  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      'admin': { label: 'Admin', className: 'bg-destructive/10 text-destructive' },
      'teacher': { label: 'Teacher', className: 'bg-primary/10 text-primary' },
      'accountant': { label: 'Accountant', className: 'bg-warning/10 text-warning' },
    };
    const v = variants[role] || variants['teacher'];
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage school settings and configuration</p>
        </div>

        <Tabs defaultValue="school" className="animate-fade-in">
          <TabsList>
            <TabsTrigger value="school" className="gap-2">
              <School className="w-4 h-4" />
              School Info
            </TabsTrigger>
            <TabsTrigger value="academic" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Academic
            </TabsTrigger>
            <TabsTrigger value="fees" className="gap-2">
              <Receipt className="w-4 h-4" />
              Fee Structure
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="school" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>Basic details about your school</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>School Name (English)</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                          placeholder="Global Quranic School"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>School Name (বাংলা)</Label>
                        <Input
                          value={formData.name_bn}
                          onChange={(e) => setFormData(p => ({ ...p, name_bn: e.target.value }))}
                          placeholder="গ্লোবাল কুরআনিক স্কুল"
                          className="font-bengali"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>School Code</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                          placeholder="GQS"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Academic Year</Label>
                        <Input
                          value={formData.academic_year}
                          onChange={(e) => setFormData(p => ({ ...p, academic_year: e.target.value }))}
                          placeholder="2025"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Session Year</Label>
                        <Input
                          value={formData.session_year}
                          onChange={(e) => setFormData(p => ({ ...p, session_year: e.target.value }))}
                          placeholder="2025-2026"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        value={formData.address}
                        onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                        placeholder="School address..."
                      />
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+880 1XXX-XXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                          placeholder="school@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                          value={formData.website}
                          onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
                          placeholder="https://school.com"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      variant="hero" 
                      className="gap-2" 
                      onClick={handleSave}
                      disabled={updateSettings.isPending}
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>Manage class levels</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Class
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Name (বাংলা)</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes?.map(cls => (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell className="font-bengali">{cls.name_bn}</TableCell>
                        <TableCell>{cls.display_order}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
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
                <div>
                  <CardTitle>Fee Heads</CardTitle>
                  <CardDescription>Configure fee types and amounts</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Fee Head
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeHeads?.map(fh => (
                      <TableRow key={fh.id}>
                        <TableCell className="font-medium">{fh.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{fh.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    User Management
                  </CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles?.map(ur => (
                      <TableRow key={ur.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={ur.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {ur.profiles?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{ur.profiles?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(ur.role)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
