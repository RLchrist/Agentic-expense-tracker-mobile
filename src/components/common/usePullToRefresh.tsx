import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown> | void;
  enabled?: boolean;
}

export function usePullToRefresh({ onRefresh, enabled = true }: UsePullToRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, enabled]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#10b981']}
      tintColor="#10b981"
    />
  );

  return { refreshing, handleRefresh, refreshControl };
}