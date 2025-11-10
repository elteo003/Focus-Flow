import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { TimeBlock, SubTask } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { retry, isRetryableError } from '@/lib/retry';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

const CHANNEL_NAME = 'time_blocks_changes';

type TimeBlockRow = Tables<'time_blocks'>;
type TimeBlockInsert = TablesInsert<'time_blocks'>;
type TimeBlockUpdate = TablesUpdate<'time_blocks'>;

const mapRowToTimeBlock = (row: TimeBlockRow): TimeBlock => ({
  id: row.id,
  title: row.title,
  startTime: row.start_time,
  endTime: row.end_time,
  category: row.category as TimeBlock['category'],
  date: row.date,
  completed: row.completed ?? false,
  status: (row.status as TimeBlock['status']) ?? 'planned',
  actualStartTime: row.actual_start_time ?? undefined,
  actualEndTime: row.actual_end_time ?? undefined,
  pausedDuration: row.paused_duration ?? 0,
  externalEvent: row.external_event ?? false,
  subTasks: Array.isArray(row.sub_tasks)
    ? (row.sub_tasks as SubTask[])
    : [],
});

const mapTimeBlockToInsert = (block: TimeBlock, userId: string): TimeBlockInsert => ({
  user_id: userId,
  title: block.title,
  start_time: block.startTime,
  end_time: block.endTime,
  category: block.category,
  date: block.date,
  completed: block.completed ?? false,
  status: block.status ?? 'planned',
  actual_start_time: block.actualStartTime ?? null,
  actual_end_time: block.actualEndTime ?? null,
  external_event: block.externalEvent ?? false,
  external_id: block.externalEvent ? block.id : null,
  sub_tasks: block.subTasks ?? [],
  paused_duration: block.pausedDuration ?? 0,
});

const mapUpdatesToDb = (updates: Partial<TimeBlock>): TimeBlockUpdate => {
  const payload: TimeBlockUpdate = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.startTime !== undefined) payload.start_time = updates.startTime;
  if (updates.endTime !== undefined) payload.end_time = updates.endTime;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.completed !== undefined) payload.completed = updates.completed;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.actualStartTime !== undefined) payload.actual_start_time = updates.actualStartTime;
  if (updates.actualEndTime !== undefined) payload.actual_end_time = updates.actualEndTime;
  if (updates.pausedDuration !== undefined) payload.paused_duration = updates.pausedDuration;
  if (updates.subTasks !== undefined) payload.sub_tasks = updates.subTasks;
  return payload;
};

