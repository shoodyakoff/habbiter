import { differenceInDays, parseISO } from 'date-fns';
import { HabitRecord } from '../store/useHabitStore';
import { getToday, getYesterday } from '@/lib/date';

export const calculateStreak = (records: HabitRecord[], habitId: string): number => {
  const habitRecords = records
    .filter((r) => r.habitId === habitId && r.completed)
    .sort((a, b) => b.date.localeCompare(a.date)); // Descending

  if (habitRecords.length === 0) return 0;

  const today = getToday();
  const yesterday = getYesterday();
  const lastRecordDate = habitRecords[0].date;

  // Streak is broken if not completed today or yesterday
  if (lastRecordDate !== today && lastRecordDate !== yesterday) {
    return 0;
  }

  let streak = 0;
  let currentDate = parseISO(lastRecordDate);

  for (const record of habitRecords) {
    const recordDate = parseISO(record.date);
    const diff = differenceInDays(currentDate, recordDate);

    if (diff === 0) {
      // Same day (first iteration or duplicate), count it once per day logic needs care
      // But we update currentDate after increment?
      // Actually simpler:
      // We expect consecutive dates.
      // If we process 2025-01-02, next must be 2025-01-01 (diff 1).
      
      // Let's refine logic:
      // We start with lastRecordDate.
      // We iterate. If record matches expected date, streak++. Move expected date back.
      // If record is same as previous seen (duplicate), ignore.
      // If record is older than expected, break.
      
      if (streak === 0) {
        streak = 1;
        currentDate = parseISO(record.date); // reset logic anchor
        // set next expected to prev day
        currentDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
      } else {
          // logic fail in loop structure.
      }
    }
  }
  
  // Re-write simple loop
  let currentStreak = 0;
  // We need to check continuity from lastRecordDate backwards
  
  // Check strict continuity
  // let expectedDate = parseISO(lastRecordDate); // Removed unused variable
  
  // Unique dates set
  const uniqueDates = Array.from(new Set(habitRecords.map(r => r.date)));
  
  // Verify continuity
  // Since uniqueDates is sorted desc:
  // [2025-01-02, 2025-01-01, 2024-12-31]
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const dateStr = uniqueDates[i];
    const date = parseISO(dateStr);
    
    // For first item, it's the anchor
    if (i === 0) {
      currentStreak = 1;
      continue;
    }
    
    // Check if this date is 1 day before expectedDate (which was previous iter)
    // Actually, expectedDate should be updated to "prev day of previous iter"
    
    // Let's just use diff
    const prevDateStr = uniqueDates[i-1];
    const prevDate = parseISO(prevDateStr);
    
    const diff = differenceInDays(prevDate, date);
    
    if (diff === 1) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  return currentStreak;
};
