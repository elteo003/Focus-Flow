import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DataManagement = () => {
  const { timeBlocks, addTimeBlock } = useTimeBlocks();
  const { user } = useAuth();

  const exportData = () => {
    const dataStr = JSON.stringify(timeBlocks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronofocus-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Dati esportati con successo!');
  };

  const exportCSV = () => {
    const headers = ['Data', 'Titolo', 'Inizio', 'Fine', 'Categoria', 'Completato', 'Status', 'Tempo Effettivo (min)'];
    const rows = timeBlocks.map(block => {
      const actualMinutes = block.actualStartTime && block.actualEndTime
        ? Math.floor((new Date(block.actualEndTime).getTime() - new Date(block.actualStartTime).getTime()) / 60000)
        : '';
      
      return [
        block.date,
        block.title,
        block.startTime,
        block.endTime,
        block.category,
        block.completed ? 'Sì' : 'No',
        block.status,
        actualMinutes.toString(),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronofocus-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Dati esportati in CSV con successo!');
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedBlocks = JSON.parse(text);
        
        if (!Array.isArray(importedBlocks)) {
          toast.error('File non valido');
          return;
        }

        let imported = 0;
        for (const block of importedBlocks) {
          await addTimeBlock(block);
          imported++;
        }
        
        toast.success(`${imported} attività importate con successo!`);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Errore nell\'importazione dei dati');
      }
    };
    input.click();
  };

  const deleteAllData = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast.error('Errore nell\'eliminazione dei dati');
    } else {
      toast.success('Tutti i dati sono stati eliminati');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Dati</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Esporta Dati</p>
          <div className="flex gap-2">
            <Button onClick={exportData} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button onClick={exportCSV} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
        
        <Button onClick={importData} variant="outline" className="w-full justify-start">
          <Upload className="w-4 h-4 mr-2" />
          Importa Dati (JSON)
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full justify-start">
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina Tutti i Dati
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Tutti i tuoi time blocks saranno eliminati permanentemente.
                Considera di esportare i dati prima di procedere.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAllData} className="bg-destructive text-destructive-foreground">
                Elimina Tutto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default DataManagement;
