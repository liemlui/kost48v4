import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPayment, listPayments } from '../api/payments';

export function usePayments(invoiceId?: number | string, enabled = true) {
  const queryClient = useQueryClient();
  const key = ['invoice', invoiceId, 'payments'];

  const query = useQuery({
    queryKey: key,
    queryFn: () => listPayments({ invoiceId, limit: 100 }),
    enabled: Boolean(invoiceId) && enabled,
  });

  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  return { ...query, createMutation };
}
