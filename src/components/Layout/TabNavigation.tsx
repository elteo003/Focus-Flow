import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Calendar, BarChart3, Settings, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabNavigationProps {
  activeTab: 'today' | 'calendar' | 'analytics' | 'settings';
  onTabChange: (tab: 'today' | 'calendar' | 'analytics' | 'settings') => void;
}

type TabId = 'today' | 'calendar' | 'analytics' | 'settings';

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    today: null,
    calendar: null,
    analytics: null,
    settings: null,
  });
  const [indicator, setIndicator] = useState<{ width: number; left: number }>({ width: 0, left: 0 });
  const [indicatorReady, setIndicatorReady] = useState(false);

  const tabs = [
    { id: 'today' as const, label: 'Oggi', icon: Clock },
    { id: 'calendar' as const, label: 'Calendario', icon: Calendar },
    { id: 'analytics' as const, label: 'Riepilogo', icon: BarChart3 },
    { id: 'settings' as const, label: 'Impostazioni', icon: Settings },
  ];

  const updateIndicatorPosition = () => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current[activeTab];

    if (!container || !activeButton) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    setIndicator({
      width: buttonRect.width,
      left: buttonRect.left - containerRect.left,
    });
    setIndicatorReady(true);
  };

  useLayoutEffect(() => {
    updateIndicatorPosition();
  }, [activeTab]);

  useEffect(() => {
    if (!indicatorReady) {
      return;
    }

    const handleResize = () => updateIndicatorPosition();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [indicatorReady, activeTab]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div
        ref={containerRef}
        className="relative flex items-center justify-around h-16 max-w-2xl mx-auto px-2"
      >
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 rounded-full bg-primary/10 shadow-[0_8px_24px_-12px_rgba(59,130,246,0.45)] transition-[transform,width,opacity] duration-[420ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
            opacity: indicatorReady ? 1 : 0,
          }}
        />
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              ref={node => {
                buttonRefs.current[tab.id] = node;
              }}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative flex flex-col items-center justify-center flex-1 h-full transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 mb-1 transition-transform duration-300 ease-out",
                  isActive ? "scale-110 translate-y-[-2px]" : "scale-95 group-hover:scale-100 group-hover:translate-y-[-1px]"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-300 ease-out",
                  isActive ? "tracking-wide" : "opacity-80 group-hover:opacity-100"
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
