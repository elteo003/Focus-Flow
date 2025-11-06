import { cn } from '@/lib/utils';

interface TimeSlotProps {
  hour: number;
  isCurrentHour: boolean;
}

const TimeSlot = ({ hour, isCurrentHour }: TimeSlotProps) => {
  const formattedHour = `${hour.toString().padStart(2, '0')}:00`;

  return (
    <div className={cn(
      "relative border-t border-border h-16 hover:bg-muted/50 transition-colors",
      isCurrentHour && "bg-primary/5"
    )}>
      <span className="absolute -top-3 left-2 bg-background px-2 text-xs font-medium text-muted-foreground">
        {formattedHour}
      </span>
    </div>
  );
};

export default TimeSlot;
