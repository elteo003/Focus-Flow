import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { formatDate } from '@/utils/dateUtils';
import { DEFAULT_CATEGORIES, TimeBlock } from '@/types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { CheckCircle2, Clock, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';

const AnalyticsView = () => {
  const { timeBlocks } = useTimeBlocks();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const today = formatDate(new Date());

  const getFilteredBlocks = (): TimeBlock[] => {
    const now = new Date();
    
    if (timeRange === 'today') {
      return timeBlocks.filter(b => b.date === today);
    }
    
    if (timeRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return timeBlocks.filter(b => new Date(b.date) >= weekAgo);
    }
    
    // month
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return timeBlocks.filter(b => new Date(b.date) >= monthAgo);
  };

  const stats = useMemo(() => {
    const filteredBlocks = getFilteredBlocks();
    
    const getMinutes = (block: TimeBlock, type: 'planned' | 'actual') => {
      if (type === 'actual' && block.actualStartTime && block.actualEndTime) {
        return Math.floor((new Date(block.actualEndTime).getTime() - new Date(block.actualStartTime).getTime()) / 60000);
      }
      const start = parseInt(block.startTime.split(':')[0]) * 60 + parseInt(block.startTime.split(':')[1]);
      const end = parseInt(block.endTime.split(':')[0]) * 60 + parseInt(block.endTime.split(':')[1]);
      return end - start;
    };

    // Category distribution (actual time)
    const categoryData = DEFAULT_CATEGORIES.map(cat => {
      const blocks = filteredBlocks.filter(b => b.category === cat.id);
      const minutes = blocks.reduce((acc, b) => acc + getMinutes(b, 'actual'), 0);
      return {
        name: cat.name,
        value: minutes,
        color: cat.color,
      };
    }).filter(d => d.value > 0);

    // Planned vs Actual by category
    const plannedVsActual = DEFAULT_CATEGORIES.map(cat => {
      const blocks = filteredBlocks.filter(b => b.category === cat.id);
      const planned = blocks.reduce((acc, b) => acc + getMinutes(b, 'planned'), 0);
      const actual = blocks.reduce((acc, b) => acc + getMinutes(b, 'actual'), 0);
      return {
        name: cat.name,
        pianificato: Math.floor(planned / 60 * 10) / 10,
        effettivo: Math.floor(actual / 60 * 10) / 10,
        color: cat.color,
      };
    }).filter(d => d.pianificato > 0 || d.effettivo > 0);

    // Completion stats
    const completedBlocks = filteredBlocks.filter(b => b.completed).length;
    const totalBlocks = filteredBlocks.length;
    const completionRate = totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0;

    // Sub-tasks stats
    const totalSubTasks = filteredBlocks.reduce((acc, b) => acc + b.subTasks.length, 0);
    const completedSubTasks = filteredBlocks.reduce((acc, b) => 
      acc + b.subTasks.filter(st => st.completed).length, 0
    );

    // Daily subtask completion trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return formatDate(date);
    });

    const subtaskTrend = last7Days.map(date => {
      const dayBlocks = timeBlocks.filter(b => b.date === date);
      const completed = dayBlocks.reduce((acc, b) => 
        acc + b.subTasks.filter(st => st.completed).length, 0
      );
      return {
        date: new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
        completati: completed,
      };
    });

    // Heatmap data (7 days x 24 hours)
    const heatmapData = Array.from({ length: 7 }, (_, dayIdx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - dayIdx));
      const dateStr = formatDate(date);
      
      return Array.from({ length: 18 }, (_, hourIdx) => {
        const hour = hourIdx + 6; // 6:00 to 23:00
        const dayBlocks = timeBlocks.filter(b => {
          if (b.date !== dateStr || !b.actualStartTime || !b.actualEndTime) return false;
          
          const startHour = new Date(b.actualStartTime).getHours();
          const endHour = new Date(b.actualEndTime).getHours();
          
          return hour >= startHour && hour < endHour;
        });
        
        const minutes = dayBlocks.reduce((acc, b) => {
          const start = new Date(b.actualStartTime!);
          const end = new Date(b.actualEndTime!);
          const blockMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
          return acc + Math.min(blockMinutes, 60);
        }, 0);
        
        return {
          day: dayIdx,
          hour,
          intensity: Math.min(minutes / 60, 1), // 0 to 1
        };
      });
    }).flat();

    return {
      categoryData,
      plannedVsActual,
      completedBlocks,
      totalBlocks,
      completionRate,
      totalSubTasks,
      completedSubTasks,
      subtaskTrend,
      heatmapData,
    };
  }, [timeBlocks, timeRange]);

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="p-4 pb-20 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riepilogo</h1>
          <p className="text-sm text-muted-foreground">Analisi della tua produttività</p>
        </div>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Oggi</TabsTrigger>
          <TabsTrigger value="week">7 Giorni</TabsTrigger>
          <TabsTrigger value="month">30 Giorni</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attività Completate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {stats.completedBlocks}/{stats.totalBlocks}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.completionRate.toFixed(0)}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sotto-task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {stats.completedSubTasks}/{stats.totalSubTasks}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completati
                </p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Distribution Chart */}
      {stats.categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione del Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatMinutes(value)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {stats.categoryData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-medium">{formatMinutes(cat.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planned vs Actual Chart */}
      {stats.plannedVsActual.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pianificato vs Effettivo (ore)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.plannedVsActual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pianificato" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="effettivo" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Subtask Completion Trend */}
      {stats.subtaskTrend.some(d => d.completati > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trend Completamento Sotto-task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.subtaskTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="completati" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Focus Heatmap */}
      {stats.heatmapData.some(d => d.intensity > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Mappa Focus Settimanale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Hour labels */}
              <div className="flex gap-1 ml-12">
                {[6, 9, 12, 15, 18, 21].map(h => (
                  <div key={h} className="text-xs text-muted-foreground w-8 text-center">
                    {h}:00
                  </div>
                ))}
              </div>
              {/* Heatmap grid */}
              {Array.from({ length: 7 }).map((_, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground w-10 text-right">
                    {dayLabels[dayIdx]}
                  </div>
                  <div className="flex gap-1">
                    {stats.heatmapData
                      .filter(d => d.day === dayIdx)
                      .map((cell, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded"
                          style={{
                            backgroundColor: cell.intensity > 0 
                              ? `hsl(var(--primary) / ${cell.intensity})` 
                              : 'hsl(var(--muted))',
                          }}
                          title={`${dayLabels[dayIdx]} ${cell.hour}:00 - ${Math.round(cell.intensity * 60)} min`}
                        />
                      ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Mostra l'intensità del lavoro effettivo per ora/giorno
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.categoryData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nessuna attività registrata.
              <br />
              Inizia a pianificare la tua giornata!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsView;
