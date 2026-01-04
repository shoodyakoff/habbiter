# Техническое задание: Рефакторинг Habiter

**Версия:** 2.0
**Дата:** 2026-01-04
**Основано на:** Design Guidelines, Frontend Guidelines, Backend Guidelines, Code Review

---

## 📋 Общие принципы

### Критические требования
1. **Single Source of Truth для цветов** - все цвета только в `src/app/globals.css`
2. **No hardcoded colors** - запрещены arbitrary values типа `bg-[#FF0000]`
3. **Type-safe Color System** - Zod enum для habit colors вместо hex strings
4. **Telegram-native API** - использовать `window.Telegram.WebApp.HapticFeedback` вместо `navigator.vibrate`
5. **No useEffect для confetti/analytics** - переместить в mutation callbacks
6. **RESTful routing** - `/habits/new`, `/habits/[id]/edit` вместо dialogs

---

## 🎨 1. Цветовая система

### 1.1 Новая палитра Habit Colors (20 цветов)

**Богатые, не типовые оттенки (Jewel + Nature-inspired):**

```css
/* globals.css - @theme inline */

/* Reds & Pinks */
--color-habit-crimson: #DC143C;      /* Насыщенный алый */
--color-habit-ruby: #E0115F;          /* Рубиновый */
--color-habit-coral: #FF6F61;         /* Живой коралл */
--color-habit-rose: #FF6B9D;          /* Пыльная роза */

/* Oranges & Yellows */
--color-habit-amber: #FFBF00;         /* Янтарный */
--color-habit-gold: #FFD700;          /* Золотой */
--color-habit-terracotta: #E2725B;    /* Терракота */
--color-habit-peach: #FFDAB9;         /* Персиковый */

/* Greens */
--color-habit-emerald: #50C878;       /* Изумрудный */
--color-habit-jade: #00A86B;          /* Нефритовый */
--color-habit-sage: #8A9A5B;          /* Шалфей */
--color-habit-mint: #3EB489;          /* Мятный */

/* Blues */
--color-habit-sapphire: #0F52BA;      /* Сапфировый */
--color-habit-turquoise: #30D5C8;     /* Бирюзовый */
--color-habit-teal: #008080;          /* Чирок */
--color-habit-cerulean: #007BA7;      /* Лазурный */

/* Purples */
--color-habit-amethyst: #9966CC;      /* Аметистовый */
--color-habit-lavender: #967BB6;      /* Лавандовый */
--color-habit-plum: #8E4585;          /* Сливовый */
--color-habit-orchid: #DA70D6;        /* Орхидея */
```

**Backend Schema Update:**
```sql
-- supabase/migrations/YYYYMMDD_update_habit_colors.sql

ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_color_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_color_check
  CHECK (color IN (
    'crimson', 'ruby', 'coral', 'rose',
    'amber', 'gold', 'terracotta', 'peach',
    'emerald', 'jade', 'sage', 'mint',
    'sapphire', 'turquoise', 'teal', 'cerulean',
    'amethyst', 'lavender', 'plum', 'orchid'
  ));
```

**Frontend Schema Update:**
```typescript
// src/features/habits/types/schema.ts

export const HabitColorSchema = z.enum([
  'crimson', 'ruby', 'coral', 'rose',
  'amber', 'gold', 'terracotta', 'peach',
  'emerald', 'jade', 'sage', 'mint',
  'sapphire', 'turquoise', 'teal', 'cerulean',
  'amethyst', 'lavender', 'plum', 'orchid'
]);

export type HabitColor = z.infer<typeof HabitColorSchema>;

export const HABIT_COLORS: readonly HabitColor[] = [
  'crimson', 'ruby', 'coral', 'rose',
  'amber', 'gold', 'terracotta', 'peach',
  'emerald', 'jade', 'sage', 'mint',
  'sapphire', 'turquoise', 'teal', 'cerulean',
  'amethyst', 'lavender', 'plum', 'orchid'
] as const;
```

### 1.2 Удалить hardcoded colors

