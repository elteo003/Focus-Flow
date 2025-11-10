import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { TaskPoolTask, DEFAULT_CATEGORIES } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryMap = DEFAULT_CATEGORIES.reduce<Record<string, { name: string; color: string }>>((accumulator, category) => {
  accumulator[category.id] = { name: category.name, color: category.color };
  return accumulator;
}, {});

interface TaskPoolRowProps {
  task: TaskPoolTask;
  onToggle: () => void;
  onDelete: () => void;
}

export const TaskPoolRow = ({ task, onToggle, onDelete }: TaskPoolRowProps) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'taskPoolTask',
      task,
    },
    attributes: {
      roleDescription: 'Activity to plan',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const category = categoryMap[task.category] ?? categoryMap.other;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-sm transition-all',
        isDragging ? 'z-50 scale-[1.02] border-primary/50 shadow-lg' : 'hover:border-border',
      )}
      {...listeners}
      {...attributes}
    >
      <Checkbox checked={task.completed} onCheckedChange={onToggle} className="h-4 w-4" />

      <div className="flex-1">
        <p className={cn('text-sm font-medium', task.completed && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
        <span
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ color: category.color }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          />
          {category.name}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <span className="flex h-8 w-8 items-center justify-center text-muted-foreground/60 group-active:text-primary">
          <GripVertical className="h-4 w-4" />
        </span>
      </div>
    </li>
  );
};


