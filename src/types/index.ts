export type CategoryType = 'work' | 'study' | 'personal' | 'health' | 'other';

export interface Category {
  id: CategoryType;
  name: string;
  color: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export type TimeBlockStatus = 'planned' | 'active' | 'paused' | 'completed';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  category: CategoryType;
  subTasks: SubTask[];
  date: string; // YYYY-MM-DD format
  completed: boolean;
  status: TimeBlockStatus;
  actualStartTime?: string; // ISO timestamp
  actualEndTime?: string;   // ISO timestamp
  pausedDuration?: number;  // milliseconds
  externalEvent?: boolean;  // if synced from external calendar
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string; // YYYY-MM-DD format
  templateId?: string; // Reference to template if created from one
}

export interface TimeBlockTemplate {
  id: string;
  name: string;
  title: string;
  startTime: string;
  endTime: string;
  category: CategoryType;
  subTasks: SubTask[];
  userId?: string; // Optional, for user-specific templates
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Lavoro', color: 'hsl(221 83% 53%)' },
  { id: 'study', name: 'Studio', color: 'hsl(142 71% 45%)' },
  { id: 'personal', name: 'Personale', color: 'hsl(38 92% 50%)' },
  { id: 'health', name: 'Salute', color: 'hsl(0 84% 60%)' },
  { id: 'other', name: 'Altro', color: 'hsl(262 83% 58%)' },
];
