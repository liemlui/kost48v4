import { useInfiniteQuery } from '@tanstack/react-query';
import { getMyNotifications, type NotificationsListResponse } from '../api/notifications';

const PAGE_SIZE = 20;

export function useNotificationsInfinite() {
  return useInfiniteQuery<NotificationsListResponse>({
    queryKey: ['portal-notifications', 'infinite'],
    queryFn: ({ pageParam }) =>
      getMyNotifications({ limit: PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      if (totalFetched >= lastPage.total) return undefined;
      return totalFetched;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
