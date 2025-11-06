import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { formatDate } from '@/utils/dateUtils';
import { TimeBlock } from '@/types';
import { Clock } from 'lucide-react';
import GoogleCalendarSync from './GoogleCalendarSync';

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { getBlocksForDate } = useTimeBlocks();

  const selectedDateStr = formatDate(selectedDate);
  const blocks = getBlocksForDate(selectedDateStr);

  return (
    <div className="p-4 pb-20 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-sm text-muted-foreground">Pianificazione a lungo termine</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md"
          />
        </CardContent>
      </Card>

      {/* Google Calendar Sync */}
      <GoogleCalendarSync />

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">
            {selectedDate.toLocaleDateString('it-IT', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </h3>
          
          {blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.map((block: TimeBlock) => (
                <div 
                  key={block.id} 
                  className="p-3 rounded-lg border border-border bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{block.title}</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{block.startTime} - {block.endTime}</span>
                      </div>
                    </div>
                    {block.completed && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Completato
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nessuna attività pianificata</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarView;
