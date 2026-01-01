// FILE: src/components/QRScanner.tsx
import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { supabase } from '@/integrations/supabase/client.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { Camera, X, CheckCircle, XCircle } from 'lucide-react';

interface QRScannerProps {
  onClose: () => void;
  date: string;
}

export function QRScanner({ onClose, date }: QRScannerProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(true);
  const [scannedStudents, setScannedStudents] = useState<any[]>([]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    // decodedText should be student_id
    const studentId = decodedText.trim();
    
    // Check if already scanned today
    const alreadyScanned = scannedStudents.find(s => s.student_id === studentId);
    if (alreadyScanned) {
      toast({ title: "Already Scanned", description: alreadyScanned.name_en });
      return;
    }

    // Get student details
    const { data: student } = await supabase
      .from('students')
      .select('id, student_id, name_en, photo_url, classes(name)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (!student) {
      toast({ title: "Not Found", description: `Student ${studentId} not found`, variant: "destructive" });
      return;
    }

    // Mark attendance
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('attendance')
      .upsert({
        student_id: student.id,
        date: date,
        status: 'present',
        marked_by: user?.id
      }, {
        onConflict: 'student_id,date'
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Add to scanned list
    setScannedStudents(prev => [...prev, student]);
    
    toast({ 
      title: "✓ Attendance Marked", 
      description: student.name_en 
    });

    // Play success sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77FgFgpBmN7yvW0gBSyBzvLZiTYIG2m98OahTgwOUKXh8bllHAU2jdXx0n8qBSd+zPDck0ELElyx6OyrWBQLRJfe8sJuIwU1iNDz1YU1Bhxrvu7mnlAODlCm4/K4aB8GM4nU8tKAKwUnfcvw3JFACxFbsOjrq1gVC0OX3vLBbiMFM4fP8tWENQYea77u5p5QDg5Qp+PxtmQcBjiP1fHTgCoFJ3zK8NyRQAsRW7Do66tYFQtDlt3ywW4jBTOHz/LVhDUGHmu+7uaeUA4OUKfj8bZkHAY4j9Xx04AqBSh8yvDckUALEVuw6OurWBULQ5bd8sFuIwUzh8/y1YQ1Bh5rvu7mnlAODlCn4/G2ZBwGOI/V8dOAKgUofMrw3JFACxFbsOjrq1gVC0OW3fLBbiMFM4fP8tWENQYea77u5p5QDg5Qp+PxtmQcBjiP1fHTgCoFKHzK8NyRQAsRW7Do66tYFQtDlt3ywW4jBTOHz/LVhDUGHmu+7uaeUA4OUKfj8bZkHAY4j9Xx04AqBSh8yvDckUALEVuw6OurWBULQ5bd8sFuIwUzh8/y1YQ1Bh5rvu7mnlAODlCn4/G2ZBwGOI/V8dOAKgUofMrw3JFACxFbsOjrq1gVC0OW3fLBbiMFM4fP8tWENQYea77u5p5QDg5Qp+PxtmQcBjiP1fHTgCoFKHzK8NyRQAsRW7Do66tYFQtDlt3ywW4jBTOHz/LVhDUGHmu+7uaeUA4OUKfj8bZkHAY4j9Xx04AqBSh8yvDckUALEVuw6OurWBULQ5bd8sFuIwUzh8/y1YQ1Bh5rvu7mnlAODlCn4/G2ZBwGOI/V8dOAKgUofMrw3JFACxFbsOjrq1gVC0SW3fLBbiMFM4fP8tWENQYea77u5p5QDg5Qp+PxtmQcBjiP1fHTgCoFKHzK8NyRQAsRW7Do66tYFQtDlt3ywW4jBTOHz/LVhDUGHmu+7uaeUA4OUKfj8bZkHAY4j9Xx04AqBSh8yvDckUALEVuw6OurWBULQ5bd8sFuIwUzh8/y1YQ1Bh5rvu7mnlAODlCn4/G2ZBwGOI/V8dOAKgUofMrw3JFACxFbsOjrq1gVC0OW3fLBbiMFM4fP8tWENQYea77u5p5QDg5Qp+PxtmQcBjiP1fHTgCoFKHzK8NyRQAsRW7Do66tYFQtDlt3ywW4jBTOHz/LVhDUGHmu+7uaeUA4OUKfj8bZkHAY4j9Xx04AqBSh8yvDckUALEVuw');
    audio.play().catch(() => {});
  };

  const onScanFailure = (error: any) => {
    // Ignore scan errors
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            <CardTitle>QR Code Scanner</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div id="qr-reader" className="w-full"></div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Scanned Today: {scannedStudents.length}</span>
            <Badge variant="success" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              All Present
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {scannedStudents.map(student => (
              <div key={student.id} className="flex items-center gap-3 p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-success" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{student.name_en}</p>
                  <p className="text-xs text-muted-foreground">{student.student_id} • {student.classes?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Hold student ID card QR code in front of camera
        </div>
      </CardContent>
    </Card>
  );
}
