import { useState, useEffect } from 'react';
import { Plus, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimeSlot from './TimeSlot';
import TimeBlockCard from './TimeBlockCard';
import CurrentTimeLine from './CurrentTimeLine';
import TimeBlockModal from './TimeBlockModal';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDate, getCurrentTime, parseTime } from '@/utils/dateUtils';
import { TimeBlock } from '@/types';
import { toast } from 'sonner';

const TodayView = () => {
  const { getBlocksForDate, updateTimeBlock } = useTimeBlocks();
  const { permission, requestPermission, scheduleNotifications } = useNotifications();
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const today = formatDate(new Date());
  const todayBlocks = getBlocksForDate(today);
  const currentTime = getCurrentTime();
  const currentHour = parseTime(currentTime).hours;

  // Schedule notifications every minute
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

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00

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

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Oggi</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('it-IT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {permission !== 'granted' && (
              <Button 
                onClick={handleRequestNotifications} 
                size="icon" 
                variant="outline"
                className="rounded-full"
              >
                <BellOff className="w-5 h-5" />
              </Button>
            )}
            {permission === 'granted' && (
              <Button 
                size="icon" 
                variant="outline"
                className="rounded-full"
                disabled
              >
                <Bell className="w-5 h-5" />
              </Button>
            )}
            <Button onClick={handleCreateNew} size="icon" className="rounded-full">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative">
          {hours.map(hour => (
            <TimeSlot 
              key={hour} 
              hour={hour} 
              isCurrentHour={hour === currentHour}
            />
          ))}
          
          {/* Current time line */}
          <CurrentTimeLine />
          
          {/* Time blocks */}
          {todayBlocks.map(block => (
            <TimeBlockCard
              key={block.id}
              block={block}
              onClick={() => handleBlockClick(block)}
            />
          ))}
        </div>
      </div>

      {/* Time block modal */}
      <TimeBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        block={selectedBlock}
        isCreating={isCreating}
        date={today}
      />
    </div>
  );
};

export default TodayView;
