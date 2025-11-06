import { useEffect, useState } from 'react';
import { TimeBlock } from '@/types';
import { parseTime } from '@/utils/dateUtils';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return permission === 'granted';
  };

  const notifyBlockStarting = (block: TimeBlock, minutesBefore: number = 5) => {
    if (permission !== 'granted') return;

    const notification = new Notification('ChronoFocus - Attività in arrivo', {
      body: `"${block.title}" inizia tra ${minutesBefore} minuti`,
      icon: '/favicon.ico',
      tag: `block-${block.id}`,
      requireInteraction: false,
    });

    setTimeout(() => notification.close(), 5000);
  };

  const notifyBlockStarted = (block: TimeBlock) => {
    if (permission !== 'granted') return;

    const notification = new Notification('ChronoFocus - Inizia ora!', {
      body: `È ora di: "${block.title}"`,
      icon: '/favicon.ico',
      tag: `block-${block.id}-start`,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

  const scheduleNotifications = (blocks: TimeBlock[]) => {
    if (permission !== 'granted') return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    blocks.forEach(block => {
      if (block.status !== 'planned') return;

      const startMinutes = parseTime(block.startTime).hours * 60 + parseTime(block.startTime).minutes;
      const minutesUntilStart = startMinutes - currentMinutes;

      // Notify 5 minutes before
      if (minutesUntilStart === 5) {
        notifyBlockStarting(block, 5);
      }

      // Notify at start time
      if (minutesUntilStart === 0) {
        notifyBlockStarted(block);
      }
    });
  };

  return {
    permission,
    requestPermission,
    notifyBlockStarting,
    notifyBlockStarted,
    scheduleNotifications,
  };
};
