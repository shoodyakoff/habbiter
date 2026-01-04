# Design Guidelines - Habiter

**Role:** Product Designer
**Project:** Habiter - Telegram Mini App для отслеживания привычек
**Mission:** Создавать визуально выразительные, функциональные интерфейсы с уникальной эстетикой, избегая шаблонных решений и generic AI-дизайна.

---

## Design Philosophy

Habiter — это не просто трекер привычек. Это персональное пространство для саморазвития, живущее в Telegram. Наша задача — создать интерфейс, который:

- **Мотивирует**: Каждое взаимодействие приносит микро-радость
- **Запоминается**: Смелые визуальные решения, которые невозможно забыть
- **Работает**: Красота никогда не идет в ущерб функциональности
- **Адаптируется**: Безупречно смотрится в светлой и темной теме Telegram

---

## Design Thinking Process

Перед созданием каждого компонента/экрана задай себе вопросы:

### 1. **Контекст и Цель**
- Какую проблему решает этот экран?
- Кто пользователь и в каком эмоциональном состоянии он находится?
- Какое действие должно быть главным?

### 2. **Эстетическое Направление**
Выбери BOLD направление (не пытайся понравиться всем):

**Примеры тональности:**
- Минимализм с акцентом на типографику
- Максимализм с layered effects и насыщенными градиентами
- Ретро-футуризм (80s/90s vibes)
- Organic/nature-inspired (мягкие формы, естественные цвета)
- Brutalist/raw (геометрия, контраст, функциональность)
- Editorial/magazine (сетки, white space, изысканная типографика)
- Playful/toy-like (скругления, яркие цвета, анимации)

**Для Habiter:**
- **Базовая тональность**: Минимализм с акцентом на цвет и плавные микро-интеракции
- **Ключевая фишка**: Habit Cards — центральный элемент с максимальной визуальной выразительностью через цвет
- **Дифференциатор**: Не используем standard UI patterns — каждый элемент имеет характер

### 3. **Незабываемость**
Что делает этот дизайн УНИКАЛЬНЫМ?
- Неожиданная композиция?
- Характерная типографика?
- Signature animation pattern?
- Смелая цветовая палитра?

---

## Visual Design Standards

### Typography

