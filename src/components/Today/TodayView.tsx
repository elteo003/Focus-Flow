import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Bell, BellOff } from 'lucide-react';
import { DndContext, DragEndEvent, DragMoveEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import TimeSlot from './TimeSlot';
import TimeBlockCard from './TimeBlockCard';
import CurrentTimeLine from './CurrentTimeLine';
import TimeBlockModal from './TimeBlockModal';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useNotifications } from '@/hooks/useNotifications';
import { useTaskPool } from '@/hooks/useTaskPool';
import { formatDate, getCurrentTime, minutesToTime, parseTime, timeToMinutes } from '@/utils/dateUtils';
import { TaskPoolTask, TimeBlock } from '@/types';
import { toast } from 'sonner';
import TaskPoolDrawer from './TaskPoolDrawer';
import { TaskPoolRow } from './TaskPoolRow';

const PIXELS_PER_HOUR = 64;
const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 24 * 60;

type DrawerState = 'closed' | 'peek' | 'expanded';

const TodayView = () => {
  const { getBlocksForDate, updateTimeBlock, addTimeBlock } = useTimeBlocks();
  const { permission, requestPermission, scheduleNotifications } = useNotifications();
  const {
    tasks: taskPoolTasks,
    remainingTasks,
    loading: taskPoolLoading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    defaultDuration,
  } = useTaskPool();

  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [drawerState, setDrawerState] = useState<DrawerState>('closed');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{ start: string; end: string } | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const previousDrawerStateRef = useRef<DrawerState>('closed');

  const today = formatDate(new Date());
  const todayBlocks = getBlocksForDate(today);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const currentHour = parseTime(currentTime).hours;
  const gridRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
  );

  const resetDragState = useCallback(() => {
    setDraggingTaskId(null);
    setDropPreview(null);
    setIsCategoryMenuOpen(false);
    pointerRef.current = { x: 0, y: 0 };
    initialPointerRef.current = { x: 0, y: 0 };
    setDrawerState(previousDrawerStateRef.current);
  }, []);

  useEffect(() => {
    if (!selectedBlock) return;
    const updated = todayBlocks.find(block => block.id === selectedBlock.id);
    if (updated && updated !== selectedBlock) {
      setSelectedBlock(updated);
    }
  }, [selectedBlock, todayBlocks]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (permission === 'granted') {
      scheduleNotifications(todayBlocks);
      const interval = setInterval(() => {
        scheduleNotifications(todayBlocks);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [todayBlocks, permission, scheduleNotifications]);

  const handleRequestNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notifiche abilitate');
    } else {
      toast.error('Permesso notifiche negato');
    }
  };

  const hours = useMemo(() => Array.from({ length: 18 }, (_, index) => index + 6), []);

  const handleBlockClick = (block: TimeBlock) => {
    setSelectedBlock(block);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedBlock(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const getDropSlotFromPointer = useCallback(
    (coordinates: { x: number; y: number }) => {
      const grid = gridRef.current;
      if (!grid) return null;

      const rect = grid.getBoundingClientRect();
      if (
        coordinates.y < rect.top ||
        coordinates.y > rect.bottom ||
        coordinates.x < rect.left ||
        coordinates.x > rect.right
      ) {
        return null;
      }

      const relativeY = coordinates.y - rect.top;
      const minutesPerPixel = 60 / PIXELS_PER_HOUR;
      const minutesOffset = relativeY * minutesPerPixel;
      const absoluteMinutes = DAY_START_MINUTES + minutesOffset;

      const snappedMinutes = Math.max(
        DAY_START_MINUTES,
        Math.min(
          23 * 60,
          Math.round(absoluteMinutes / 15) * 15,
        ),
      );

      const duration = defaultDuration ?? 60;
      const endMinutes = Math.min(DAY_END_MINUTES, snappedMinutes + duration);

      return {
        start: minutesToTime(snappedMinutes),
        end: minutesToTime(endMinutes),
      };
    },
    [defaultDuration],
  );

  const updateDropPreview = useCallback(
    (coords: { x: number; y: number }) => {
      const slot = getDropSlotFromPointer(coords);
      setDropPreview(slot);
    },
    [getDropSlotFromPointer],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = taskPoolTasks.find(item => item.id === event.active.id);
      if (!task) return;
      setDraggingTaskId(task.id);
      setIsCategoryMenuOpen(false);
      previousDrawerStateRef.current = drawerState;
      setDrawerState('closed');
      const activator = event.activatorEvent;
      if ('clientX' in activator && 'clientY' in activator) {
        const pointer = { x: activator.clientX, y: activator.clientY };
        pointerRef.current = pointer;
        initialPointerRef.current = pointer;
        updateDropPreview(pointerRef.current);
      }
    },
    [taskPoolTasks, updateDropPreview, drawerState],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!draggingTaskId) return;
      pointerRef.current = {
        x: initialPointerRef.current.x + event.delta.x,
        y: initialPointerRef.current.y + event.delta.y,
      };
      updateDropPreview(pointerRef.current);
    },
    [draggingTaskId, updateDropPreview],
  );

  const scheduleTask = useCallback(
    async (task: TaskPoolTask, slot: { start: string; end: string }) => {
      try {
        const newBlock: TimeBlock = {
          id: `${Date.now()}-${Math.random()}`,
          title: task.title,
          startTime: slot.start,
          endTime: slot.end,
          category: task.category,
          subTasks: [],
          date: today,
          completed: false,
          status: 'planned',
          pausedDuration: 0,
        };
        await addTimeBlock(newBlock);
        await deleteTask(task.id);
        toast.success(`"${task.title}" aggiunta alla giornata`);
      } catch (error) {
        console.error('Errore nella programmazione dal Task-Pool', error);
        toast.error('Impossibile programmare l\'attività');
      }
    },
    [addTimeBlock, deleteTask, today],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const activeTask = taskPoolTasks.find(item => item.id === active.id);

      if (!activeTask) {
        resetDragState();
        return;
      }

      const activeContainer = active.data.current?.sortable?.containerId;
      const overContainer = over?.data.current?.sortable?.containerId;

      if (activeContainer === 'task-pool' && overContainer === 'task-pool' && over) {
        if (active.id !== over.id) {
          const oldIndex = taskPoolTasks.findIndex(task => task.id === active.id);
          const newIndex = taskPoolTasks.findIndex(task => task.id === over.id);
          const reordered = arrayMove(taskPoolTasks, oldIndex, newIndex);
          await reorderTasks(reordered);
        }
        resetDragState();
        return;
      }

      const slot = getDropSlotFromPointer(pointerRef.current);
      if (slot) {
        await scheduleTask(activeTask, slot);
      }

      resetDragState();
    },
    [getDropSlotFromPointer, reorderTasks, resetDragState, scheduleTask, taskPoolTasks],
  );

  const draggingTask = useMemo(() => taskPoolTasks.find(task => task.id === draggingTaskId) ?? null, [draggingTaskId, taskPoolTasks]);

  useEffect(() => {
    if (draggingTaskId && drawerState === 'closed') {
      setDrawerState('peek');
    }
  }, [draggingTaskId, drawerState]);

  const handleToggleTask = useCallback(
    (id: string, completed: boolean) => {
      void updateTask(id, { completed });
    },
    [updateTask],
  );

  const handleDeleteTask = useCallback(
    (id: string) => {
      void deleteTask(id);
    },
    [deleteTask],
  );

  const handleAddTask = useCallback(
    async (title: string, category: string) => {
      await addTask({
        title,
        category: category as TaskPoolTask['category'],
        completed: false,
        position: taskPoolTasks.length,
      });
    },
    [addTask, taskPoolTasks.length],
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="pb-20">
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-bold">Oggi</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            <div className="flex gap-2">
              {permission !== 'granted' ? (
                <Button onClick={handleRequestNotifications} size="icon" variant="outline" className="rounded-full">
                  <BellOff className="h-5 w-5" />
                </Button>
              ) : (
                <Button size="icon" variant="outline" className="rounded-full" disabled>
                  <Bell className="h-5 w-5" />
                </Button>
              )}
              <Button onClick={handleCreateNew} size="icon" className="rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-2xl">
          <div className="relative" ref={gridRef}>
            {hours.map(hour => (
              <TimeSlot key={hour} hour={hour} isCurrentHour={hour === currentHour} />
            ))}

            <CurrentTimeLine />

            {dropPreview && (
              <div
                className="pointer-events-none absolute left-16 right-4"
                style={{
                  top: `${((timeToMinutes(dropPreview.start) - DAY_START_MINUTES) / 60) * PIXELS_PER_HOUR}px`,
                  height: `${((timeToMinutes(dropPreview.end) - timeToMinutes(dropPreview.start)) / 60) * PIXELS_PER_HOUR}px`,
                }}
              >
                <div className="h-full rounded-lg border-2 border-dashed border-primary/70 bg-primary/10" />
              </div>
            )}

            {todayBlocks.map(block => (
              <TimeBlockCard key={block.id} block={block} onClick={() => handleBlockClick(block)} currentTime={currentTime} />
            ))}
          </div>
        </div>

        <TimeBlockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          block={selectedBlock}
          isCreating={isCreating}
          date={today}
        />
      </div>

      <TaskPoolDrawer
        tasks={remainingTasks}
        loading={taskPoolLoading}
        state={drawerState}
        onStateChange={setDrawerState}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        categoryMenuOpen={isCategoryMenuOpen}
        onCategoryMenuOpenChange={setIsCategoryMenuOpen}
      />

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }}>
        {draggingTask ? (
          <div className="w-[90vw] max-w-lg">
            <TaskPoolRow task={draggingTask} onToggle={() => {}} onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TodayView;
