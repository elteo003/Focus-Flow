import { useState, useEffect, useCallback } from 'react';
import { TimeBlockTemplate } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { retry, isRetryableError } from '@/lib/retry';

const DEFAULT_TEMPLATES: TimeBlockTemplate[] = [
  {
    id: 'template-work-meeting',
    name: 'Riunione Lavoro',
    title: 'Riunione',
    startTime: '09:00',
    endTime: '10:00',
    category: 'work',
    subTasks: [],
  },
  {
    id: 'template-study-session',
    name: 'Sessione Studio',
    title: 'Studio',
    startTime: '14:00',
    endTime: '16:00',
    category: 'study',
    subTasks: [],
  },
  {
    id: 'template-exercise',
    name: 'Esercizio',
    title: 'Esercizio Fisico',
    startTime: '18:00',
    endTime: '19:00',
    category: 'health',
    subTasks: [],
  },
];

export const useTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TimeBlockTemplate[]>(DEFAULT_TEMPLATES);

  useEffect(() => {
    if (!user) {
      setTemplates(DEFAULT_TEMPLATES);
      return;
    }

    const fetchTemplates = async () => {
      try {
        // For now, use default templates
        // In future, can fetch user-specific templates from DB
        setTemplates(DEFAULT_TEMPLATES);
      } catch (error: any) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, [user]);

  const createTemplate = useCallback(async (template: Omit<TimeBlockTemplate, 'id'>) => {
    if (!user) {
      toast.error('Devi effettuare l\'accesso');
      return;
    }

    const newTemplate: TimeBlockTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      userId: user.id,
    };

    setTemplates(prev => [...prev, newTemplate]);
    toast.success('Template creato');
    return newTemplate;
  }, [user]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template eliminato');
  }, []);

  return {
    templates,
    createTemplate,
    deleteTemplate,
  };
};

