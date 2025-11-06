import { TimeBlock } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, Calendar } from 'lucide-react';
import { timeToMinutes } from '@/utils/dateUtils';
import TimerControls from './TimerControls';

interface TimeBlockCardProps {
  block: TimeBlock;
  onClick: () => void;
}

const TimeBlockCard = ({ block, onClick }: TimeBlockCardProps) => {
  const startMinutes = timeToMinutes(block.startTime);
  const endMinutes = timeToMinutes(block.endTime);
  const durationMinutes = endMinutes - startMinutes;
  
  // Position from 6:00 (360 minutes)
  const topOffset = ((startMinutes - 360) / 60) * 64; // 64px per hour
  const height = (durationMinutes / 60) * 64;

  const completedSubTasks = block.subTasks.filter(st => st.completed).length;
  const totalSubTasks = block.subTasks.length;
  const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      work: 'bg-[hsl(221,83%,53%)] border-[hsl(221,83%,43%)]',
      study: 'bg-[hsl(142,71%,45%)] border-[hsl(142,71%,35%)]',
      personal: 'bg-[hsl(38,92%,50%)] border-[hsl(38,92%,40%)]',
      health: 'bg-[hsl(0,84%,60%)] border-[hsl(0,84%,50%)]',
      other: 'bg-[hsl(262,83%,58%)] border-[hsl(262,83%,48%)]',
    };
    return colors[category] || colors.other;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute left-16 right-4 rounded-lg border-2 p-3 cursor-pointer transition-all",
        "hover:shadow-card-hover hover:scale-[1.02]",
        "text-white font-medium",
        getCategoryColor(block.category),
        block.status === 'completed' && "opacity-75",
        block.status === 'active' && "ring-2 ring-white/50 shadow-lg",
        block.externalEvent && "opacity-60 cursor-default border-dashed"
      )}
      style={{
        top: `${topOffset}px`,
        height: `${height}px`,
        minHeight: '48px',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold truncate">{block.title}</h3>
            {block.externalEvent && <Calendar className="w-3 h-3 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs opacity-90">
            <Clock className="w-3 h-3" />
            <span>{block.startTime} - {block.endTime}</span>
          </div>
        </div>
        {!block.externalEvent && (
          <div onClick={(e) => e.stopPropagation()}>
            <TimerControls block={block} />
          </div>
        )}
      </div>
      
      {totalSubTasks > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-xs opacity-90">
            {completedSubTasks}/{totalSubTasks} task completati
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeBlockCard;
