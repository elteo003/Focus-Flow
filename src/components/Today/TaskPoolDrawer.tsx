import { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { TaskPoolTask, CategoryType, DEFAULT_CATEGORIES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, Folder, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskPoolRow } from './TaskPoolRow';

const HANDLE_HEIGHT = 52;

type DrawerState = 'closed' | 'peek' | 'expanded';

export interface TaskPoolDrawerProps {
  tasks: TaskPoolTask[];
  loading: boolean;
  state: DrawerState;
  onStateChange: (state: DrawerState) => void;
  onAddTask: (title: string, category: CategoryType) => Promise<void>;
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (id: string) => void;
}

export const TaskPoolDrawer = ({
  tasks,
  loading,
  state,
  onStateChange,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskPoolDrawerProps) => {
  const [viewportHeight, setViewportHeight] = useState<number>(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryType>('other');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sheetHeight = useMemo(() => Math.min(viewportHeight * 0.85, 720), [viewportHeight]);
  const peekHeight = useMemo(() => Math.max(sheetHeight * 0.35, 320), [sheetHeight]);

  const yPositions = useMemo(
    () => ({
      closed: sheetHeight - HANDLE_HEIGHT,
      peek: sheetHeight - peekHeight,
      expanded: 0,
    }),
    [peekHeight, sheetHeight],
  );

  const motionY = useMotionValue(yPositions[state]);

  useEffect(() => {
    const animation = animate(motionY, yPositions[state], {
      type: 'spring',
      stiffness: 240,
      damping: 28,
    });
    return animation.stop;
  }, [motionY, state, yPositions]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
    const current = motionY.get();
    const projected = current + info.offset.y + info.velocity.y * 0.2;
    const clamped = Math.max(0, Math.min(projected, yPositions.closed));

    const distances = (Object.keys(yPositions) as DrawerState[]).map(key => ({
      key,
      distance: Math.abs(yPositions[key] - clamped),
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const closest = distances[0]?.key ?? 'closed';
    onStateChange(closest);
  };

  const isOpen = state !== 'closed';

  const handleAddTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setAdding(true);
      await onAddTask(newTaskTitle.trim(), newTaskCategory);
      setNewTaskTitle('');
      setNewTaskCategory('other');
    } finally {
      setAdding(false);
    }
  };

  const taskCount = tasks.length;

  return (
    <>
      <motion.div
        className={cn(
          'fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ visibility: isOpen ? 'visible' : 'hidden' }}
        onClick={() => onStateChange('closed')}
      />

      <motion.div
        drag="y"
        dragMomentum={false}
        dragConstraints={{ top: -10, bottom: yPositions.closed }}
        onDragEnd={handleDragEnd}
        style={{ y: motionY, height: sheetHeight }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-2xl flex-col rounded-t-3xl border-t border-border/60 bg-card/95 shadow-[0_-20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      >
        <button
          type="button"
          className="pointer-events-auto flex h-16 items-center justify-between px-6 text-sm font-medium text-muted-foreground"
          onClick={() => onStateChange(state === 'peek' ? 'closed' : 'peek')}
        >
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
              <Folder className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs uppercase tracking-wide text-muted-foreground/70">Task-Pool</span>
              <span className="text-sm font-semibold text-foreground">
                {taskCount} {taskCount === 1 ? 'attività' : 'attività'}
              </span>
            </div>
          </span>
          <span className="relative flex h-6 w-16 items-center justify-center">
            <span className="absolute inset-x-4 top-0 h-1 rounded-full bg-muted-foreground/40" />
          </span>
        </button>

        <div className="pointer-events-auto flex-1 overflow-hidden px-4 pb-6">
          <div className="mx-auto h-full max-w-lg">
            <form onSubmit={handleAddTask} className="mb-4 flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 backdrop-blur">
              <Input
                placeholder="Aggiungi attività rapida..."
                value={newTaskTitle}
                onChange={event => setNewTaskTitle(event.target.value)}
                className="border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <select
                value={newTaskCategory}
                onChange={event => setNewTaskCategory(event.target.value as CategoryType)}
                className="rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-xs text-muted-foreground focus:outline-none"
              >
                {DEFAULT_CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="icon" disabled={adding} className="h-9 w-9 rounded-full">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </form>

            <div className="relative h-full overflow-y-auto pb-20">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Caricamento...
                </div>
              ) : taskCount === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <Folder className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Il tuo Task-Pool è vuoto. Aggiungi attività da usare più tardi.</p>
                </div>
              ) : (
                <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy} id="task-pool">
                  <ul className="space-y-2">
                    {tasks.map(task => (
                      <TaskPoolRow
                        key={task.id}
                        task={task}
                        onToggle={() => onToggleTask(task.id, !task.completed)}
                        onDelete={() => onDeleteTask(task.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripHorizontal, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CategoryType, DEFAULT_CATEGORIES, TaskPoolTask } from '@/types';
import { cn } from '@/lib/utils';

export type DrawerState = 'closed' | 'peek' | 'expanded';

interface TaskPoolDrawerProps {
  tasks: TaskPoolTask[];
  state: DrawerState;
  onStateChange: (next: DrawerState) => void;
  onAddTask: (title: string, category: CategoryType) => Promise<void> | void;
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onStartDrag: (task: TaskPoolTask, originRect: DOMRect, pointerEvent: PointerEvent) => void;
  draggingTaskId: string | null;
}

const HANDLE_HEIGHT = 56;
const PEEK_RATIO = 0.38;
const EXPANDED_RATIO = 0.84;

const getViewportHeight = () => {
  if (typeof window === 'undefined') return 800;
  return window.innerHeight;
};

const categoryOptions = DEFAULT_CATEGORIES.map(category => ({
  id: category.id,
  label: category.name,
  color: category.color,
}));

const categoryMap = new Map(categoryOptions.map(option => [option.id, option]));

const TaskPoolDrawer = ({
  tasks,
  state,
  onStateChange,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onStartDrag,
  draggingTaskId,
}: TaskPoolDrawerProps) => {
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [ready, setReady] = useState(false);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const dragMetaRef = useRef<{ startY: number; startOffset: number } | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryType>('other');
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    const handleResize = () => setViewportHeight(getViewportHeight());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layout = useMemo(() => {
    const expandedHeight = Math.min(viewportHeight * EXPANDED_RATIO, viewportHeight - 80);
    const peekHeight = Math.max(expandedHeight * PEEK_RATIO, 280);
    const expandedOffset = 0;
    const peekOffset = Math.max(expandedHeight - peekHeight, 0);
    const closedOffset = Math.max(expandedHeight - HANDLE_HEIGHT, 0);

    return {
      expandedHeight,
      peekHeight,
      expandedOffset,
      peekOffset,
      closedOffset,
    };
  }, [viewportHeight]);

  useEffect(() => {
    const target =
      state === 'expanded'
        ? layout.expandedOffset
        : state === 'peek'
          ? layout.peekOffset
          : layout.closedOffset;
    if (!isDraggingHandle) {
      setCurrentOffset(target);
    }
  }, [state, layout, isDraggingHandle]);

  useEffect(() => {
    if (!ready) {
      setCurrentOffset(layout.closedOffset);
      setReady(true);
    }
  }, [ready, layout.closedOffset]);

  const clampOffset = useCallback(
    (value: number) =>
      Math.max(layout.expandedOffset, Math.min(layout.closedOffset, value)),
    [layout.expandedOffset, layout.closedOffset],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragMetaRef.current = {
      startY: event.clientY,
      startOffset: currentOffset,
    };
    setIsDraggingHandle(true);
    const handleMove = (e: PointerEvent) => {
      if (!dragMetaRef.current) return;
      const delta = e.clientY - dragMetaRef.current.startY;
      const next = clampOffset(dragMetaRef.current.startOffset + delta);
      setCurrentOffset(next);
    };
    const handleUp = (e: PointerEvent) => {
      if (!dragMetaRef.current) return;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      const delta = e.clientY - dragMetaRef.current.startY;
      const finalOffset = clampOffset(dragMetaRef.current.startOffset + delta);
      const midpointPeek = (layout.peekOffset + layout.closedOffset) / 2;
      const midpointExpanded = (layout.peekOffset + layout.expandedOffset) / 2;

      if (finalOffset > midpointPeek) {
        onStateChange('closed');
      } else if (finalOffset > midpointExpanded) {
        onStateChange('peek');
      } else {
        onStateChange('expanded');
      }
      dragMetaRef.current = null;
      setIsDraggingHandle(false);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });
  }, [clampOffset, currentOffset, layout.peekOffset, layout.closedOffset, layout.expandedOffset, onStateChange]);

  const cycleState = useCallback(() => {
    if (state === 'closed') {
      onStateChange('peek');
    } else if (state === 'peek') {
      onStateChange('expanded');
    } else {
      onStateChange('closed');
    }
  }, [state, onStateChange]);

  const handleAddTask = useCallback(async () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    setIsAddingTask(true);
    try {
      await onAddTask(trimmed, newTaskCategory);
      setNewTaskTitle('');
    } finally {
      setIsAddingTask(false);
    }
  }, [newTaskTitle, newTaskCategory, onAddTask]);

  const handleTaskKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleAddTask();
    }
  };

  const taskCount = tasks.length;
  const overlayVisible = state === 'peek' || state === 'expanded';
  const transitionActive = ready && !isDraggingHandle;

  return (
    <>
      {overlayVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: state === 'expanded' ? 1 : 0.7 }}
          onClick={() => onStateChange('closed')}
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pointer-events-none">
        <div
          className={cn(
            'mx-auto max-w-2xl rounded-t-3xl border border-border/60 bg-card/95 shadow-[0_-16px_60px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl pointer-events-auto flex flex-col',
          )}
          style={{
            height: layout.expandedHeight,
            transform: `translateY(${currentOffset}px)`,
            transition: transitionActive ? 'transform 420ms cubic-bezier(0.33,1,0.68,1)' : 'none',
            touchAction: 'none',
          }}
        >
          <button
            className="flex items-center justify-center gap-3 px-6 py-4 text-sm font-medium text-muted-foreground"
            onClick={cycleState}
            onPointerDown={handlePointerDown}
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-full bg-muted">
              <GripHorizontal className="h-4 w-4 opacity-80" />
            </span>
            <span className="flex-1 text-left">
              Task-Pool
              <span className="ml-2 text-xs text-muted-foreground/80">
                ({taskCount} {taskCount === 1 ? 'attività' : 'attività'})
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full"
              onClick={(event) => {
                event.stopPropagation();
                if (state === 'closed') {
                  onStateChange('peek');
                }
              }}
            >
              {state === 'expanded' ? 'Chiudi' : 'Apri'}
            </Button>
          </button>

          <div className="px-6 pb-4">
            <div className="rounded-2xl border border-border/80 bg-background/60 p-3 shadow-inner">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Aggiungi nuova attività
                </span>
                <Button
                  size="sm"
                  disabled={isAddingTask || !newTaskTitle.trim()}
                  onClick={() => void handleAddTask()}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Aggiungi
                </Button>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="Es. Chiamare dentista"
                  onKeyDown={handleTaskKeyDown}
                />
                <Select
                  value={newTaskCategory}
                  onValueChange={(value) => setNewTaskCategory(value as CategoryType)}
                >
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-6 pb-20">
              {tasks.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <p className="font-medium">Il tuo Task-Pool è vuoto</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    Aggiungi attività rapide qui e trascinale nella tua giornata quando sei pronto.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {tasks.map(task => {
                    const category = categoryMap.get(task.category);
                    const isDragging = draggingTaskId === task.id;
                    return (
                      <li
                        key={task.id}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 shadow-sm transition-all duration-200',
                          task.completed && 'opacity-70',
                          isDragging && 'opacity-0',
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(value) => onToggleTask(task.id, Boolean(value))}
                          className="h-5 w-5 rounded-lg border-border/70"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {task.title}
                          </p>
                          {category && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {category.label}
                            </p>
                          )}
                        </div>
                        {category && (
                          <Badge
                            variant="secondary"
                            className="pointer-events-none whitespace-nowrap border border-border/50 bg-background/70"
                            style={{ color: category.color }}
                          >
                            {category.label.charAt(0)}
                          </Badge>
                        )}
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-muted-foreground transition hover:text-primary"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const nativeEvent = event.nativeEvent;
                            const target = event.currentTarget;
                            const originRect = target.getBoundingClientRect();
                            const timeout = window.setTimeout(() => {
                              onStartDrag(task, originRect, nativeEvent);
                            }, 120);
                            const cancel = () => {
                              clearTimeout(timeout);
                              target.removeEventListener('pointerup', cancel);
                              target.removeEventListener('pointerleave', cancel);
                            };
                            target.addEventListener('pointerup', cancel, { once: true });
                            target.addEventListener('pointerleave', cancel, { once: true });
                          }}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskPoolDrawer;


