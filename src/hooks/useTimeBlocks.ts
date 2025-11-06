import { useState, useEffect, useCallback } from 'react';
import { TimeBlock } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { retry, isRetryableError } from '@/lib/retry';

export const useTimeBlocks = () => {
  const { user } = useAuth();
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch time blocks from database
  useEffect(() => {
    if (!user) {
      setTimeBlocks([]);
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
            retryCondition: (err) => isRetryableError(err),
          }
        );

        const { data, error } = result;
        if (error) {
          throw error;
        }

        const formatted: TimeBlock[] = (data || []).map(block => ({
          id: block.id,
          title: block.title,
          startTime: block.start_time,
          endTime: block.end_time,
          category: block.category as any,
          date: block.date,
          completed: block.completed,
          status: block.status as any,
          actualStartTime: block.actual_start_time || undefined,
          actualEndTime: block.actual_end_time || undefined,
          pausedDuration: (block as any).paused_duration || undefined,
          externalEvent: block.external_event || false,
          subTasks: (block.sub_tasks as any) || [],
        }));
        setTimeBlocks(formatted);
      } catch (error: any) {
        console.error('Error fetching time blocks:', error);
        toast.error(error?.message || 'Errore nel caricamento delle attività');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeBlocks();

    // Set up realtime subscription
    const channel = supabase
      .channel('time_blocks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_blocks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTimeBlocks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addTimeBlock = useCallback(async (block: TimeBlock) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

    try {
      const result = await retry(
        async () => {
          const response = await supabase
            .from('time_blocks')
            .insert({
              user_id: user.id,
              title: block.title,
              start_time: block.startTime,
              end_time: block.endTime,
              category: block.category,
              date: block.date,
              completed: block.completed || false,
              status: block.status || 'planned',
              actual_start_time: block.actualStartTime || null,
              actual_end_time: block.actualEndTime || null,
              external_event: block.externalEvent || false,
              external_id: block.externalEvent ? block.id : null,
              sub_tasks: block.subTasks || [],
            } as any);
          
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

      if (result.error) throw result.error;
    } catch (error: any) {
      console.error('Error adding time block:', error);
      toast.error(error?.message || 'Errore nell\'aggiunta dell\'attività');
      throw error;
    }
  }, [user]);

  const updateTimeBlock = useCallback(async (id: string, updates: Partial<TimeBlock>) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.actualStartTime !== undefined) updateData.actual_start_time = updates.actualStartTime;
    if (updates.actualEndTime !== undefined) updateData.actual_end_time = updates.actualEndTime;
    if (updates.pausedDuration !== undefined) updateData.paused_duration = updates.pausedDuration;
    if (updates.subTasks !== undefined) updateData.sub_tasks = updates.subTasks;

    try {
      const result = await retry(
        async () => {
          const response = await supabase
            .from('time_blocks')
            .update(updateData)
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

      if (result.error) throw result.error;
    } catch (error: any) {
      console.error('Error updating time block:', error);
      toast.error(error?.message || 'Errore nell\'aggiornamento dell\'attività');
      throw error;
    }
  }, [user]);

  const deleteTimeBlock = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

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

      if (result.error) throw result.error;
    } catch (error: any) {
      console.error('Error deleting time block:', error);
      toast.error(error?.message || 'Errore nell\'eliminazione dell\'attività');
      throw error;
    }
  }, [user]);

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
