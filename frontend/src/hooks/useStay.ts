import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelStay, completeStay, getStayById, processDeposit, renewStay, updateStay } from '../api/stays';
import { CancelStayPayload, CompleteStayPayload, ProcessDepositPayload, Stay } from '../types';

function isDashboardKey(value: unknown) {
  return typeof value === 'string' && value.startsWith('dashboard');
}

export function useStay(id?: number | string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stay', id],
    queryFn: () => getStayById(id as number | string),
    enabled: Boolean(id),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['stay', id] });
    await queryClient.invalidateQueries({ queryKey: ['stays'] });
    await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    await queryClient.invalidateQueries({ queryKey: ['rooms'] });
    await queryClient.invalidateQueries({ queryKey: ['tenants'] });
    await queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
    await queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : undefined;
        return isDashboardKey(firstKey);
      },
    });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Stay>) => updateStay(id as number | string, payload),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: (payload: CompleteStayPayload) => completeStay(id as number | string, payload),
    onSuccess: invalidate,
  });

  const processDepositMutation = useMutation({
    mutationFn: (payload: ProcessDepositPayload) => processDeposit(id as number | string, payload),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: CancelStayPayload) => cancelStay(id as number | string, payload),
    onSuccess: invalidate,
  });

  const renewMutation = useMutation({
    mutationFn: (payload?: { plannedCheckOutDate?: string; agreedRentAmountRupiah?: number }) =>
      renewStay(id as number | string, payload),
    onSuccess: invalidate,
  });

  return {
    ...query,
    updateMutation,
    completeMutation,
    processDepositMutation,
    cancelMutation,
    renewMutation,
  };
}
