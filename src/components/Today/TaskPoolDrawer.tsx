import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { TaskPoolTask, CategoryType, DEFAULT_CATEGORIES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, Folder, Loader2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskPoolRow } from './TaskPoolRow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty, CommandInput } from '@/components/ui/command';

const HANDLE_HEIGHT = 52;
const CATEGORY_OPTIONS = DEFAULT_CATEGORIES.map(category => ({
  id: category.id,
  name: category.name,
  color: category.color,
}));

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
  categoryMenuOpen?: boolean;
  onCategoryMenuOpenChange?: (open: boolean) => void;
  isDraggingFromPool?: boolean;
}

export const TaskPoolDrawer = ({
  tasks,
  loading,
  state,
  onStateChange,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  categoryMenuOpen,
  onCategoryMenuOpenChange,
  isDraggingFromPool = false,
}: TaskPoolDrawerProps) => {
  const [viewportHeight, setViewportHeight] = useState<number>(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryType>('other');
  const [adding, setAdding] = useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const categoryOpen = categoryMenuOpen ?? uncontrolledOpen;
  const setCategoryOpen = useCallback(
    (open: boolean) => {
      if (categoryMenuOpen === undefined) {
        setUncontrolledOpen(open);
      }
      onCategoryMenuOpenChange?.(open);
    },
    [categoryMenuOpen, onCategoryMenuOpenChange],
  );
  const selectedCategory = useMemo(() => CATEGORY_OPTIONS.find(option => option.id === newTaskCategory) ?? CATEGORY_OPTIONS[0], [newTaskCategory]);

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
      stiffness: 190,
      damping: 24,
      mass: 0.9,
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
      <button
        type="button"
        className={cn(
          'fixed inset-0 z-[40] bg-background/45 transition-opacity duration-200',
          isOpen && !isDraggingFromPool ? 'pointer-events-auto opacity-100 backdrop-blur-sm' : 'pointer-events-none opacity-0 backdrop-blur-0',
        )}
        onClick={() => onStateChange('closed')}
      />

      <motion.div
        drag="y"
        dragMomentum={false}
        dragConstraints={{ top: -20, bottom: yPositions.closed }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        style={{ y: motionY, height: sheetHeight }}
        className="pointer-events-auto fixed bottom-[96px] right-4 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col rounded-[32px] border border-border/40 bg-card/95 shadow-[0_-32px_70px_-40px_rgba(15,23,42,0.45)] transition-colors sm:right-6"
      >
        <button
          type="button"
          className="pointer-events-auto flex h-16 items-center justify-between px-7 text-sm font-medium text-muted-foreground"
          onClick={() => onStateChange(state === 'peek' ? 'closed' : 'peek')}
        >
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-muted/70">
              <Folder className="h-4 w-4 text-muted-foreground/80" />
            </span>
            <div className="flex flex-col text-left">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">Task-Pool</span>
              <span className="text-sm font-semibold text-foreground">{taskCount} {taskCount === 1 ? 'attività' : 'attività'}</span>
            </div>
          </span>
          <span className="relative flex h-6 w-16 items-center justify-center">
            <span className="absolute inset-x-4 top-0 h-1 rounded-full bg-muted-foreground/40" />
          </span>
        </button>

        <div className="pointer-events-auto flex-1 overflow-hidden px-4 pb-6">
          <div className="mx-auto h-full max-w-lg">
            <form onSubmit={handleAddTask} className="mb-5 flex flex-col gap-3 rounded-[28px] border border-border/60 bg-background/70 p-3.5 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  placeholder="Aggiungi attività rapida..."
                  value={newTaskTitle}
                  onChange={event => setNewTaskTitle(event.target.value)}
                  className="h-12 flex-1 rounded-[20px] border border-border/60 bg-card/70 px-4 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-11 min-w-[160px] items-center justify-between gap-3 rounded-full border border-border/60 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/30 focus:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: selectedCategory.color }}
                        />
                        {selectedCategory.name}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    sideOffset={12}
                    collisionPadding={16}
                    className="z-[80] w-[220px] rounded-2xl border border-border/40 bg-card/95 p-0 shadow-xl backdrop-blur-xl"
                  >
                    <Command>
                      <CommandInput placeholder="Cerca..." className="h-10 border-0 text-sm focus-visible:ring-0" />
                      <CommandList>
                        <CommandEmpty>Nessuna categoria</CommandEmpty>
                        <CommandGroup>
                          {CATEGORY_OPTIONS.map(option => (
                            <CommandItem
                              key={option.id}
                              value={option.id}
                              className="flex items-center gap-3 px-4 py-2"
                              onSelect={(value) => {
                                setNewTaskCategory(value as CategoryType);
                                requestAnimationFrame(() => setCategoryOpen(false));
                              }}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: option.color }}
                              />
                              <span className="flex-1 text-sm">{option.name}</span>
                              {option.id === newTaskCategory && <Check className="h-4 w-4 text-primary" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="submit" size="icon" disabled={adding} className="ml-auto h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
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
