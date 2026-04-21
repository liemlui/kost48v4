import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMeterReading, getMeterReadingsByRoom } from '../api/meterReadings';

export function useMeterReadings(roomId?: number | string, enabled = true) {
  const queryClient = useQueryClient();
  const key = ['meter-readings', { roomId }];

  const query = useQuery({
    queryKey: key,
    queryFn: () => getMeterReadingsByRoom(roomId as number | string),
    enabled: Boolean(roomId) && enabled,
  });

  const createMutation = useMutation({
    mutationFn: createMeterReading,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
    },
  });

  return { ...query, createMutation };
}
