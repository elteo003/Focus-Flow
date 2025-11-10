import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TaskPoolTask, CategoryType, DEFAULT_TASK_POOL_DURATION_MINUTES } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { retry, isRetryableError } from '@/lib/retry';

type TaskPoolRow = Tables<'task_pool'>;
type TaskPoolInsert = TablesInsert<'task_pool'>;
type TaskPoolUpdate = TablesUpdate<'task_pool'>;

const CHANNEL_NAME = 'task_pool_changes';

const mapRowToTask = (row: TaskPoolRow): TaskPoolTask => ({
  id: row.id,
  title: row.title,
  category: row.category as CategoryType,
  completed: row.completed,
  position: row.position,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTaskToInsert = (task: Omit<TaskPoolTask, 'id' | 'createdAt' | 'updatedAt'>, userId: string): TaskPoolInsert => ({
  title: task.title,
  category: task.category,
  completed: task.completed,
  position: task.position,
  notes: task.notes ?? null,
  user_id: userId,
});

const mapUpdatesToDb = (updates: Partial<TaskPoolTask>): TaskPoolUpdate => {
  const payload: TaskPoolUpdate = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.completed !== undefined) payload.completed = updates.completed;
  if (updates.position !== undefined) payload.position = updates.position;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  return payload;
};

export interface UseTaskPoolOptions {
  includeCompleted?: boolean;
}

export const useTaskPool = ({ includeCompleted = false }: UseTaskPoolOptions = {}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskPoolTask[]>([]);
  const [loading, setLoading] = useState(true);
  const tasksRef = useRef<TaskPoolTask[]>([]);

  const syncState = useCallback((updater: (current: TaskPoolTask[]) => TaskPoolTask[]) => {
    setTasks(prev => {
      const next = updater(prev);
      tasksRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      tasksRef.current = [];
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        const result = await retry(
          async () => {
            const query = supabase
              .from('task_pool')
              .select('*')
              .eq('user_id', user.id)
              .order('position', { ascending: true });

            if (!includeCompleted) {
              query.eq('completed', false);
            }

            const response = await query;
            if (response.error) {
              throw response.error;
            }
            return response;
          },
          {
            maxRetries: 3,
            delay: 800,
            retryCondition: isRetryableError,
          },
        );

        if (result.data) {
          const formatted = result.data.map(mapRowToTask);
          setTasks(formatted);
          tasksRef.current = formatted;
        } else if (result.error) {
          throw result.error;
        }
      } catch (error) {
        console.error('Error loading task pool', error);
        toast.error('Impossibile caricare il Task-Pool');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    const listener = supabase
      .channel(`${CHANNEL_NAME}_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_pool',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          syncState(current => {
            switch (payload.eventType) {
              case 'INSERT':
                if (!payload.new) return current;
                return [...current, mapRowToTask(payload.new)].sort((a, b) => a.position - b.position);
              case 'UPDATE':
                if (!payload.new) return current;
                return current
                  .map(task => (task.id === payload.new.id ? mapRowToTask(payload.new) : task))
                  .sort((a, b) => a.position - b.position);
              case 'DELETE':
                if (!payload.old) return current;
                return current.filter(task => task.id !== payload.old.id);
              default:
                return current;
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listener);
    };
  }, [includeCompleted, syncState, user]);

  const addTask = useCallback(
    async (task: Omit<TaskPoolTask, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) {
        toast.error('Devi effettuare l\'accesso');
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticTask: TaskPoolTask = { ...task, id: tempId };
      syncState(prev => [...prev, optimisticTask]);

      try {
        const result = await retry(
          async () => {
            const response = await supabase
              .from('task_pool')
              .insert(mapTaskToInsert(task, user.id))
              .select()
              .single();

            if (response.error) throw response.error;
            return response;
          },
          {
            maxRetries: 2,
            delay: 500,
            retryCondition: isRetryableError,
          },
        );

        if (result.data) {
          const inserted = mapRowToTask(result.data);
          syncState(prev => prev.map(item => (item.id === tempId ? inserted : item)));
        }
      } catch (error) {
        console.error('Error adding task pool item', error);
        syncState(prev => prev.filter(item => item.id !== tempId));
        toast.error('Impossibile aggiungere l\'attività');
        throw error;
      }
    },
    [syncState, user],
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<TaskPoolTask>) => {
      if (!user) {
        toast.error('Devi effettuare l\'accesso');
        return;
      }

      const previous = tasksRef.current.find(task => task.id === id);
      if (!previous) return;

      const optimistic = { ...previous, ...updates };
      syncState(prev => prev.map(task => (task.id === id ? optimistic : task)));

      try {
        const result = await retry(
          async () => {
            const response = await supabase
              .from('task_pool')
              .update(mapUpdatesToDb(updates))
              .eq('id', id)
              .eq('user_id', user.id)
              .select()
              .single();

            if (response.error) throw response.error;
            return response;
          },
          {
            maxRetries: 2,
            delay: 400,
            retryCondition: isRetryableError,
          },
        );

        if (result.data) {
          const updated = mapRowToTask(result.data);
          syncState(prev => prev.map(task => (task.id === id ? updated : task)));
        }
      } catch (error) {
        console.error('Error updating task pool item', error);
        syncState(prev => prev.map(task => (task.id === id ? (previous ?? task) : task)));
        toast.error('Impossibile aggiornare l\'attività');
        throw error;
      }
    },
    [syncState, user],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!user) {
        toast.error('Devi effettuare l\'accesso');
        return;
      }

      const previous = tasksRef.current;
      syncState(prev => prev.filter(task => task.id !== id));

      try {
        const result = await retry(
          async () => {
            const response = await supabase
              .from('task_pool')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);

            if (response.error) throw response.error;
            return response;
          },
          {
            maxRetries: 2,
            delay: 500,
            retryCondition: isRetryableError,
          },
        );

        if (result.error) throw result.error;
      } catch (error) {
        console.error('Error deleting task pool item', error);
        syncState(() => previous);
        toast.error('Impossibile eliminare l\'attività');
        throw error;
      }
    },
    [syncState, user],
  );

  const reorderTasks = useCallback(
    async (ordered: TaskPoolTask[]) => {
      const withPositions = ordered.map((task, index) => ({ ...task, position: index }));
      syncState(() => withPositions);

      try {
        const updates = withPositions.map(task =>
          supabase
            .from('task_pool')
            .update({ position: task.position })
            .eq('id', task.id),
        );
        await Promise.all(updates);
      } catch (error) {
        console.error('Error reordering task pool items', error);
        toast.error('Impossibile riordinare le attività');
      }
    },
    [syncState],
  );

  const remainingTasks = useMemo(() => tasks.filter(task => !task.completed), [tasks]);

  return {
    tasks,
    remainingTasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    defaultDuration: DEFAULT_TASK_POOL_DURATION_MINUTES,
  };
};


