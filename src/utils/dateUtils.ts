export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

export const getCurrentTime = (): string => {
  return formatTime(new Date());
};

export const parseTime = (time: string): { hours: number; minutes: number } => {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
};

export const timeToMinutes = (time: string): number => {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const isTimeInRange = (time: string, start: string, end: string): boolean => {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};
