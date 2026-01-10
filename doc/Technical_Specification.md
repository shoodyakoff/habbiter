# Habiter — Техническое задание: Выбор дней недели для привычки

**Дата:** 2026-01-10
**Статус:** Draft

---

## Связанные документы
- **Проектирование:** [Design.md](doc/Design.md)
- **Бизнес-требования:** [Business_Requirements.md](doc/Business_Requirements.md)
- **Контекст:** [Project_Context.md](doc/Project_Context.md)

## История изменений
- 2026-01-10 - Документ создан
- 2026-01-10 - Упрощена схема историчности (отдельная таблица для истории, текущее состояние в habits)

---

## Задача: Гибкое расписание привычек

### Описание
Реализовать возможность выбора конкретных дней недели для выполнения привычки (например, только Пн, Ср, Пт). Сейчас все привычки считаются ежедневными. Необходимо обновить UI создания/редактирования и логику отображения списка привычек на день.

Также необходимо заложить архитектуру для **историчности расписания** (версионность настроек частоты), чтобы изменения графика в будущем не ломали статистику прошлого.

**Архитектурное решение:**
- Текущее расписание хранится в `habits.frequency` и `habits.repeat_days` (для быстрого доступа на главном экране)
- История изменений хранится в отдельной таблице `habit_schedule_history` (для корректной статистики прошлого)
- При изменении расписания: сохраняем старое значение в историю → обновляем текущее в habits

---

## Что сделать

1. **База данных:** Создать таблицу `habit_schedule_history` для хранения истории изменений расписания.
2. **Миграция:** Безопасно перенести текущие настройки в новую таблицу без потери данных.
3. **Хелперы:** Создать утилиты для работы с историческими расписаниями.
4. **Frontend (Форма):** Добавить переключатель "Каждый день" / "По дням" и селектор дней недели.
5. **Frontend (Главная):** Обновить логику фильтрации списка привычек с учетом текущего расписания.
6. **Frontend (Статистика):** Учитывать историческое расписание при расчете прогресса.

---

## Требования

### 1. База данных (Supabase)

**Новая таблица `habit_schedule_history`:**
Хранит историю изменений расписания. Текущее расписание остается в таблице `habits`.

```sql
CREATE TABLE habit_schedule_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,

  -- Настройки расписания, которые действовали
  frequency TEXT NOT NULL, -- 'daily', 'specific_days'
  repeat_days INTEGER[],   -- [1, 2, 3] (1=Monday, 7=Sunday, ISO-8601)

  -- Период действия
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ, -- NULL означает "действует по настоящее время"

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_frequency CHECK (frequency IN ('daily', 'specific_days')),
  CONSTRAINT check_dates CHECK (effective_until IS NULL OR effective_from < effective_until)
);

-- Index for fast lookup by date range
CREATE INDEX idx_habit_schedule_history_lookup
  ON habit_schedule_history(habit_id, effective_from DESC, effective_until);

-- RLS
ALTER TABLE habit_schedule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit schedules"
  ON habit_schedule_history FOR SELECT
  USING (habit_id IN (SELECT id FROM habits WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own habit schedules"
  ON habit_schedule_history FOR ALL
  USING (habit_id IN (SELECT id FROM habits WHERE user_id = auth.uid()));
```

**Обновление таблицы `habits`:**
Добавляем defaults и constraints для существующих полей.

```sql
-- Устанавливаем default значения
ALTER TABLE habits
  ALTER COLUMN frequency SET DEFAULT 'daily';

-- Обновляем существующие NULL значения
UPDATE habits
SET frequency = 'daily'
WHERE frequency IS NULL;

UPDATE habits
SET repeat_days = ARRAY[]::INTEGER[]
WHERE repeat_days IS NULL;

-- Добавляем constraint (после обновления данных)
ALTER TABLE habits
  ADD CONSTRAINT check_frequency CHECK (frequency IN ('daily', 'specific_days'));
```

**Стратегия безопасной миграции (Zero Downtime / Safe):**

1. **Создание таблицы:** Создаем `habit_schedule_history` (как выше).
2. **Обновление habits:** Добавляем defaults и обновляем NULL значения.
3. **Перенос данных в историю:**
   ```sql
   -- Переносим текущее состояние как первую запись в истории
   INSERT INTO habit_schedule_history (habit_id, frequency, repeat_days, effective_from)
   SELECT
     id,
     COALESCE(frequency, 'daily'),
     COALESCE(repeat_days, ARRAY[]::INTEGER[]),
     created_at -- Расписание действует с момента создания привычки
   FROM habits;
   ```

