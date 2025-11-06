import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Check } from 'lucide-react';
import { TimeBlock, SubTask, DEFAULT_CATEGORIES, CategoryType } from '@/types';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { toast } from 'sonner';

interface TimeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: TimeBlock | null;
  isCreating: boolean;
  date: string;
}

const TimeBlockModal = ({ isOpen, onClose, block, isCreating, date }: TimeBlockModalProps) => {
  const { addTimeBlock, updateTimeBlock, deleteTimeBlock } = useTimeBlocks();
  
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<CategoryType>('work');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  useEffect(() => {
    if (block) {
      setTitle(block.title);
      setStartTime(block.startTime);
      setEndTime(block.endTime);
      setCategory(block.category);
      setSubTasks(block.subTasks);
    } else {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setCategory('work');
      setSubTasks([]);
    }
    setNewSubTaskTitle('');
  }, [block, isOpen]);

  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    
    const newSubTask: SubTask = {
      id: Date.now().toString(),
      title: newSubTaskTitle,
      completed: false,
    };
    
    setSubTasks([...subTasks, newSubTask]);
    setNewSubTaskTitle('');
  };

  const handleToggleSubTask = (id: string) => {
    setSubTasks(subTasks.map(st => 
      st.id === id ? { ...st, completed: !st.completed } : st
    ));
  };

  const handleDeleteSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }

    if (isCreating) {
      const newBlock: TimeBlock = {
        id: Date.now().toString(),
        title,
        startTime,
        endTime,
        category,
        subTasks,
        date,
        completed: false,
        status: 'planned',
      };
      addTimeBlock(newBlock);
      toast.success('Attività creata');
    } else if (block) {
      updateTimeBlock(block.id, {
        title,
        startTime,
        endTime,
        category,
        subTasks,
      });
      toast.success('Attività aggiornata');
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (block) {
      deleteTimeBlock(block.id);
      toast.success('Attività eliminata');
      onClose();
    }
  };

  const handleMarkComplete = () => {
    if (block) {
      updateTimeBlock(block.id, { completed: !block.completed });
      toast.success(block.completed ? 'Attività riaperta' : 'Attività completata');
    }
  };

  const completedCount = subTasks.filter(st => st.completed).length;
  const totalCount = subTasks.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Nuova Attività' : 'Modifica Attività'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Scrivere report"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Inizio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Fine</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub-tasks */}
          <div className="space-y-2">
            <Label>Sotto-task {totalCount > 0 && `(${completedCount}/${totalCount})`}</Label>
            
            <div className="space-y-2">
              {subTasks.map(subTask => (
                <div key={subTask.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <Checkbox
                    checked={subTask.completed}
                    onCheckedChange={() => handleToggleSubTask(subTask.id)}
                  />
                  <span className={`flex-1 text-sm ${subTask.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {subTask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteSubTask(subTask.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newSubTaskTitle}
                onChange={(e) => setNewSubTaskTitle(e.target.value)}
                placeholder="Aggiungi sotto-task..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
              />
              <Button onClick={handleAddSubTask} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-between">
          {!isCreating && (
            <>
              <Button variant="destructive" onClick={handleDelete}>
                Elimina
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleMarkComplete}>
                  {block?.completed ? 'Riapri' : 'Completa'}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={handleSave}>Salva</Button>
              </div>
            </>
          )}
          {isCreating && (
            <>
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={handleSave}>Crea</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimeBlockModal;