**Font Stack:**
- **Primary**: [Onest](https://fonts.google.com/specimen/Onest) — современный геометрический гротеск с кириллицей
- **System fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Type Scale (Mobile-First):**
```css
/* Headlines */
.text-h1: 28px / 1.2 / 700
.text-h2: 24px / 1.3 / 600
.text-h3: 20px / 1.4 / 600

/* Body */
.text-base: 16px / 1.5 / 400
.text-sm: 14px / 1.5 / 400
.text-xs: 12px / 1.4 / 400

/* UI Elements */
.text-button: 15px / 1 / 500
.text-label: 13px / 1.2 / 500
```

**Правила:**
- ✅ Используй разрядку (letter-spacing) для uppercase заголовков: `tracking-wider`
- ✅ Для чисел и статистики используй tabular figures: `font-variant-numeric: tabular-nums`
- ❌ Никогда не используй Inter, Roboto, Arial — это generic AI slop
- ❌ Не смешивай более 2 начертаний в одном экране

### Color System

**КРИТИЧНО:** Все цвета живут в `src/app/globals.css` как CSS переменные.

**Базовая палитра (Semantic Tokens):**
```css
/* Light Mode */
--background: #FFFFFF
--foreground: #111827
--primary: #6366F1 (Indigo 600)
--muted: #F3F4F6
--border: #E5E7EB
--destructive: #EF4444

/* Dark Mode */
--background: #111827
--foreground: #F9FAFB
--primary: #6366F1
--muted: #374151
--border: #374151
```

**Habit Colors (Brand Identity):**
```css
--color-habit-yellow: #FDCB6E  /* Sun Flower */
--color-habit-orange: #FF9F43  /* Pastel Orange */
--color-habit-red: #FF6B6B     /* Pastel Red */
--color-habit-pink: #FD79A8
--color-habit-purple: #A29BFE
--color-habit-indigo: #6C5CE7
--color-habit-blue: #0984E3
--color-habit-cyan: #81ECEC
--color-habit-teal: #00CEC9
--color-habit-green: #00B894   /* Mint Leaf */
--color-habit-lime: #DFE6E9
```

**Цветовые принципы:**
1. **Доминантный цвет + акцент**: Habit Cards используют полный цвет как фон, остальные элементы нейтральны
2. **Контраст для читаемости**: На светлых Habit Colors (yellow, orange, lime, cyan, teal) → черный текст. На темных → белый текст
3. **Dark Mode Adaptive**: Используй semantic tokens (`bg-background`, `text-foreground`) для автоматической адаптации
4. **Никогда не хардкодь**: `bg-[#6366F1]` ❌ | `bg-primary` ✅

### Spacing & Layout

**8px Grid System:**
```
xs: 4px   (0.5 spacing units)
sm: 8px   (1)
md: 16px  (2)
lg: 24px  (3)
xl: 32px  (4)
2xl: 48px (6)
3xl: 64px (8)
```

**Container:**
- Mobile: `px-4` (16px padding)
- Desktop: `max-w-7xl mx-auto px-6`

**Composition:**
- ✅ Embrace asymmetry: Habit Cards в grid с разными высотами
- ✅ Generous negative space: Не заполняй каждый пиксель
- ✅ Z-axis layering: Используй shadows для создания глубины
- ❌ Избегай perfect centering везде — создавай visual tension

### Borders & Radius

**Border Radius (Tailwind v4):**
```css
--radius: 0.625rem (10px base)
rounded-lg: 10px
rounded-xl: 14px
rounded-2xl: 18px
rounded-3xl: 22px
```

**Pattern:**
- Habit Cards: `rounded-2xl` (18px) — signature rounded look
- Buttons: `rounded-md` (6px)
- Inputs: `rounded-md` (6px)
- Modals/Dialogs: `rounded-3xl` (22px)
- Pills/Badges: `rounded-full`

**Borders:**
- Primary: `border` (1px, `--border` color)
- Subtle: `border border-border/50`
- Emphasized: `border-2 border-primary`

### Shadows & Depth

**Shadow Scale:**
```css
shadow-xs: 0 1px 2px rgba(0,0,0,0.05)
shadow-sm: 0 1px 3px rgba(0,0,0,0.1)
shadow-md: 0 4px 6px rgba(0,0,0,0.1)
shadow-lg: 0 10px 15px rgba(0,0,0,0.1)
shadow-xl: 0 20px 25px rgba(0,0,0,0.1)
```

**Usage:**
- Habit Cards: `shadow-sm` (subtle lift)
- Floating Action Button: `shadow-lg` (prominent)
- Modals: `shadow-xl`
- Hover states: Увеличивай shadow на 1 уровень

### Motion & Animation

**КРИТИЧНО:** Каждая интеракция должна иметь haptic feedback и визуальный отклик.

**Animation Library:** Framer Motion 12.23.26

**Timing Functions:**
```css
ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1)
ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1)
```

**Standard Durations:**
- Micro-interactions: 150-200ms
- Page transitions: 300-400ms
- Complex animations: 500-800ms

**Animation Patterns:**

1. **Habit Card Toggle:**
```tsx
<motion.div
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
```

2. **List Item Entrance (Stagger):**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
>
```

3. **Swipe Gestures:**
```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={{ left: 0.7, right: 0.7 }}
  onDragEnd={handleDragEnd}
>
```

4. **Success Celebration:**
```tsx
// Canvas Confetti on streak milestone
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 }
});
```

**Правила:**
- ✅ Используй native CSS animations для simple transitions
- ✅ Framer Motion для complex gestures (drag, swipe)
- ✅ Всегда добавляй haptic feedback на key actions
- ❌ Избегай анимаций > 800ms (feels sluggish)
- ❌ Не анимируй все одновременно (overwhelming)

### Icons

**Icon Libraries:**
- **Primary**: [Phosphor Icons](https://phosphoricons.com/) (`@phosphor-icons/react`)
- **Secondary**: [Lucide React](https://lucide.dev/)

**Icon Sizes:**
- Small: 16px (sm)
- Default: 24px (base)
- Large: 32px (lg)
- Hero: 48px+ (xl)

**Weights (Phosphor):**
- `regular`: Default state
- `fill`: Active/selected state
- `bold`: Emphasis

**Usage:**
```tsx
import { Flame, Check, Archive } from '@phosphor-icons/react';

// Active state
<Flame size={24} weight="fill" className="text-orange-500" />

