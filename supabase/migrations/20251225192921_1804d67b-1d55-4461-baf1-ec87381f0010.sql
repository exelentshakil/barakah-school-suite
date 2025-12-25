-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'accountant');
CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'transferred');
CREATE TYPE public.gender_type AS ENUM ('male', 'female');
CREATE TYPE public.shift_type AS ENUM ('morning', 'day', 'evening');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'leave');
CREATE TYPE public.payment_method AS ENUM ('cash', 'bkash', 'nagad', 'bank', 'card');
CREATE TYPE public.invoice_status AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE public.exam_type AS ENUM ('class-test', 'mid-term', 'final', 'annual');
CREATE TYPE public.certificate_type AS ENUM ('transfer', 'character', 'hifz');
CREATE TYPE public.sms_status AS ENUM ('sent', 'failed', 'pending');
CREATE TYPE public.board_type AS ENUM ('nctb', 'madrasah', 'cambridge');

-- User roles table (security definer pattern)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'teacher',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- School settings
CREATE TABLE public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Global Quranic School',
    name_bn TEXT DEFAULT 'গ্লোবাল কুরআনিক স্কুল',
    code TEXT NOT NULL DEFAULT 'GQS',
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    academic_year TEXT DEFAULT '2025',
    session_year TEXT DEFAULT '2025-2026',
    board board_type DEFAULT 'madrasah',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Classes
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_bn TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Sections
CREATE TABLE public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Subjects
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    name_bn TEXT,
    full_marks INTEGER DEFAULT 100,
    pass_marks INTEGER DEFAULT 33,
    is_optional BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Students
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT,
    photo_url TEXT,
    dob DATE,
    gender gender_type NOT NULL DEFAULT 'male',
    blood_group TEXT,
    religion TEXT DEFAULT 'Islam',
    class_id UUID REFERENCES public.classes(id),
    section_id UUID REFERENCES public.sections(id),
    shift shift_type DEFAULT 'morning',
    roll INTEGER,
    address_present TEXT,
    address_permanent TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    status student_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Guardians
CREATE TABLE public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL UNIQUE,
    father_name TEXT NOT NULL,
    father_mobile TEXT NOT NULL,
    father_occupation TEXT,
    father_nid TEXT,
    mother_name TEXT,
    mother_mobile TEXT,
    mother_occupation TEXT,
    mother_nid TEXT,
    local_guardian_name TEXT,
    local_guardian_mobile TEXT,
    local_guardian_relation TEXT,
    emergency_contact_name TEXT,
    emergency_contact_mobile TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

-- Fee heads
CREATE TABLE public.fee_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'monthly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;

-- Fee plans (class-wise fees)
CREATE TABLE public.fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    fee_head_id UUID REFERENCES public.fee_heads(id) ON DELETE CASCADE NOT NULL,
    shift shift_type DEFAULT 'morning',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(class_id, fee_head_id, shift)
);
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;

-- Invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    month INTEGER,
    year INTEGER,
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    fine DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    status invoice_status DEFAULT 'unpaid',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoice items
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    fee_head_id UUID REFERENCES public.fee_heads(id),
    fee_head_name TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method DEFAULT 'cash',
    transaction_id TEXT,
    received_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status DEFAULT 'present',
    note TEXT,
    marked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Exams
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type exam_type DEFAULT 'mid-term',
    start_date DATE,
    end_date DATE,
    academic_year TEXT,
    class_id UUID REFERENCES public.classes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Exam subjects
CREATE TABLE public.exam_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id),
    subject_name TEXT NOT NULL,
    full_marks INTEGER DEFAULT 100,
    pass_marks INTEGER DEFAULT 33,
    written_marks INTEGER,
    mcq_marks INTEGER,
    practical_marks INTEGER,
    exam_date DATE,
    exam_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;

-- Marks
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    exam_subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    written DECIMAL(5,2),
    mcq DECIMAL(5,2),
    practical DECIMAL(5,2),
    total DECIMAL(5,2),
    letter_grade TEXT,
    grade_point DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(exam_id, exam_subject_id, student_id)
);
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Certificates
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_no TEXT NOT NULL UNIQUE,
    type certificate_type NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    conduct TEXT DEFAULT 'GOOD',
    issued_by UUID REFERENCES auth.users(id),
    is_duplicate BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- SMS credits
CREATE TABLE public.sms_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance INTEGER DEFAULT 0,
    last_recharged TIMESTAMP WITH TIME ZONE,
    total_purchased INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.sms_credits ENABLE ROW LEVEL SECURITY;

-- SMS orders
CREATE TABLE public.sms_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_size INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.sms_orders ENABLE ROW LEVEL SECURITY;

-- SMS log
CREATE TABLE public.sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status sms_status DEFAULT 'pending',
    cost DECIMAL(5,2) DEFAULT 0.50,
    sent_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

-- Teacher class assignments
CREATE TABLE public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id),
    subject_id UUID REFERENCES public.subjects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, class_id, section_id, subject_id)
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Auto-generate student ID function
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    school_code TEXT;
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    SELECT code INTO school_code FROM school_settings LIMIT 1;
    school_code := COALESCE(school_code, 'GQS');
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(student_id, '^[A-Z]+-[0-9]+-', ''), '')::INTEGER
    ), 0) + 1 INTO next_seq
    FROM students
    WHERE student_id LIKE school_code || '-' || current_year || '-%';
    
    NEW.student_id := school_code || '-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_student_id
    BEFORE INSERT ON public.students
    FOR EACH ROW
    WHEN (NEW.student_id IS NULL OR NEW.student_id = '')
    EXECUTE FUNCTION public.generate_student_id();

