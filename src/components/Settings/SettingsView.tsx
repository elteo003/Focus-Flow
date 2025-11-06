import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_CATEGORIES } from '@/types';
import { Palette, Moon, Sun, Monitor } from 'lucide-react';
import NotificationSettings from './NotificationSettings';
import DataManagement from './DataManagement';
import AccountSettings from './AccountSettings';
import GoogleCalendarSync from '../Calendar/GoogleCalendarSync';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const SettingsView = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 pb-20 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Configura la tua app</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5" />
            Tema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Modalità</p>
              <p className="text-sm text-muted-foreground">
                Scegli tra tema chiaro, scuro o sistema
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
              className="flex-1"
            >
              <Sun className="w-4 h-4 mr-2" />
              Chiaro
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="flex-1"
            >
              <Moon className="w-4 h-4 mr-2" />
              Scuro
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('system')}
              className="flex-1"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <AccountSettings />

      {/* Notifications */}
      <NotificationSettings />

      {/* Google Calendar */}
      <GoogleCalendarSync />

      {/* Data Management */}
      <DataManagement />

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Categorie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEFAULT_CATEGORIES.map(cat => (
            <div 
              key={cat.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div 
                className="w-10 h-10 rounded-full flex-shrink-0" 
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1">
                <h4 className="font-medium">{cat.name}</h4>
                <p className="text-xs text-muted-foreground capitalize">{cat.id}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsView;