**❌ УДАЛИТЬ:**
- `src/features/habits/components/CreateHabitForm.tsx:25-36` - массив `COLORS`
- `src/app/login/page.tsx:285` - `bg-[#24A1DE]`

**✅ ЗАМЕНИТЬ НА:**
```tsx
// CreateHabitForm.tsx
import { HABIT_COLORS } from '@/features/habits/types/schema';

<div className="grid grid-cols-5 gap-3">
  {HABIT_COLORS.map((colorName) => (
    <button
      key={colorName}
      type="button"
      className={cn(
        "w-10 h-10 rounded-full border-2 transition-all",
        field.value === colorName ? "border-foreground scale-110" : "border-transparent"
      )}
      style={{ backgroundColor: `var(--color-habit-${colorName})` }}
      onClick={() => field.onChange(colorName)}
    >
      {field.value === colorName && <Check className="text-white" strokeWidth={3} />}
    </button>
  ))}
</div>
```

```tsx
// login/page.tsx
<Button
  className="w-full bg-telegram text-white hover:bg-telegram/90"
>
```

**globals.css:**
```css
:root {
  --telegram: #24A1DE;
}

@theme inline {
  --color-telegram: var(--telegram);
}
```

### 1.3 Создать утилиту для текста на цветном фоне

**Создать файл:** `src/lib/colors.ts`

```typescript
import type { HabitColor } from '@/features/habits/types/schema';

// Luminance calculation (WCAG 2.0)
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Map habit color names to hex (matches globals.css)
const HABIT_COLOR_HEX: Record<HabitColor, string> = {
  crimson: '#DC143C',
  ruby: '#E0115F',
  coral: '#FF6F61',
  rose: '#FF6B9D',
  amber: '#FFBF00',
  gold: '#FFD700',
  terracotta: '#E2725B',
  peach: '#FFDAB9',
  emerald: '#50C878',
  jade: '#00A86B',
  sage: '#8A9A5B',
  mint: '#3EB489',
  sapphire: '#0F52BA',
  turquoise: '#30D5C8',
  teal: '#008080',
  cerulean: '#007BA7',
  amethyst: '#9966CC',
  lavender: '#967BB6',
  plum: '#8E4585',
  orchid: '#DA70D6',
};

/**
 * Returns 'black' or 'white' based on background luminance
 * @param habitColor - Habit color name from schema
 * @returns Text color class name
 */
export function getTextColorForHabit(habitColor: HabitColor): 'text-black' | 'text-white' {
  const hex = HABIT_COLOR_HEX[habitColor];
  const [r, g, b] = hexToRgb(hex);
  const luminance = getLuminance(r, g, b);

  // WCAG threshold: 0.5 (empirically adjusted for vibrant colors)
  return luminance > 0.5 ? 'text-black' : 'text-white';
}

/**
 * Returns icon color class (inverse of text color for checkbox fill)
 */
export function getIconColorForHabit(habitColor: HabitColor): string {
  return getTextColorForHabit(habitColor) === 'text-black' ? '#000000' : '#FFFFFF';
}
```

**Использование в HabitCard:**
```tsx
import { getTextColorForHabit, getIconColorForHabit } from '@/lib/colors';

const textColor = getTextColorForHabit(habit.color);
const iconColor = getIconColorForHabit(habit.color);

// Replace isLightColor logic
<h3 className={cn("font-semibold text-lg", textColor)}>
  {habit.name}
</h3>
```

---

## 🖼️ 2. Шапка (Header)

### 2.1 Добавить логотип перед HABBITER

**Файл:** `src/components/shared/Header.tsx`

```tsx
import Image from 'next/image';

<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
  <div className="container mx-auto px-4 h-14 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Habbiter Logo"
        width={28}
        height={28}
        className="object-contain"
      />
      <h1 className="text-xl font-bold tracking-wider">HABBITER</h1>
    </div>
    {user && (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSignOut}
        className="shrink-0"
      >
        <SignOut size={20} weight="bold" /> {/* weight="bold" вместо "regular" */}
      </Button>
    )}
  </div>
</header>
```

