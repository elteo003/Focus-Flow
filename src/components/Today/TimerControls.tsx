import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Check } from 'lucide-react';
import { TimeBlock } from '@/types';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { toast } from 'sonner';

interface TimerControlsProps {
  block: TimeBlock;
}

const TimerControls = ({ block }: TimerControlsProps) => {
  const { updateTimeBlock } = useTimeBlocks();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (block.status === 'active') {
      const startTime = block.actualStartTime ? new Date(block.actualStartTime).getTime() : Date.now();
      const pausedDuration = block.pausedDuration || 0;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime - pausedDuration;
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [block.status, block.actualStartTime, block.pausedDuration]);

  const handleStart = () => {
    updateTimeBlock(block.id, {
      status: 'active',
      actualStartTime: new Date().toISOString(),
      pausedDuration: 0,
    });
    toast.success('Timer avviato');
  };

  const handlePause = () => {
    const currentElapsed = block.actualStartTime 
      ? Date.now() - new Date(block.actualStartTime).getTime() - (block.pausedDuration || 0)
      : 0;
    
    updateTimeBlock(block.id, {
      status: 'paused',
      pausedDuration: (block.pausedDuration || 0) + currentElapsed,
    });
    toast.info('Timer in pausa');
  };

  const handleResume = () => {
    updateTimeBlock(block.id, {
      status: 'active',
      actualStartTime: new Date(Date.now() - (block.pausedDuration || 0)).toISOString(),
      pausedDuration: 0,
    });
    toast.success('Timer ripreso');
  };

  const handleComplete = () => {
    updateTimeBlock(block.id, {
      status: 'completed',
      completed: true,
      actualEndTime: new Date().toISOString(),
    });
    toast.success('Attività completata!');
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (block.status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-sm text-white/90">
        <Check className="w-4 h-4" />
        <span>Completato</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {block.status === 'active' && (
        <div className="text-sm font-mono text-white/90 bg-black/20 px-2 py-1 rounded">
          {formatTime(elapsedTime)}
        </div>
      )}

      {block.status === 'planned' && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleStart}
          className="h-7 px-3"
        >
          <Play className="w-3 h-3 mr-1" />
          INIZIA
        </Button>
      )}

      {block.status === 'active' && (
        <>
          <Button
            size="sm"
            variant="secondary"
            onClick={handlePause}
            className="h-7 px-3"
          >
            <Pause className="w-3 h-3 mr-1" />
            PAUSA
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleComplete}
            className="h-7 px-3"
          >
            <Check className="w-3 h-3 mr-1" />
            COMPLETA
          </Button>
        </>
      )}

      {block.status === 'paused' && (
        <>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleResume}
            className="h-7 px-3"
          >
            <Play className="w-3 h-3 mr-1" />
            RIPRENDI
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleComplete}
            className="h-7 px-3"
          >
            <Check className="w-3 h-3 mr-1" />
            COMPLETA
          </Button>
        </>
      )}
    </div>
  );
};

export default TimerControls;
