import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotificationItem,
  type NotificationsListResponse,
} from '../api/notifications';

type NotificationQueryOptions = {
  enabled?: boolean;
};

type NotificationCacheSnapshot = {
  listEntries: Array<[QueryKey, NotificationsListResponse | undefined]>;
  infiniteEntries: Array<[QueryKey, InfiniteData<NotificationsListResponse> | undefined]>;
};

const notificationListKey = ['portal-notifications', 'list'] as const;
const notificationInfiniteKey = ['portal-notifications', 'infinite'] as const;

function markNotificationReadInPage(page: NotificationsListResponse, id: number): NotificationsListResponse {
  return {
    ...page,
    items: page.items.map((item) =>
      item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
    ),
    // unreadCount adalah nilai global dari API, sehingga harus diperbarui juga
    // pada cache yang tidak memuat item ini (mis. Bell hanya memuat 5 item).
    unreadCount: Math.max(0, page.unreadCount - 1),
  };
}

function markAllNotificationsReadInPage(page: NotificationsListResponse): NotificationsListResponse {
  return {
    ...page,
    items: page.items.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })),
    unreadCount: 0,
  };
}

export function useNotifications(
  params?: { limit?: number; offset?: number },
  options?: NotificationQueryOptions,
) {
  const queryClient = useQueryClient();
  const key = ['portal-notifications', 'list', params?.limit ?? 20, params?.offset ?? 0];

  const query = useQuery({
    queryKey: key,
    queryFn: () => getMyNotifications(params),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });

  const captureNotificationCaches = (): NotificationCacheSnapshot => ({
    listEntries: queryClient.getQueriesData<NotificationsListResponse>({ queryKey: notificationListKey }),
    infiniteEntries: queryClient.getQueriesData<InfiniteData<NotificationsListResponse>>({ queryKey: notificationInfiniteKey }),
  });

  const restoreNotificationCaches = (snapshot: NotificationCacheSnapshot) => {
    snapshot.listEntries.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    snapshot.infiniteEntries.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
  };

  const invalidateNotificationCaches = () => {
    void queryClient.invalidateQueries({ queryKey: notificationListKey });
    void queryClient.invalidateQueries({ queryKey: notificationInfiniteKey });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationListKey }),
        queryClient.cancelQueries({ queryKey: notificationInfiniteKey }),
      ]);
      const previous = captureNotificationCaches();

      previous.listEntries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, markNotificationReadInPage(data, id));
      });
      previous.infiniteEntries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map((page) => markNotificationReadInPage(page, id)),
        });
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) restoreNotificationCaches(context.previous);
    },
    onSettled: () => {
      invalidateNotificationCaches();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationListKey }),
        queryClient.cancelQueries({ queryKey: notificationInfiniteKey }),
      ]);
      const previous = captureNotificationCaches();

      previous.listEntries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, markAllNotificationsReadInPage(data));
      });
      previous.infiniteEntries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map(markAllNotificationsReadInPage),
        });
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) restoreNotificationCaches(context.previous);
    },
    onSettled: () => {
      invalidateNotificationCaches();
    },
  });

  return { query, markReadMutation, markAllReadMutation };
}
