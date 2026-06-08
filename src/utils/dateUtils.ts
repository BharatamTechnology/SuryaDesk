import { isWeekend, differenceInBusinessDays, parseISO } from 'date-fns';

export function countWorkingDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  try {
    const start = typeof startDateStr === 'string' ? parseISO(startDateStr) : new Date(startDateStr);
    const end = typeof endDateStr === 'string' ? parseISO(endDateStr) : new Date(endDateStr);
    
    // Using date-fns built in differenceInBusinessDays
    return Math.max(0, differenceInBusinessDays(end, start));
  } catch (err) {
    console.error("Error calculating working days:", err);
    return 0;
  }
}