**Требования к файлу:**
- Путь: `/public/logo.png`
- Размер: 28x28px (или SVG для масштабируемости)
- Формат: PNG с прозрачностью или SVG

### 2.2 HABBITER капслоком
✅ Уже в коде выше

### 2.3 Иконка выйти жирнее
✅ `weight="bold"` вместо `weight="regular"`

---

## 📅 3. Страница "Прогресс" (/)

### 3.1 Убрать "Добрый день друг"

**Файл:** `src/features/habits/components/HabitsHeader.tsx`

```tsx
// УДАЛИТЬ весь компонент HabitsHeader или убрать приветствие
// В src/app/page.tsx удалить:
<HabitsHeader />
```

### 3.2 Стили Неделя/Месяц + навигация (компактнее)

**Файл:** `src/features/habits/components/WeekSwitcher.tsx`

```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2 bg-muted rounded-lg p-1"> {/* было p-2 */}
    <Button
      variant={view === 'week' ? 'default' : 'ghost'}
      size="sm"
      className="h-7 text-xs" {/* было h-8, text-sm */}
      onClick={() => setView('week')}
    >
      Неделя
    </Button>
    <Button
      variant={view === 'month' ? 'default' : 'ghost'}
      size="sm"
      className="h-7 text-xs"
      onClick={() => setView('month')}
    >
      Месяц
    </Button>
  </div>

  <div className="flex items-center gap-1"> {/* было gap-2 */}
    <Button variant="ghost" size="icon-sm" className="size-7"> {/* было size-8 */}
      <CaretLeft size={16} /> {/* было 20 */}
    </Button>
    <span className="text-xs font-medium px-2"> {/* было text-sm */}
      {formatWeekRange(currentWeek)}
    </span>
    <Button variant="ghost" size="icon-sm" className="size-7">
      <CaretRight size={16} />
    </Button>
  </div>
</div>
```

### 3.3 Красная точка для пропущенных дней

**Логика:** День считается failed если `день < сегодня && 0% выполнено`

**Файл:** `src/app/page.tsx`

```tsx
const progressMap = useMemo(() => {
  const map: Record<string, 'complete' | 'partial' | 'low' | 'empty' | 'failed'> = {};
  const today = format(new Date(), 'yyyy-MM-dd');

  if (activeHabits.length === 0) return map;

  weekDates.forEach(date => {
    const dayRecords = weekRecords.filter(r => r.date === date && r.completed);
    const dayCompletedCount = dayRecords.filter(r =>
      activeHabits.some(h => h.id === r.habitId)
    ).length;

    const total = activeHabits.length;
    const percentage = total > 0 ? (dayCompletedCount / total) : 0;

    // NEW: Check if day is in the past
    const isPast = date < today;

    if (percentage === 1) {
      map[date] = 'complete';
    } else if (percentage >= 0.5) {
      map[date] = 'partial';
    } else if (percentage > 0) {
      map[date] = 'low';
    } else if (isPast && percentage === 0) {
      map[date] = 'failed'; // RED DOT
    } else {
      map[date] = 'empty';
    }
  });
  return map;
}, [weekDates, weekRecords, activeHabits]);
```

**Файл:** `src/features/habits/components/WeekSwitcher.tsx`

```tsx
const statusStyles = {
  complete: 'bg-green-500',
  partial: 'bg-yellow-500',
  low: 'bg-orange-500',
  failed: 'bg-red-500',     // NEW
  empty: 'bg-muted'
};

<div className={cn(
  "w-1.5 h-1.5 rounded-full",
  statusStyles[progressMap[dateStr] || 'empty']
)} />
```

### 3.4 Прогресс-бар компактнее

**Файл:** `src/features/habits/components/TodayProgress.tsx`

