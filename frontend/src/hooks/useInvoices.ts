import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addInvoiceLine, createInvoice, getInvoiceById, issueInvoice, listInvoices } from '../api/invoices';

export function useInvoices(stayId?: number | string, enabled = true) {
  const queryClient = useQueryClient();
  const key = ['stay', stayId, 'invoices'];

  // Validasi stayId: harus angka valid, bukan "undefined" string atau NaN
  const isValidStayId = stayId !== undefined && stayId !== null && stayId !== 'undefined' && stayId !== 'null' && !isNaN(Number(stayId));

  const query = useQuery({
    queryKey: key,
    queryFn: () => listInvoices({ stayId: isValidStayId ? stayId : undefined, limit: 100 }),
    enabled: isValidStayId && enabled,
  });

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const addLineMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: number; payload: any }) => addInvoiceLine(invoiceId, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const issueMutation = useMutation({
    mutationFn: issueInvoice,
    onSuccess: async (_, invoiceId) => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  return { ...query, createMutation, addLineMutation, issueMutation };
}

export function useInvoice(invoiceId?: number | string, enabled = true) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoiceById(invoiceId as number | string),
    enabled: Boolean(invoiceId) && enabled,
  });
}
