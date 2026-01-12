/**
 * Утилиты для работы с расписаниями привычек
 *
 * Поддерживает историчность расписаний для корректной статистики за прошлые периоды.
 */

import { HabitScheduleHistory } from '../types/schema';

/**
 * Находит расписание, которое действовало на конкретную дату
 *
 * @param scheduleHistory - Массив исторических записей расписания (отсортирован по effective_from DESC)
 * @param date - Дата, для которой нужно найти расписание
 * @returns Расписание, действовавшее на эту дату, или null если привычка еще не существовала
 *
 * @example
 * const schedule = getScheduleForDate(habit.habit_schedule_history, new Date('2024-01-15'));
 * if (schedule && schedule.frequency === 'specific_days') {
 *   console.log('Запланированные дни:', schedule.repeatDays);
 * }
 */
export function getScheduleForDate(
  scheduleHistory: HabitScheduleHistory[],
  date: Date
): HabitScheduleHistory | null {
  if (!scheduleHistory || scheduleHistory.length === 0) {
    return null;
  }

  // Находим расписание, действовавшее на эту дату
  const schedule = scheduleHistory.find(s => {
    const from = new Date(s.effectiveFrom);
    const until = s.effectiveUntil ? new Date(s.effectiveUntil) : null;

    return from <= date && (until === null || until > date);
  });

  return schedule || null;
}

/**
 * Проверяет, должна ли привычка быть запланирована на конкретную дату
 * по ИСТОРИЧЕСКОМУ расписанию (для статистики прошлого)
 *
 * @param scheduleHistory - Массив исторических записей расписания
 * @param date - Дата для проверки
 * @param dayOfWeek - День недели (ISO-8601: 1=Пн, 7=Вс)
 * @returns true если привычка была запланирована на этот день
 *
 * @example
 * // Для статистики за прошлую неделю
 * const wasScheduled = wasHabitScheduledOnDate(
 *   habit.habit_schedule_history,
 *   new Date('2024-01-15'),
 *   1 // Понедельник
 * );
 */
export function wasHabitScheduledOnDate(
  scheduleHistory: HabitScheduleHistory[],
  date: Date,
  dayOfWeek: number
): boolean {
  const schedule = getScheduleForDate(scheduleHistory, date);

  if (!schedule) {
    return false; // Привычка еще не существовала
  }

  if (schedule.frequency === 'daily') {
    return true;
  }

  if (schedule.frequency === 'specific_days' && schedule.repeatDays) {
    return schedule.repeatDays.includes(dayOfWeek);
  }

  return false;
}

/**
 * Проверяет, должна ли привычка быть запланирована на конкретную дату
 * по ТЕКУЩЕМУ расписанию (для главного экрана)
 *
 * @param frequency - Текущая частота привычки
 * @param repeatDays - Текущие дни повторения
 * @param dayOfWeek - День недели (ISO-8601: 1=Пн, 7=Вс)
 * @returns true если привычка запланирована на этот день
 *
 * @example
 * // Для фильтрации списка на главном экране
 * const isScheduledToday = isHabitScheduledOnDay(
 *   habit.frequency,
 *   habit.repeatDays,
 *   getISODay(selectedDate)
 * );
 */
export function isHabitScheduledOnDay(
  frequency: 'daily' | 'specific_days' | 'custom',
  repeatDays: number[] | undefined,
  dayOfWeek: number
): boolean {
  if (frequency === 'daily') {
    return true;
  }

  if (frequency === 'specific_days' && repeatDays) {
    return repeatDays.includes(dayOfWeek);
  }

  return false;
}