**Важно:** Колонки `frequency` и `repeat_days` в таблице `habits` **ОСТАЮТСЯ** как источник правды для текущего состояния. История нужна только для статистики прошлого.

---

### 2. Backend Logic / Hooks

**Для главного экрана (текущее состояние):**
- Используем данные из `habits.frequency` и `habits.repeat_days` напрямую.
- Не требуется JOIN к `habit_schedule_history`.

**Для статистики (историческое состояние):**
- Запрос к Supabase:
  ```typescript
  .select(`
    *,
    habit_schedule_history (
      frequency,
      repeat_days,
      effective_from,
      effective_until
    )
  `)
  .order('habit_schedule_history(effective_from)', { ascending: false })
  ```

**Хелпер `getScheduleForDate`:**
Определяет, какое расписание действовало на конкретную дату.

```typescript
interface HabitSchedule {
  frequency: 'daily' | 'specific_days';
  repeat_days: number[];
  effective_from: string;
  effective_until: string | null;
}

function getScheduleForDate(
  scheduleHistory: HabitSchedule[],
  date: Date
): HabitSchedule | null {
  // Находим расписание, действовавшее на эту дату
  const schedule = scheduleHistory.find(s => {
    const from = new Date(s.effective_from);
    const until = s.effective_until ? new Date(s.effective_until) : null;

    return from <= date && (until === null || until > date);
  });

  return schedule || null;
}
```

---

### 3. Мобильное приложение (Frontend)

**Компонент `CreateHabitForm` / `EditHabitForm`:**
- **Поле "Частота":**
  - Тип: Segmented Control или Radio Group.
  - Варианты: "Каждый день", "По дням недели".
- **Селектор дней (WeekDaySelector):**
  - Появляется только при выборе "По дням недели".
  - 7 кнопок (Пн, Вт, Ср, Чт, Пт, Сб, Вс).
  - Множественный выбор.
  - Валидация: Минимум 1 день должен быть выбран.

**Логика сохранения:**

**Создание привычки:**
```typescript
// 1. Создаем habit с расписанием
const { data: habit } = await supabase.from('habits').insert({
  name,
  frequency: 'specific_days',
  repeat_days: [1, 3, 5], // Пн, Ср, Пт
  // ... другие поля
}).select().single();

// 2. Создаем первую запись в истории
await supabase.from('habit_schedule_history').insert({
  habit_id: habit.id,
  frequency: habit.frequency,
  repeat_days: habit.repeat_days,
  effective_from: new Date().toISOString()
  // effective_until остается NULL
});
```

**Редактирование привычки (если расписание изменилось):**
```typescript
// 1. Закрываем текущую запись в истории
await supabase
  .from('habit_schedule_history')
  .update({ effective_until: new Date().toISOString() })
  .eq('habit_id', habitId)
  .is('effective_until', null);

// 2. Создаем новую запись в истории
await supabase.from('habit_schedule_history').insert({
  habit_id: habitId,
  frequency: newFrequency,
  repeat_days: newRepeatDays,
  effective_from: new Date().toISOString()
});

// 3. Обновляем текущее состояние в habits
await supabase.from('habits').update({
  frequency: newFrequency,
  repeat_days: newRepeatDays
}).eq('id', habitId);
```

**Важно:** Операции должны выполняться в правильном порядке для сохранения истории.

**Главный экран (`TodayProgress`):**
- Получаем выбранную дату (`selectedDate`).
- Фильтруем список привычек по **ТЕКУЩЕМУ** расписанию:
  ```typescript
  const filteredHabits = habits.filter(habit => {
    // Используем текущее расписание из habit.frequency и habit.repeat_days
    if (habit.frequency === 'daily') {
      return true;
    }

    if (habit.frequency === 'specific_days') {
      const dayOfWeek = getISODay(selectedDate); // 1-7 (Пн-Вс)
      return habit.repeat_days.includes(dayOfWeek);
    }

    return false;
  });
  ```

**Важно:** Маппинг дней недели:
- JS `Date.getDay()`: 0=Вс, 1=Пн...6=Сб
- ISO-8601 (date-fns `getISODay()`): 1=Пн...7=Вс
- БД `repeat_days`: 1=Пн, ..., 7=Вс (ISO-8601)
- **Используйте `getISODay()` из date-fns для корректного маппинга!**