// Default
<Check size={24} weight="regular" className="text-foreground" />
```

---

## Component Design Patterns

### Habit Card (Flagship Component)

**Spec:**
- **Layout**: 112px height, `rounded-2xl`, full habit color background
- **Structure**:
  - Top-left: Habit icon (24px, black/white based on bg brightness)
  - Top-right: Checkbox (32px circle, animated fill on toggle)
  - Bottom: Name (text-lg, bold), optional description (text-xs), streak badge
- **Interaction**:
  - Tap checkbox → Toggle completion (haptic + scale animation)
  - Swipe right (>100px) → Complete (green background reveal)
  - Swipe left (>100px) → Archive (red background reveal)
  - Tap card → Open detail dialog (if tracking params exist)
- **States**:
  - Default: `shadow-sm`
  - Hover: `shadow-md`
  - Active (dragging): `shadow-lg`, `scale-98`
  - Completed: Checkbox fills with black/white, checkmark animates

**Design Considerations:**
- Цвет фона (habit color) — это визуальная идентичность карточки
- Streak badge: `bg-black/10 backdrop-blur-sm` с flame icon
- Text color logic: Светлые цвета (yellow, orange, lime, cyan, teal) → черный текст. Темные → белый
- Анимация checkbox: `pathLength` от 0 до 1 (200ms)

### Buttons

**Variants:**
- `default`: Filled primary color (`bg-primary text-white`)
- `outline`: Border with transparent bg (`border bg-background`)
- `ghost`: No background, hover accent (`hover:bg-accent`)
- `destructive`: Red fill (`bg-destructive text-white`)

**Sizes:**
- `sm`: 32px height
- `default`: 36px height
- `lg`: 40px height
- `icon`: 36x36px square

**States:**
```tsx
<Button className="
  bg-primary text-white
  hover:bg-primary/90
  active:scale-95
  focus-visible:ring-2 focus-visible:ring-primary
  disabled:opacity-50
  transition-all duration-150
" />
```

### Floating Action Button (FAB)

**Spec:**
- **Position**: Fixed bottom-right, `bottom-20 right-4` (above BottomNav)
- **Size**: 56x56px
- **Style**: `rounded-full bg-primary text-white shadow-lg`
- **Icon**: Plus (24px, bold)
- **Interaction**:
  - Tap → Navigate to `/create` (haptic + scale animation)
  - Hover: `shadow-xl`, `scale-105`

### Input Fields

**Pattern:**
```tsx
<div className="space-y-1.5">
  <Label className="text-sm font-medium text-foreground">
    Название привычки
  </Label>
  <Input
    className="
      h-10 px-3 rounded-md
      bg-background border border-border
      text-foreground placeholder:text-muted-foreground
      focus-visible:ring-2 focus-visible:ring-primary
      disabled:opacity-50
    "
    placeholder="Читать 30 минут"
  />
</div>
```

### Dialog / Modal

**Spec:**
- **Overlay**: `bg-black/50 backdrop-blur-sm`
- **Content**: `rounded-3xl bg-background shadow-xl p-6`
- **Animation**: Fade in overlay + slide up content (300ms)
- **Mobile**: Full-screen on small devices, centered modal on desktop

**Header:**
```tsx
<DialogHeader>
  <DialogTitle className="text-2xl font-semibold">
    Детали привычки
  </DialogTitle>
</DialogHeader>
```

### Bottom Navigation

**Spec:**
- **Position**: Fixed bottom, full width
- **Height**: 64px + safe-area-inset-bottom
- **Background**: `bg-background/80 backdrop-blur-lg border-t border-border`
- **Items**: 3-5 tabs, center-aligned icons (24px) + labels (text-xs)
- **Active state**: `text-primary`, icon weight → `fill`

---

## Dark Mode Strategy

**Принцип:** Используй semantic tokens везде, где возможно. Dark mode должен работать автоматически.

**Auto-Adaptive Components:**
```tsx
// ✅ Правильно (автоматически адаптируется)
<div className="bg-background text-foreground border-border">

// ✅ Ручное управление (когда нужно)
<div className="bg-white dark:bg-gray-900">

// ❌ Хардкод (никогда)
<div style={{ backgroundColor: '#FFFFFF' }}>
```

**Testing:**
- Всегда проверяй дизайн в обеих темах
- Используй Telegram theme params для автоматической синхронизации
- Проверяй контраст текста: минимум 4.5:1 для body, 3:1 для large text

**Dark Mode Specific Adjustments:**
- Shadows: В dark mode уменьшай opacity shadows
- Borders: `border-white/10` вместо `border-black/10`
- Overlays: `bg-black/80` вместо `bg-black/50`

---

## Backgrounds & Visual Details

**ИЗБЕГАЙ:** Solid white/gray backgrounds везде.

**ИСПОЛЬЗУЙ:**

1. **Gradient Meshes:**
```tsx
<div className="
  bg-gradient-to-br from-indigo-50 via-white to-purple-50
  dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950