```tsx
<div className="mb-4"> {/* было mb-6 */}
  <div className="flex items-center justify-between mb-2"> {/* было mb-3 */}
    <span className="text-sm font-medium"> {/* было text-base */}
      Прогресс дня
    </span>
    <span className="text-sm font-bold"> {/* было text-base */}
      {percentage}%
    </span>
  </div>
  <div className="h-2 bg-muted rounded-full overflow-hidden"> {/* было h-3 */}
    <motion.div
      className="h-full bg-primary"
      initial={{ width: 0 }}
      animate={{ width: `${percentage}%` }}
      transition={{ duration: 0.3 }}
    />
  </div>
</div>
```

### 3.5 Пропорции карточек: 50/50, 40/60, 55/45, повтор

**Файл:** `src/app/page.tsx`

```tsx
// СТАРАЯ ЛОГИКА (удалить):
const position = index % 6;
let widthPercent = 50;
switch (position) {
  case 0: widthPercent = 60; break;
  case 1: widthPercent = 40; break;
  case 2: widthPercent = 30; break;
  case 3: widthPercent = 70; break;
  case 4: widthPercent = 50; break;
  case 5: widthPercent = 50; break;
}

// НОВАЯ ЛОГИКА:
/**
 * Pattern: 50/50, 40/60, 55/45, repeat
 * Row 1: 50%, 50%
 * Row 2: 40%, 60%
 * Row 3: 55%, 45%
 * Row 4: 50%, 50% (repeat)
 */
function getCardWidth(index: number): number {
  const row = Math.floor(index / 2); // 0-based row index
  const col = index % 2; // 0 = left, 1 = right

  const patterns = [
    [50, 50], // Row 1
    [40, 60], // Row 2
    [55, 45], // Row 3
  ];

  const pattern = patterns[row % 3];
  return pattern[col];
}

// Usage:
const widthPercent = getCardWidth(index);
```

**Вынести в утилиту:** `src/lib/layout.ts`
```typescript
export function getCardWidth(index: number): number {
  const row = Math.floor(index / 2);
  const col = index % 2;
  const patterns = [[50, 50], [40, 60], [55, 45]];
  return patterns[row % 3][col];
}
```

---

## 📝 4. Страница "Мои привычки" (/my-habits)

### 4.1 Полный редизайн по гайдам

**Новая структура:**

```tsx
// src/app/my-habits/page.tsx
'use client';

import { useHabitsQuery } from '@/features/habits/api/useHabits';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Archive } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function MyHabitsPage() {
  const router = useRouter();
  const { data: habits = [] } = useHabitsQuery();
  const activeHabits = habits.filter(h => h.status === 'active');

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Мои привычки</h1>
        <Button
          onClick={() => router.push('/habits/new')}
          size="default"
        >
          <Plus size={20} weight="bold" />
          Создать
        </Button>
      </div>

      <div className="space-y-3">
        {activeHabits.map((habit, index) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `var(--color-habit-${habit.color})` }}
            >
              <Icon size={24} weight="fill" className={getTextColorForHabit(habit.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-muted-foreground truncate">{habit.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => router.push(`/habits/${habit.id}/edit`)}
              >
                <Pencil size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleArchive(habit.id)}
              >
                <Archive size={18} />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

### 4.2 У иконок убрать обводку

**Было:** `border-2 border-primary`
**Стало:** Без border, только `bg-primary/10` для selected state

```tsx
// CreateHabitForm.tsx (icon picker)
<button
  className={cn(
    "flex items-center justify-center w-12 h-12 rounded-xl transition-all",
    field.value === name
      ? "bg-primary/10 text-primary"
      : "bg-card text-muted-foreground hover:bg-muted"
  )}
>
  <Icon size={24} weight={field.value === name ? "fill" : "regular"} />
</button>
```

### 4.3 Предупреждение только при редактировании + popup

**Удалить из формы:**
```tsx
// CreateHabitForm.tsx - УДАЛИТЬ статичное предупреждение
{habitId && (
  <div className="bg-yellow-50 dark:bg-yellow-900/20 ...">
    Изменение названия или цвета...
  </div>
)}
```

**Добавить в кнопку сохранения:**
```tsx
// src/app/habits/[id]/edit/page.tsx
const [showWarning, setShowWarning] = useState(false);