**Статистика:**
- При расчете прогресса за прошлые недели использовать **исторические данные** из `habit_schedule_history`.
- Логика отображения клетки:
  ```typescript
  function renderStatisticsCell(habit: Habit, date: Date) {
    // Находим расписание, действовавшее на эту дату
    const schedule = getScheduleForDate(habit.habit_schedule_history, date);

    if (!schedule) {
      return null; // Привычка еще не существовала
    }

    // Проверяем, был ли день запланирован ПО ТОГДАШНЕМУ расписанию
    const dayOfWeek = getISODay(date);
    const wasScheduled = schedule.frequency === 'daily' ||
                         schedule.repeat_days.includes(dayOfWeek);

    if (!wasScheduled) {
      return null; // Пустая клетка (день не запланирован)
    }

    // Проверяем наличие habit_record
    const record = habit.habit_records.find(r =>
      isSameDay(new Date(r.completed_at), date)
    );

    if (record) {
      return <GreenDot />; // ✅ Выполнено
    } else {
      return <RedDot />; // ❌ Пропущено
    }
  }
  ```

**Результат:** "Метод Франклина" показывает:
- Пустые клетки для дней, когда привычка не была запланирована
- Зеленые точки для выполненных дней
- Красные точки ТОЛЬКО для пропущенных запланированных дней (по историческому расписанию)

---

## Критерии приемки

```gherkin
Сценарий: Создание привычки с расписанием Пн, Ср, Пт
Дано пользователь открыл форму создания привычки
Когда он выбирает частоту "По дням недели"
И отмечает "Пн", "Ср", "Пт"
И нажимает "Сохранить"
Тогда привычка создается в таблице habits с repeat_days=[1, 3, 5]
И в таблице habit_schedule_history появляется первая запись с effective_from=now, effective_until=NULL
И привычка отображается в списке в ближайший Понедельник
И привычка НЕ отображается во Вторник

Сценарий: Изменение расписания (Историчность)
Дано есть привычка с расписанием "Ежедневно" (создана 01.01)
Когда сегодня (10.01) пользователь меняет расписание на "Только Сб"
Тогда старая запись в habit_schedule_history закрывается (effective_until = 10.01)
И создается новая запись (effective_from = 10.01) с repeat_days=[6]
И таблица habits обновляется: frequency='specific_days', repeat_days=[6]
И если посмотреть календарь за 05.01 (прошлое) -> привычка отображается в статистике (действовало "Ежедневно")
И если посмотреть календарь за 12.01 (будущее, Вс) -> привычка НЕ отображается

Сценарий: Статистика с историческим расписанием
Дано привычка создана 01.01 с расписанием "Пн, Ср, Пт"
И пользователь выполнил её 02.01 (Пн) и пропустил 04.01 (Ср)
И 10.01 пользователь изменил расписание на "Вт, Чт, Сб"
Когда пользователь смотрит статистику за неделю 02.01-08.01
Тогда клетка 02.01 (Пн) = зеленая точка (был запланирован, выполнен)
И клетка 03.01 (Вт) = пустая (НЕ был запланирован по тогдашнему расписанию)
И клетка 04.01 (Ср) = красная точка (был запланирован, НЕ выполнен)
И клетка 05.01 (Чт) = пустая (НЕ был запланирован)
```

---

## Открытые вопросы
1. **Часовые пояса:** `effective_from` и `effective_until` в `habit_schedule_history` хранятся в UTC.
   - *Решение:* Сравнивать даты в UTC. Смена расписания действует с момента изменения.
   - *Упрощение для MVP:* Считаем, что изменение вступает в силу немедленно (текущий момент времени).

---

## Не входит в задачу
- Сложные паттерны повторения (каждый 3-й день, раз в 2 недели).
- Миграция старых `habit_records` при изменении расписания (историчность records не требуется).
- Валидация корректности дат в истории (предполагаем, что effective_from всегда < effective_until).

---

## Следующие шаги

### База данных
- [ ] Создать файл миграции `up.sql` (создание таблицы, обновление habits, перенос данных)
- [ ] Создать файл отката `down.sql` (удаление таблицы, восстановление состояния)
- [ ] Написать инструкцию по применению и откату миграции

### Backend / Типы
- [ ] Обновить TypeScript типы для `habit_schedule_history`
- [ ] Добавить хелпер `getScheduleForDate` для работы с историей расписания

### Frontend
- [ ] Создать компонент `WeekDaySelector` для выбора дней недели
- [ ] Обновить `CreateHabitForm` с поддержкой выбора дней недели
- [ ] Обновить логику фильтрации привычек на главном экране
- [ ] Обновить компонент статистики с учетом исторического расписания