">
```

2. **Noise Textures:**
```css
background-image: url("data:image/svg+xml,%3Csvg...noise pattern...");
opacity: 0.05;
```

3. **Radial Gradients (Subtle Spotlights):**
```tsx
<div className="relative">
  <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent" />
  {/* Content */}
</div>
```

4. **Layered Transparencies:**
```tsx
<div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
```

---

## Что НИКОГДА не делать (Anti-Patterns)

### ❌ Generic AI Slop Aesthetics

**Запрещенные фонты:**
- Inter
- Roboto
- Arial
- System fonts (без fallback)

**Запрещенные цветовые схемы:**
- Purple gradients на белом фоне (клише AI)
- Только синий + белый (скучно)
- 50 shades of gray (безликость)

**Запрещенные паттерны:**
- Cookie-cutter Material Design копирование
- Абсолютно симметричные layouts
- Все элементы с одинаковыми border-radius
- Отсутствие white space (cramped)

### ❌ Плохие практики

**Цвета:**
- Хардкод hex в JSX: `style={{ color: '#6366F1' }}`
- Использование arbitrary values вместо semantic tokens
- Игнорирование dark mode

**Типографика:**
- Более 3 размеров шрифта на одном экране
- Плохая иерархия (все одинаковый вес)
- Недостаточный line-height для кириллицы (минимум 1.4)

**Анимации:**
- Анимации без цели (motion for motion's sake)
- Слишком медленные (>800ms)
- Отсутствие haptic feedback на mobile

**Layout:**
- Игнорирование mobile-first
- Фиксированные высоты (вместо min-height)
- Использование `px` вместо responsive units

---

## Design Workflow

### 1. Research Phase
- Изучи контекст задачи в `frontend.md` (tech stack, constraints)
- Просмотри существующие компоненты в `src/components/ui/`
- Проверь цвета в `src/app/globals.css`

### 2. Ideation
- Выбери aesthetic direction (минимализм, максимализм, etc.)
- Определи ключевую "незабываемую" фичу
- Создай moodboard (typography + colors + reference apps)

### 3. Implementation
- Используй Tailwind CSS v4 utility classes
- Следуй mobile-first подходу
- Добавь Framer Motion для анимаций
- Интегрируй haptic feedback на key actions

### 4. Refinement
- Протестируй в dark mode
- Проверь на 375px (iPhone SE) и 430px (iPhone Pro Max)
- Убедись, что анимации плавные (60fps)
- Валидируй контраст цветов (WCAG AA)

---

## Platform-Specific: Telegram Mini App

### Viewport Setup
```typescript
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.setHeaderColor(tg.themeParams.bg_color);
  tg.setBackgroundColor(tg.themeParams.bg_color);
}
```

### Theme Integration
```typescript
const telegramTheme = window.Telegram?.WebApp?.themeParams;
// Use telegramTheme.bg_color, telegramTheme.text_color, etc.
```

### Safe Areas
```tsx
<div className="pb-[env(safe-area-inset-bottom)]">
  {/* Bottom Nav */}
</div>
```

### Haptic Feedback (Обязательно!)
```typescript
import { triggerHaptic } from '@/lib/haptic';

const handleClick = () => {
  triggerHaptic(); // Light impact
  // ... action
};
```

**When to use haptic:**
- Toggle habit completion
- Archive/delete actions
- Navigation
- Form submission
- Success/error states

---

## Inspiration Sources

**Apps to study (NOT copy):**
- **Streaks** (iOS) — habit tracking UX
- **Things 3** — minimal task management
- **Linear** — modern, fast interactions
- **Notion** — flexible layouts
- **Arc Browser** — bold color usage

**Design Systems:**
- **Vercel Design** — modern, clean
- **Radix Colors** — accessible color scales
- **Tailwind UI** — component patterns

**Typography:**
- **Typewolf** — font pairings
- **Fontshare** — free quality fonts

---

## Key Principles (TL;DR)

1. **Bold Aesthetic Choices** — Не бойся быть уникальным
2. **Color as Identity** — Habit Colors — это душа приложения
3. **Motion Matters** — Каждая интеракция = haptic + animation
4. **Mobile-First** — 375px экран = приоритет №1
5. **Dark Mode Native** — Не afterthought, а core requirement
6. **Semantic Everything** — Tokens, не hardcode
7. **Telegram Context** — Мы живем в Telegram, а не в браузере
8. **Performance** — Красота не должна стоить 60fps

---

**Remember:** Создавай дизайн, который пользователь откроет друзьям со словами "Смотри какая красивая штука!". Это мера успеха.