const handleSubmit = async (data: FormValues) => {
  // Check if color or name changed
  const hasColorChange = data.color !== initialValues?.color;
  const hasNameChange = data.name !== initialValues?.name;

  if ((hasColorChange || hasNameChange) && !showWarning) {
    setShowWarning(true);
    return;
  }

  // Proceed with mutation
  await updateHabit.mutateAsync({ id: habitId, ...data });
  router.push('/my-habits');
};

// Warning Dialog
<Dialog open={showWarning} onOpenChange={setShowWarning}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Подтвердите изменения</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground">
      Изменение названия или цвета обновит отображение привычки за весь период статистики.
    </p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowWarning(false)}>
        Отмена
      </Button>
      <Button onClick={() => {
        setShowWarning(false);
        handleSubmit(form.getValues());
      }}>
        Сохранить
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4.4 20 цветов
✅ Уже реализовано в разделе 1.1

### 4.5 25 иконок (убрать Check, добавить habit-специфичные)

**Файл:** `src/components/shared/Icon/IconCatalog.tsx`

```tsx
import {
  Barbell,        // Спорт/Фитнес
  Book,           // Чтение
  BookOpen,       // Обучение
  BowlFood,       // Питание
  Brain,          // Медитация/Мышление
  Coffee,         // Кофе/Напитки
  Drop,           // Вода
  Eye,            // Зрение/Забота о себе
  FirstAid,       // Здоровье
  Flame,          // Streak/Энергия
  GraduationCap,  // Образование
  Headphones,     // Музыка/Подкасты
  Heart,          // Любовь/Отношения
  Leaf,           // Экология/Природа
  Lightning,      // Энергия/Продуктивность
  Moon,           // Сон
  MusicNote,      // Музыка
  PaintBrush,     // Творчество
  Pill,           // Лекарства/Витамины
  Plant,          // Растения/Уход
  Running,        // Бег/Кардио
  Shower,         // Гигиена
  Sun,            // Утро/Витамин D
  Target,         // Цели
  YinYang,        // Баланс/Йога
} from '@phosphor-icons/react';

export const ICON_CATALOG = {
  barbell: Barbell,
  book: Book,
  bookOpen: BookOpen,
  bowlFood: BowlFood,
  brain: Brain,
  coffee: Coffee,
  drop: Drop,
  eye: Eye,
  firstAid: FirstAid,
  flame: Flame,
  graduationCap: GraduationCap,
  headphones: Headphones,
  heart: Heart,
  leaf: Leaf,
  lightning: Lightning,
  moon: Moon,
  musicNote: MusicNote,
  paintBrush: PaintBrush,
  pill: Pill,
  plant: Plant,
  running: Running,
  shower: Shower,
  sun: Sun,
  target: Target,
  yinYang: YinYang,
} as const;

export type IconName = keyof typeof ICON_CATALOG;

export function getIcon(name: string) {
  return ICON_CATALOG[name as IconName] || Target;
}
```

**Backend Migration:**
```sql
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_icon_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_icon_check
  CHECK (icon IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang'
  ));
```

### 4.6 Создание/редактирование как отдельная страница

**Создать файлы:**

```
src/app/habits/
├── new/
│   └── page.tsx          # Create habit
└── [id]/
    └── edit/
        └── page.tsx      # Edit habit
```

**`src/app/habits/new/page.tsx`:**
```tsx
'use client';

import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function NewHabitPage() {
  const router = useRouter();

  // Telegram Back Button
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.show();
    tg.BackButton.onClick(() => router.back());

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick();
    };
  }, [router]);

  return (
    <div className="pb-24">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <CaretLeft size={24} weight="bold" />
        </Button>
        <h1 className="text-2xl font-bold">Новая привычка</h1>
      </div>

      <CreateHabitForm
        onSuccess={() => router.push('/my-habits')}
      />
    </div>
  );
}
```

