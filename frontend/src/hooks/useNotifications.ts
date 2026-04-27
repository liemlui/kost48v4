import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotificationItem,
  type NotificationsListResponse,
} from '../api/notifications';

export function useNotifications() {
  const queryClient = useQueryClient();
  const key = ['my-notifications', 'list'];

  const query = useQuery({
    queryKey: key,
    queryFn: getMyNotifications,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationsListResponse>(key);
      if (previous) {
        queryClient.setQueryData<NotificationsListResponse>(key, {
          ...previous,
          items: previous.items.map((item) =>
            item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
          ),
          unreadCount: Math.max(0, previous.unreadCount - 1),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationsListResponse>(key);
      if (previous) {
        queryClient.setQueryData<NotificationsListResponse>(key, {
          ...previous,
          items: previous.items.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })),
          unreadCount: 0,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return { query, markReadMutation, markAllReadMutation };
}