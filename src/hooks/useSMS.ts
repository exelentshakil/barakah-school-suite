import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSMSCredits() {
  return useQuery({
    queryKey: ['sms-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_credits')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data || { balance: 0, total_purchased: 0 };
    },
  });
}

export function useSMSLogs() {
  return useQuery({
    queryKey: ['sms-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useSendSMS() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      recipients: string[];
      message: string;
    }) => {
      // Log SMS sends (actual sending would be via edge function)
      const logs = data.recipients.map(recipient => ({
        recipient,
        message: data.message,
        status: 'pending' as const,
        cost: 0.50,
      }));
      
      const { error } = await supabase.from('sms_log').insert(logs);
      if (error) throw error;
      
      // Update credits
      const { data: credits } = await supabase
        .from('sms_credits')
        .select('balance')
        .single();
      
      if (credits) {
        await supabase
          .from('sms_credits')
          .update({ balance: credits.balance - data.recipients.length })
          .eq('id', credits.balance);
      }
      
      return { sent: data.recipients.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms-credits'] });
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      toast.success(`${data.sent} SMS queued for sending!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