**`src/app/habits/[id]/edit/page.tsx`:**
```tsx
'use client';

import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';
import { useHabitsQuery } from '@/features/habits/api/useHabits';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function EditHabitPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;

  const { data: habits = [] } = useHabitsQuery();
  const habit = habits.find(h => h.id === habitId);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.show();
    tg.BackButton.onClick(() => router.back());

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick();
    };
  }, [router]);

  if (!habit) {
    return <div className="p-4">Привычка не найдена</div>;
  }

  return (
    <div className="pb-24">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <CaretLeft size={24} weight="bold" />
        </Button>
        <h1 className="text-2xl font-bold">Редактирование</h1>
      </div>

      <CreateHabitForm
        habitId={habitId}
        initialValues={habit}
        onSuccess={() => router.push('/my-habits')}
      />
    </div>
  );
}
```

**Удалить из `src/app/page.tsx`:**
```tsx
// УДАЛИТЬ Dialog для создания/редактирования
<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
  ...
</Dialog>
```

**Обновить FAB:**
```tsx
// src/features/habits/components/FloatingActionButton.tsx
<motion.button
  onClick={() => router.push('/habits/new')} // было navigate('/create')
>
```

---

## 🔽 5. Навигационный бар (BottomNav)

### 5.1 Уменьшить высоту на 10px, адаптировать иконки и шрифты

**Файл:** `src/components/shared/BottomNav.tsx`

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 pb-4 pt-2">
  <div className="flex justify-around items-center h-12"> {/* было h-14, теперь h-12 (уменьшено на 8px) */}
    {navItems.map((item) => {
      const isActive = pathname === item.href;
      const Icon = item.icon;

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-0.5", // было space-y-1
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon size={22} weight={isActive ? "fill" : "regular"} /> {/* было 24 */}
          <span className="text-[10px] font-medium">{item.label}</span> {/* было text-xs */}
        </Link>
      );
    })}
  </div>
</nav>
```

**Добавить safe-area-inset:**
```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
```

---

## 🔧 6. Технические исправления (Code Review Fixes)

### 6.1 Telegram WebApp Integration

**Создать:** `src/lib/telegram.ts`

```typescript
export function initTelegramWebApp() {
  if (typeof window === 'undefined') return;

  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  tg.setHeaderColor(tg.themeParams.bg_color || '#FFFFFF');
  tg.setBackgroundColor(tg.themeParams.bg_color || '#FFFFFF');
}
```

**Вызвать в layout:**
```tsx
// src/app/layout.tsx
'use client';

import { initTelegramWebApp } from '@/lib/telegram';
import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  // ... rest
}
```

### 6.2 Haptic Feedback (Telegram API)

**Обновить:** `src/lib/haptic.ts`

```typescript
export const haptic = {
  light: () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  },

  medium: () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  },

  heavy: () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
  },

  success: () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  },

  warning: () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
  },

  error: () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
  },
};

// Deprecated (remove after migration)
export const triggerHaptic = haptic.light;
export const triggerSuccessHaptic = haptic.success;
```

**Обновить использование:**
```tsx
// HabitCard.tsx
import { haptic } from '@/lib/haptic';

const handleToggle = () => {
  haptic.light();
  onToggle(habit.id);
};

