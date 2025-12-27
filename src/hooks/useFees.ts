import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFeeHeads() {
  return useQuery({
    queryKey: ['fee-heads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_heads')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useFeePlans(classId?: string) {
  return useQuery({
    queryKey: ['fee-plans', classId],
    queryFn: async () => {
      let query = supabase
        .from('fee_plans')
        .select(`
          *,
          fee_heads (id, name, type),
          classes (id, name)
        `);
      
      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoices(studentId?: string) {
  return useQuery({
    queryKey: ['invoices', studentId],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          students (id, student_id, name_en, classes (name)),
          invoice_items (*)
        `)
        .order('created_at', { ascending: false });
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      items: { fee_head_id: string; fee_head_name: string; amount: number }[];
      discount?: number;
    }) => {
      const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
      const total = subtotal - (data.discount || 0);
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_no: `TEMP-${Date.now()}`,
          student_id: data.student_id,
          subtotal,
          discount: data.discount || 0,
          total,
          status: 'unpaid',
        })
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          data.items.map(item => ({
            invoice_id: invoice.id,
            fee_head_id: item.fee_head_id,
            fee_head_name: item.fee_head_name,
            amount: item.amount,
          }))
        );
      
      if (itemsError) throw itemsError;
      
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCollectPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      invoice_id: string;
      amount: number;
      payment_method: 'cash' | 'bkash' | 'nagad' | 'bank' | 'sslcommerz';
      transaction_id?: string;
    }) => {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: data.invoice_id,
          amount: data.amount,
          payment_method: data.payment_method,
          transaction_id: data.transaction_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update invoice status
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', data.invoice_id);
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment collected successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePayments(invoiceId?: string) {
  return useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          invoices (invoice_no, student_id, students (name_en))
        `)
        .order('payment_date', { ascending: false });
      
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });
}
