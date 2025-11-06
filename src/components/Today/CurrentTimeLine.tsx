import { useEffect, useState } from 'react';
import { getCurrentTime, timeToMinutes } from '@/utils/dateUtils';

const CurrentTimeLine = () => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const minutes = timeToMinutes(currentTime);
  const topOffset = ((minutes - 360) / 60) * 64; // Position from 6:00

  // Only show if within visible hours (6:00 - 24:00)
  if (minutes < 360 || minutes >= 1440) {
    return null;
  }

  return (
    <div 
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${topOffset}px` }}
    >
      <div className="flex items-center">
        <div className="w-12 flex items-center justify-end pr-2">
          <span className="text-xs font-bold text-destructive bg-background px-1 rounded">
            {currentTime}
          </span>
        </div>
        <div className="flex-1 h-0.5 bg-destructive relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-destructive rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default CurrentTimeLine;