const handleArchive = () => {
  haptic.medium();
  onArchive(habit.id);
};
```

### 6.3 Убрать useEffect для confetti

**Файл:** `src/app/page.tsx`

**УДАЛИТЬ:**
```tsx
React.useEffect(() => {
  if (percentage === 100 && total > 0) {
    triggerSuccessHaptic();
    confetti({ ... });
  }
}, [percentage, total]);
```

**ДОБАВИТЬ в mutation:**
```tsx
// src/features/habits/api/useHabits.ts
const toggleHabit = useMutation({
  mutationFn: async ({ id, date }: { id: string; date: string }) => {
    // ... existing logic
  },
  onSuccess: async (_, { date }) => {
    queryClient.invalidateQueries({ queryKey: habitKeys.records(date) });
    queryClient.invalidateQueries({ queryKey: ['habits', 'week-records'] });

    // Check if all habits completed
    const updatedRecords = await queryClient.fetchQuery({
      queryKey: habitKeys.records(date),
    });
    const habits = await queryClient.fetchQuery({
      queryKey: habitKeys.lists(),
    });

    const activeHabits = habits.filter(h => h.status === 'active');
    const completedCount = activeHabits.filter(h =>
      updatedRecords.some(r => r.habitId === h.id && r.completed)
    ).length;

    if (completedCount === activeHabits.length && activeHabits.length > 0) {
      haptic.success();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  },
});
```

### 6.4 Вычислять Streak реально

**Backend:** Создать PostgreSQL функцию

```sql
-- supabase/migrations/YYYYMMDD_calculate_streak.sql

CREATE OR REPLACE FUNCTION calculate_habit_streak(
  p_habit_id UUID,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_record BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM habit_records
      WHERE habit_id = p_habit_id
        AND user_id = p_user_id
        AND date = check_date
        AND completed = true
    ) INTO has_record;

    IF NOT has_record THEN
      EXIT;
    END IF;

    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Frontend:** Вызывать функцию при загрузке habits

```tsx
// src/features/habits/api/useHabits.ts
export const useHabitsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: habitKeys.lists(),
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate streaks
      const habitsWithStreaks = await Promise.all(
        data.map(async (h: any) => {
          const { data: streakData } = await supabase.rpc('calculate_habit_streak', {
            p_habit_id: h.id,
            p_user_id: user.id
          });

          return {
            id: h.id,
            name: h.name,
            description: h.description,
            icon: h.icon,
            color: h.color,
            frequency: h.frequency,
            repeatDays: h.repeat_days,
            status: h.status,
            streak: streakData || 0,
            createdAt: h.created_at,
            archivedAt: h.archived_at,
            deletedAt: h.deleted_at,
            trackNotes: h.track_notes,
            trackWeight: h.track_weight,
            trackVolume: h.track_volume,
            trackCount: h.track_count,
            trackDuration: h.track_duration,
          };
        })
      );

      return habitsWithStreaks as Habit[];
    },
    enabled: !!user,
  });
};
```

---

## 🗂️ 7. Backend Updates

### 7.1 Миграции

**Создать файлы:**

```bash
supabase migration new update_habit_colors_and_icons
```

```sql
-- supabase/migrations/YYYYMMDD_update_habit_colors_and_icons.sql

-- Update color constraint (20 colors)
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_color_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_color_check
  CHECK (color IN (
    'crimson', 'ruby', 'coral', 'rose',
    'amber', 'gold', 'terracotta', 'peach',
    'emerald', 'jade', 'sage', 'mint',
    'sapphire', 'turquoise', 'teal', 'cerulean',
    'amethyst', 'lavender', 'plum', 'orchid'
  ));

-- Update icon constraint (25 icons, remove 'check')
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_icon_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_icon_check
  CHECK (icon IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang'
  ));

-- Migrate existing habits (optional, если есть данные)
-- UPDATE habits SET color = 'crimson' WHERE color = '#DC143C';
-- UPDATE habits SET icon = 'target' WHERE icon = 'check';

-- Streak calculation function
CREATE OR REPLACE FUNCTION calculate_habit_streak(
  p_habit_id UUID,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_record BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM habit_records
      WHERE habit_id = p_habit_id
        AND user_id = p_user_id
        AND date = check_date
        AND completed = true
    ) INTO has_record;

    IF NOT has_record THEN
      EXIT;
    END IF;

    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 7.2 Type Generation

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

---

## ✅ Чеклист для разработки

### Phase 1: Цветовая система (Critical)
- [ ] Добавить 20 новых цветов в `globals.css`
- [ ] Обновить `HabitColorSchema` в `schema.ts`
- [ ] Создать `src/lib/colors.ts` с функцией `getTextColorForHabit`
- [ ] Удалить hardcoded colors из `CreateHabitForm.tsx`
- [ ] Удалить hardcoded colors из `login/page.tsx`
- [ ] Обновить `HabitCard.tsx` для использования утилиты цвета
- [ ] Backend migration для color constraint

### Phase 2: Иконки (High)
- [ ] Обновить `IconCatalog.tsx` с 25 новыми иконками
- [ ] Удалить 'check' из каталога
- [ ] Backend migration для icon constraint
- [ ] Убрать обводку у иконок в форме

### Phase 3: Routing Refactor (High)
- [ ] Создать `/app/habits/new/page.tsx`
- [ ] Создать `/app/habits/[id]/edit/page.tsx`
- [ ] Удалить Dialog-based creation из `page.tsx`
- [ ] Обновить FAB для навигации на `/habits/new`
- [ ] Добавить Telegram BackButton в новые страницы
- [ ] Переместить warning в popup на кнопке save

### Phase 4: UI Improvements (Medium)
- [ ] Добавить логотип в Header (`/public/logo.png`)
- [ ] HABBITER капслоком
- [ ] SignOut icon weight="bold"
- [ ] Убрать HabitsHeader ("Добрый день друг")
- [ ] Компактнее WeekSwitcher (высота, gap, размеры)
- [ ] Компактнее TodayProgress (высота прогресс-бара)
- [ ] Обновить BottomNav (h-12, icon 22px, text-[10px])
- [ ] Добавить safe-area-inset-bottom

### Phase 5: Calendar Logic (Medium)
- [ ] Добавить статус 'failed' в progressMap
- [ ] Красная точка для пропущенных дней (date < today && 0%)
- [ ] Обновить WeekSwitcher styles для 'failed'

### Phase 6: Card Layout (Low)
- [ ] Создать `src/lib/layout.ts` с функцией `getCardWidth`
- [ ] Обновить `page.tsx` для паттерна 50/50, 40/60, 55/45

### Phase 7: Telegram Integration (Critical)
- [ ] Создать `src/lib/telegram.ts` с `initTelegramWebApp`
- [ ] Вызвать init в `layout.tsx`
- [ ] Обновить `haptic.ts` для использования Telegram API
- [ ] Заменить все `triggerHaptic()` на `haptic.light()`

### Phase 8: Code Quality (High)
- [ ] Переместить confetti logic из useEffect в mutation callback
- [ ] Backend: создать функцию `calculate_habit_streak`
- [ ] Frontend: вызывать RPC для streak calculation
- [ ] Исправить Login useEffect dependencies

### Phase 9: /my-habits Redesign (Medium)
- [ ] Создать новый дизайн страницы по гайдам
- [ ] Список привычек с edit/archive кнопками
- [ ] Навигация на `/habits/[id]/edit`

### Phase 10: Testing & Deploy
- [ ] `supabase db reset` (local test)
- [ ] Протестировать все flows в light/dark mode
- [ ] Протестировать в Telegram Mini App
- [ ] `supabase db push` (production)
- [ ] Generate types: `supabase gen types typescript`

---

## 📝 Примечания

### Приоритеты выполнения
1. **Critical:** Phase 1, 7 (цвета, Telegram API)
2. **High:** Phase 2, 3, 8 (иконки, routing, code quality)
3. **Medium:** Phase 4, 5, 9 (UI improvements, calendar, /my-habits)
4. **Low:** Phase 6 (card layout - visual polish)

### Потенциальные вопросы
1. **Миграция существующих данных:** Если в БД уже есть привычки с hex colors (#EF4444), нужен скрипт миграции на новые названия ('crimson')
2. **Backwards compatibility:** Решить, что делать со старыми иконками ('check') - автозамена на 'target'?
3. **Performance:** Streak calculation через RPC может быть медленным для >100 привычек. Рассмотреть кеширование или вычисление в background job

### Безопасность (Backend)
- Все новые Edge Functions должны иметь Zod validation
- RLS policies уже настроены, но проверить после миграции
- Telegram signature verification остается без изменений

---

**Готово к реализации!** 🚀
