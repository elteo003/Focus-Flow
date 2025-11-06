import { Calendar, BarChart3, Settings, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabNavigationProps {
  activeTab: 'today' | 'calendar' | 'analytics' | 'settings';
  onTabChange: (tab: 'today' | 'calendar' | 'analytics' | 'settings') => void;
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const tabs = [
    { id: 'today' as const, label: 'Oggi', icon: Clock },
    { id: 'calendar' as const, label: 'Calendario', icon: Calendar },
    { id: 'analytics' as const, label: 'Riepilogo', icon: BarChart3 },
    { id: 'settings' as const, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "scale-110")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNavigation;
