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
          'fixed inset-0 z-[55] bg-background/60 backdrop-blur-sm transition-opacity',
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
        className="fixed inset-x-0 bottom-[72px] z-[60] mx-auto flex max-w-2xl flex-col rounded-t-3xl border-t border-border/60 bg-card/95 shadow-[0_-20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl"
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

export default TaskPoolDrawer;
