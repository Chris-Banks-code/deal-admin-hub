import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to Supabase Realtime postgres_changes on one or more tables
 * and calls `onRefresh` whenever any INSERT, UPDATE, or DELETE fires.
 *
 * Automatically unsubscribes on unmount.
 *
 * @param tables  One or more table names to watch
 * @param onRefresh  Callback to run when a change is detected
 * @param channelName  Unique channel name (default: tables joined by '-')
 */
export function useRealtimeRefresh(
  tables: string[],
  onRefresh: () => void,
  channelName?: string,
) {
  // Keep a stable ref to the latest onRefresh so we don't re-subscribe on every render
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const name = channelName ?? tables.join('-');
    let channel = supabase.channel(name);

    tables.forEach(table => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => refreshRef.current(),
      );
    });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — tables and channelName are static per page
}