-- Auto-generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(invoice_no, '^FEE-[0-9]+-', ''), '')::INTEGER
    ), 0) + 1 INTO next_seq
    FROM invoices
    WHERE invoice_no LIKE 'FEE-' || current_year || '-%';
    
    NEW.invoice_no := 'FEE-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_invoice_no
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    WHEN (NEW.invoice_no IS NULL OR NEW.invoice_no = '')
    EXECUTE FUNCTION public.generate_invoice_no();

-- Auto-generate certificate number function
CREATE OR REPLACE FUNCTION public.generate_certificate_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prefix TEXT;
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    CASE NEW.type
        WHEN 'transfer' THEN prefix := 'TC';
        WHEN 'character' THEN prefix := 'CC';
        WHEN 'hifz' THEN prefix := 'HZ';
        ELSE prefix := 'CERT';
    END CASE;
    
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(certificate_no, '^[A-Z]+-[0-9]+-', ''), '')::INTEGER
    ), 0) + 1 INTO next_seq
    FROM certificates
    WHERE certificate_no LIKE prefix || '-' || current_year || '-%';
    
    NEW.certificate_no := prefix || '-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_certificate_no
    BEFORE INSERT ON public.certificates
    FOR EACH ROW
    WHEN (NEW.certificate_no IS NULL OR NEW.certificate_no = '')
    EXECUTE FUNCTION public.generate_certificate_no();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sms_credits_updated_at BEFORE UPDATE ON public.sms_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- School settings (admin only write, all authenticated read)
CREATE POLICY "All authenticated can view school settings" ON public.school_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage school settings" ON public.school_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Classes (all authenticated read, admin write)
CREATE POLICY "All authenticated can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sections
CREATE POLICY "All authenticated can view sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Subjects
CREATE POLICY "All authenticated can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Students (admin full, teacher read assigned, accountant read)
CREATE POLICY "Admins can manage students" ON public.students FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can view assigned students" ON public.students FOR SELECT USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (SELECT 1 FROM teacher_assignments WHERE user_id = auth.uid() AND class_id = students.class_id)
);
CREATE POLICY "Accountants can view students" ON public.students FOR SELECT USING (public.has_role(auth.uid(), 'accountant'));

-- Guardians
CREATE POLICY "Admins can manage guardians" ON public.guardians FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view guardians" ON public.guardians FOR SELECT TO authenticated USING (true);

-- Fee heads
CREATE POLICY "All authenticated can view fee heads" ON public.fee_heads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fee heads" ON public.fee_heads FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Fee plans
CREATE POLICY "All authenticated can view fee plans" ON public.fee_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fee plans" ON public.fee_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Invoices
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Accountants can manage invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'accountant'));

-- Invoice items
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Accountants can manage invoice items" ON public.invoice_items FOR ALL USING (public.has_role(auth.uid(), 'accountant'));

-- Payments
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Accountants can manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'accountant'));

-- Attendance
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage attendance for assigned classes" ON public.attendance FOR ALL USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM students s
        JOIN teacher_assignments ta ON ta.class_id = s.class_id
        WHERE s.id = attendance.student_id AND ta.user_id = auth.uid()
    )
);

-- Exams
CREATE POLICY "All authenticated can view exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Exam subjects
CREATE POLICY "All authenticated can view exam subjects" ON public.exam_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage exam subjects" ON public.exam_subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Marks
CREATE POLICY "All authenticated can view marks" ON public.marks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage marks" ON public.marks FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage marks for assigned subjects" ON public.marks FOR ALL USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM exam_subjects es
        JOIN teacher_assignments ta ON ta.subject_id = es.subject_id
        WHERE es.id = marks.exam_subject_id AND ta.user_id = auth.uid()
    )
);

-- Certificates
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "All authenticated can view certificates" ON public.certificates FOR SELECT TO authenticated USING (true);

-- SMS credits
CREATE POLICY "All authenticated can view sms credits" ON public.sms_credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sms credits" ON public.sms_credits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SMS orders
CREATE POLICY "All authenticated can view sms orders" ON public.sms_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sms orders" ON public.sms_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SMS log
CREATE POLICY "All authenticated can view sms log" ON public.sms_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sms log" ON public.sms_log FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Teacher assignments
CREATE POLICY "All authenticated can view teacher assignments" ON public.teacher_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teacher assignments" ON public.teacher_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default school settings
INSERT INTO public.school_settings (name, name_bn, code, address, phone, email, website, academic_year, session_year, board)
VALUES ('Global Quranic School', 'গ্লোবাল কুরআনিক স্কুল', 'GQS', 'Rajshahi, Bangladesh', '+880 1700-000000', 'info@globalquranic.edu.bd', 'www.globalquranic.edu.bd', '2025', '2025-2026', 'madrasah');

-- Insert default classes
INSERT INTO public.classes (name, name_bn, display_order) VALUES
('Pre-Play', 'প্রি-প্লে', 1),
('Play', 'প্লে', 2),
('Nursery', 'নার্সারি', 3),
('KG', 'কেজি', 4),
('Class 1', 'প্রথম শ্রেণি', 5),
('Class 2', 'দ্বিতীয় শ্রেণি', 6),
('Class 3', 'তৃতীয় শ্রেণি', 7),
('Class 4', 'চতুর্থ শ্রেণি', 8),
('Class 5', 'পঞ্চম শ্রেণি', 9),
('Hifz', 'হিফজ', 10);

-- Insert default fee heads
INSERT INTO public.fee_heads (name, type) VALUES
('Admission Fee', 'one-time'),
('Session Fee', 'yearly'),
('Monthly Fee', 'monthly'),
('Exam Fee', 'yearly'),
('Transport Fee', 'monthly'),
('Book Fee', 'yearly');

-- Insert default SMS credits
INSERT INTO public.sms_credits (balance, total_purchased) VALUES (500, 500);