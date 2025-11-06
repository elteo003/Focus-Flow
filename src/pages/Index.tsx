import { useState } from 'react';
import TabNavigation from '@/components/Layout/TabNavigation';
import TodayView from '@/components/Today/TodayView';
import CalendarView from '@/components/Calendar/CalendarView';
import AnalyticsView from '@/components/Analytics/AnalyticsView';
import SettingsView from '@/components/Settings/SettingsView';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'analytics' | 'settings'>('today');

  return (
    <div className="min-h-screen bg-background">
      {activeTab === 'today' && <TodayView />}
      {activeTab === 'calendar' && <CalendarView />}
      {activeTab === 'analytics' && <AnalyticsView />}
      {activeTab === 'settings' && <SettingsView />}
      
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
