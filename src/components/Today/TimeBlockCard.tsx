import { memo, useMemo } from 'react';
import { TimeBlock } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, Calendar } from 'lucide-react';
import { timeToMinutes, isTimeInRange } from '@/utils/dateUtils';
import TimerControls from './TimerControls';

interface TimeBlockCardProps {
  block: TimeBlock;
  onClick: () => void;
  currentTime?: string; // Current time to check if line is in block range
}

const TimeBlockCard = memo(({ block, onClick, currentTime }: TimeBlockCardProps) => {
  const { topOffset, height } = useMemo(() => {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    // Position from 6:00 (360 minutes)
    const top = ((startMinutes - 360) / 60) * 64; // 64px per hour
    const h = (durationMinutes / 60) * 64;
    
    return { topOffset: top, height: h };
  }, [block.startTime, block.endTime]);

  const { completedSubTasks, totalSubTasks, progress } = useMemo(() => {
    const completed = block.subTasks.filter(st => st.completed).length;
    const total = block.subTasks.length;
    const prog = total > 0 ? (completed / total) * 100 : 0;
    return { completedSubTasks: completed, totalSubTasks: total, progress: prog };
  }, [block.subTasks]);

  const categoryColor = useMemo(() => {
    const colors: Record<string, string> = {
      work: 'bg-[hsl(221,83%,53%)] border-[hsl(221,83%,43%)]',
      study: 'bg-[hsl(142,71%,45%)] border-[hsl(142,71%,35%)]',
      personal: 'bg-[hsl(38,92%,50%)] border-[hsl(38,92%,40%)]',
      health: 'bg-[hsl(0,84%,60%)] border-[hsl(0,84%,50%)]',
      other: 'bg-[hsl(262,83%,58%)] border-[hsl(262,83%,48%)]',
    };
    return colors[block.category] || colors.other;
  }, [block.category]);

  // Check if current time line is within this block's time range
  const isCurrentTimeInBlock = useMemo(() => {
    if (!currentTime || block.status !== 'planned') return false;
    return isTimeInRange(currentTime, block.startTime, block.endTime);
  }, [currentTime, block.startTime, block.endTime, block.status]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute left-16 right-4 rounded-lg border-2 p-3 cursor-pointer transition-all duration-300",
        "hover:shadow-card-hover hover:scale-[1.02]",
        "text-white font-medium",
        categoryColor,
        block.status === 'completed' && "opacity-75",
        block.status === 'active' && "ring-2 ring-white/40 shadow-lg",
        block.externalEvent && "opacity-60 cursor-default border-dashed",
        // Highlight when current time line enters the block (and it's planned)
        isCurrentTimeInBlock && "ring-4 ring-yellow-300/70 border-yellow-300 animate-[pulse_4s_ease-in-out_infinite]"
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
            {isCurrentTimeInBlock && (
              <span className="text-xs bg-yellow-200/30 text-yellow-100 px-1.5 py-0.5 rounded-full animate-[pulse_4s_ease-in-out_infinite]">
                Ora
              </span>
            )}
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
});

TimeBlockCard.displayName = 'TimeBlockCard';

export default TimeBlockCard;
