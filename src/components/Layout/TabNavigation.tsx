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
      <div className="relative flex items-center justify-around h-16 max-w-2xl mx-auto px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative flex flex-col items-center justify-center flex-1 h-full transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-4 top-2 bottom-2 rounded-full bg-primary/20 blur-md opacity-0 scale-75 transition-all duration-300 ease-out",
                  isActive && "opacity-100 scale-100"
                )}
              />
              <Icon
                className={cn(
                  "w-5 h-5 mb-1 transition-transform duration-300 ease-out",
                  isActive ? "scale-110 translate-y-[-2px] drop-shadow-[0_0_12px_rgba(59,130,246,0.55)]" : "scale-95 group-hover:scale-100 group-hover:translate-y-[-1px]"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-300 ease-out",
                  isActive ? "tracking-wide drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" : "opacity-80 group-hover:opacity-100"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNavigation;