export const useTimeBlocks = () => {
  const { user } = useAuth();
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const timeBlocksRef = useRef<TimeBlock[]>([]);

  const syncState = useCallback((updater: (blocks: TimeBlock[]) => TimeBlock[]) => {
    setTimeBlocks(prev => {
      const next = updater(prev);
      timeBlocksRef.current = next;
      return next;
    });
  }, []);

  // Fetch time blocks from database
  useEffect(() => {
    if (!user) {
      setTimeBlocks([]);
      timeBlocksRef.current = [];
      setLoading(false);
      return;
    }

    const fetchTimeBlocks = async () => {
      try {
        const result = await retry(
          async () => {
            const response = await supabase
              .from('time_blocks')
              .select('*')
              .eq('user_id', user.id)
              .order('date', { ascending: true })
              .order('start_time', { ascending: true });

            if (response.error) {
              throw response.error;
            }
            return response;
          },
          {
            maxRetries: 3,
            delay: 1000,
            retryCondition: isRetryableError,
          }
        );

        if (result.data) {
          const formatted = result.data.map(mapRowToTimeBlock);
          setTimeBlocks(formatted);
          timeBlocksRef.current = formatted;
        } else if (result.error) {
          throw result.error;
        }
      } catch (error) {
        console.error('Error fetching time blocks:', error);
        const message = error instanceof Error ? error.message : 'Errore nel caricamento delle attività';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeBlocks();

    const handleRealtimeChange = (payload: RealtimePostgresChangesPayload<TimeBlockRow>) => {
      if (!payload.new && !payload.old) return;

      syncState(current => {
        switch (payload.eventType) {
          case 'INSERT': {
            if (!payload.new) return current;
            const inserted = mapRowToTimeBlock(payload.new);
            const exists = current.some(block => block.id === inserted.id);
            return exists ? current : [...current, inserted].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
          }
          case 'UPDATE': {
            if (!payload.new) return current;
            const updated = mapRowToTimeBlock(payload.new);
            return current
              .map(block => (block.id === updated.id ? updated : block))
              .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
          }
          case 'DELETE': {
            if (!payload.old) return current;
            return current.filter(block => block.id !== payload.old.id);
          }
          default:
            return current;
        }
      });
    };

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_blocks',
          filter: `user_id=eq.${user.id}`,
        },
        handleRealtimeChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncState, user]);

  const addTimeBlock = useCallback(async (block: TimeBlock) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

    const temporaryId = `temp-${Date.now()}`;
    const optimisticBlock: TimeBlock = { ...block, id: temporaryId };

    syncState(prev => [...prev, optimisticBlock]);

    try {
      const result = await retry(
        async () => {
          const response = await supabase
            .from('time_blocks')
            .insert(mapTimeBlockToInsert(block, user.id))
            .select()
            .single();

          if (response.error) {
            throw response.error;
          }
          return response;
        },
        {
          maxRetries: 2,
          delay: 500,
          retryCondition: isRetryableError,
        }
      );

      if (result.data) {
        const inserted = mapRowToTimeBlock(result.data);
        syncState(prev => prev.map(item => (item.id === temporaryId ? inserted : item)));
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Error adding time block:', error);
      syncState(prev => prev.filter(item => item.id !== temporaryId));
      const message = error instanceof Error ? error.message : 'Errore nell\'aggiunta dell\'attività';
      toast.error(message);
      throw error;
    }
  }, [syncState, user]);

  const updateTimeBlock = useCallback(async (id: string, updates: Partial<TimeBlock>) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

    const previous = timeBlocksRef.current.find(block => block.id === id);
    if (!previous) {
      return;
    }

    const optimistic = { ...previous, ...updates } as TimeBlock;
    syncState(prev => prev.map(block => (block.id === id ? optimistic : block)));

    try {
      const result = await retry(
        async () => {
          const response = await supabase
            .from('time_blocks')
            .update(mapUpdatesToDb(updates))
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

          if (response.error) {
            throw response.error;
          }
          return response;
        },
        {
          maxRetries: 2,
          delay: 500,
          retryCondition: isRetryableError,
        }
      );

      if (result.data) {
        const updated = mapRowToTimeBlock(result.data);
        syncState(prev => prev.map(block => (block.id === id ? updated : block)));
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Error updating time block:', error);
      syncState(prev => prev.map(block => (block.id === id && previous ? previous : block)));
      const message = error instanceof Error ? error.message : 'Errore nell\'aggiornamento dell\'attività';
      toast.error(message);
      throw error;
    }
  }, [syncState, user]);

  const deleteTimeBlock = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

    const previous = timeBlocksRef.current;
    syncState(prev => prev.filter(block => block.id !== id));

    try {
      const result = await retry(
        async () => {
          const response = await supabase
            .from('time_blocks')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (response.error) {
            throw response.error;
          }
          return response;
        },
        {
          maxRetries: 2,
          delay: 500,
          retryCondition: isRetryableError,
        }
      );

      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Error deleting time block:', error);
      syncState(() => previous);
      const message = error instanceof Error ? error.message : 'Errore nell\'eliminazione dell\'attività';
      toast.error(message);
      throw error;
    }
  }, [syncState, user]);

  const getBlocksForDate = useCallback((date: string) => {
    return timeBlocks.filter(block => block.date === date);
  }, [timeBlocks]);

  return {
    timeBlocks,
    addTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    getBlocksForDate,
    loading,
  };
};
