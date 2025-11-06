import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';

const NotificationSettings = () => {
  const { permission, requestPermission } = useNotifications();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifiche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications" className="flex flex-col gap-1">
            <span>Notifiche Browser</span>
            <span className="text-xs text-muted-foreground font-normal">
              Ricevi notifiche 5 minuti prima delle attività
            </span>
          </Label>
          {permission === 'granted' ? (
            <Switch id="notifications" checked disabled />
          ) : permission === 'denied' ? (
            <span className="text-xs text-destructive">Bloccate</span>
          ) : (
            <Button onClick={handleRequestPermission} size="sm">
              Attiva
            </Button>
          )}
        </div>
        
        {permission === 'denied' && (
          <p className="text-xs text-muted-foreground">
            Le notifiche sono bloccate. Abilita le dalle impostazioni del browser.
          </p>
        )}
        
        {permission === 'granted' && (
          <p className="text-xs text-success">
            ✓ Notifiche abilitate correttamente
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
