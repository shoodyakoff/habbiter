# Frontend Development Guidelines - Habiter

**Role:** Senior Frontend Developer
**Project:** Habiter - Telegram Mini App для отслеживания привычек
**Goal:** High-performance Next.js приложение с Supabase backend, акцент на type-safety, offline-first и Telegram WebApp интеграцию.

---

## 1. Sources of Truth

- **Theme & Tokens:** `src/app/globals.css` (Tailwind v4 CSS variables)
- **UI Components:** `src/components/ui/` (shadcn/ui + Radix Primitives)
- **Icons:** Lucide React + Phosphor Icons
- **Backend Schema:** Supabase Dashboard → Database Schema
- **Telegram API:** [Telegram WebApp Documentation](https://core.telegram.org/bots/webapps)

---

## 2. Tech Stack

**Core:**
- Next.js 16.1.1 (App Router, React Compiler, Static Export)
- React 19.2.3
- TypeScript (Strict Mode)

**Styling:**
- Tailwind CSS v4 (CSS Variables для темизации)
- clsx + tailwind-merge (`cn()` utility)
- Class Variance Authority (CVA)

**State:**
- TanStack Query 5.90.16 (server state)
- Zustand 5.0.9 (client state + localStorage)
- React Hook Form 7.69.0 (формы)

**Backend:**
- Supabase (Auth, Database, Real-time)
- PostgreSQL (snake_case схема)

**Validation:**
- Zod 4.3.4 (runtime validation)

**Utilities:**
- date-fns 4.1.0
- Framer Motion 12.23.26
- Canvas Confetti

---

## 3. Architecture: Feature-First

```
src/
├── app/                     # Next.js App Router (RSC для layouts)
├── features/                # Feature-based модули
│   ├── auth/hooks/          # useAuth.ts
│   └── habits/
│       ├── api/             # React Query hooks
│       ├── components/      # Feature UI
│       ├── store/           # Zustand store
│       ├── types/           # Zod schemas
│       └── utils/           # Feature utilities
├── components/
│   ├── ui/                  # Atomic компоненты (shadcn/ui)
│   ├── shared/              # Header, BottomNav, Icon
│   └── auth/                # AuthGuard
└── lib/                     # Supabase client, utils, haptic
```

---

## 4. Data Fetching & State Management

### Decision Tree

1. **Server data?** → React Query
2. **Local persistent state?** → Zustand + localStorage
3. **Forms?** → React Hook Form + Zod
4. **Filters/tabs?** → URL Search Params (optional)
5. **Calculated values?** → Derived state (pure JS)

### React Query Pattern

```typescript
// features/habits/api/useHabits.ts
export function useHabits() {
  return useQuery({
    queryKey: ['habits', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return HabitListSchema.parse(data); // Zod validation
    },
  });
}
```

### Zustand with Persistence

```typescript
export const useHabitStore = create<HabitStore>()(
  persist(
    (set) => ({
      habits: [],
      addHabit: (habit) => set((state) => ({
        habits: [...state.habits, habit]
      })),
    }),
    { name: 'habiter-storage' }
  )
);
```

---

## 5. Strict "No useEffect" Policy

**❌ NEVER:**
- Fetch data in `useEffect` → Use React Query
- Sync states in `useEffect` → Use derived state
- Analytics in `useEffect` on mount → Use event handlers

**✅ CORRECT:**
```typescript
// Data fetching
const { data: habits } = useHabits();

// Derived state
const filteredHabits = habits?.filter(h => h.active) ?? [];

// Analytics
const handleClick = () => {
  analytics.track('click');
  // ...
};
```

**Exceptions (rare):**
- Telegram WebApp listeners
- Non-React library integrations
- Always return cleanup function

---

## 6. Styling Standards (Tailwind v4 + Dark Mode)

### Mobile-First + Dark Mode

```tsx
// ✅ Correct
<div className="p-4 md:p-6 bg-background text-foreground">

// ❌ Wrong
<div className="p-8 md:p-6 max-sm:p-4 bg-white dark:bg-gray-900">
```

### Semantic Tokens (Auto Dark Mode)

**All colors defined in `src/app/globals.css`:**

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-border: var(--border);
}

:root {
  --background: #FFFFFF;
  --foreground: #111827;
  --primary: #6366F1;
}

.dark {
  --background: #111827;
  --foreground: #F9FAFB;
  --primary: #6366F1;
}
```

**Usage:**
```tsx
// ✅ Semantic tokens (preferred)
<div className="bg-background text-foreground border-border">

// ✅ Dark modifier (when needed)
<div className="bg-white dark:bg-gray-900">

// ❌ Hardcoded colors
<div className="bg-[#6366F1]">  // NEVER!
```

### Interactive States

```tsx
<button className="
  bg-primary text-white
  hover:bg-primary/90
  focus-visible:ring-2 focus-visible:ring-primary
  disabled:opacity-50 disabled:cursor-not-allowed
  active:scale-95
  transition-all
">
```

---

## 7. Color Management

**CRITICAL:** All colors live in `src/app/globals.css` as CSS variables.

### Habit Colors

```css
/* globals.css - ONLY place for colors */
@theme inline {
  --color-habit-yellow: #FDCB6E;
  --color-habit-orange: #FF9F43;
  --color-habit-blue: #0984E3;
  /* ... */
}
```

**Usage:**
```tsx
{% raw %}
// ✅ Dynamic style
<div
  className="rounded-full size-8"
  style={{ backgroundColor: `var(--color-habit-${color})` }}
/>

// ❌ Hardcoded
<div style={{ color: '#EF4444' }}>  // NEVER!
{% endraw %}
```

**TypeScript:**
```typescript
export const HabitColorSchema = z.enum([
  'yellow', 'orange', 'red', 'pink', 'purple',
  'indigo', 'blue', 'cyan', 'teal', 'green', 'lime',
]);

export const HABIT_COLORS: readonly HabitColor[] = [
  'yellow', 'orange', 'red', /* ... */
] as const;
```

---

## 8. Telegram WebApp Integration

### Initialization

```typescript
if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.enableClosingConfirmation();
  tg.setHeaderColor(tg.themeParams.bg_color);
}
```

### Haptic Feedback

```typescript
// lib/haptic.ts
export const haptic = {
  light: () => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'),
  success: () => window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'),
};

// Usage
import { haptic } from '@/lib/haptic';
const handleToggle = () => {
  haptic.light();
  // ...
};
```

### Back Button

```typescript
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
```

---

## 9. Backend Integration (Supabase)

### Authentication

```typescript
// features/auth/hooks/useAuth.ts
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user };
}
```

### Mutations

```typescript
export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (habit: NewHabit) => {
      const { data, error } = await supabase
        .from('habits')
        .insert(habit)
        .select()
        .single();

      if (error) throw error;
      return HabitSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}
```

### Error Handling

```typescript
mutate(newHabit, {
  onError: (error: PostgrestError) => {
    if (error.code === '23505') {
      toast.error('Привычка уже существует');
    } else {
      toast.error(error.message);
    }
  },
});
```

---

## 10. Validation (Zod Required)

**Pattern: Schema → Type**

```typescript
// features/habits/types/schema.ts
export const HabitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: HabitColorSchema,
  track_count: z.boolean().default(false),
  count_target: z.number().min(1).optional(),
  created_at: z.string().datetime(),
});

export type Habit = z.infer<typeof HabitSchema>;
```

**Form Validation:**
```typescript
const form = useForm<Habit>({
  resolver: zodResolver(HabitSchema),
  defaultValues: { name: '', color: 'blue' },
});
```

---

## 11. Development Hygiene

- **No hardcoded strings:** Use constants/i18n
- **Date/number formatting:** Use `Intl` API
- **Testing attributes:** Every interactive element needs `data-testid="feature_component_action"`
- **Unit tests:** Custom hooks, utilities, complex UI components
- **Barrel exports:** Use `index.ts` in feature folders

---

## 12. PR Checklist

### Code Quality
- [ ] No `useEffect` for data fetching (React Query only)
- [ ] No state sync in `useEffect` (derived state)
- [ ] All API data validated with Zod
- [ ] No hardcoded strings

### Styling & Dark Mode
- [ ] Semantic tokens used (`bg-background`, `text-foreground`)
- [ ] **NO hardcoded colors** - only CSS variables from `globals.css`
- [ ] Mobile-first approach (`p-4`, then `md:p-6`)
- [ ] All interactive states defined (hover, focus, disabled, active)
- [ ] **Works in dark mode** (test with system theme toggle)
- [ ] Works on 375px screen (iPhone SE)

### State Management
- [ ] Server data → React Query
- [ ] Local persistent → Zustand
- [ ] Forms → React Hook Form + Zod
- [ ] Derived values → Pure JS

### Telegram Integration
- [ ] Haptic feedback on key actions
- [ ] Back button works correctly (if used)
- [ ] Theme adapts to Telegram theme params
- [ ] Viewport configured (expand, enableClosingConfirmation)

### TypeScript
- [ ] No `any` types
- [ ] All props typed
- [ ] Types inferred from Zod schemas
- [ ] Strict mode compliant

### Testing
- [ ] Interactive elements have `data-testid`
- [ ] Business logic has unit tests
- [ ] Utilities have tests
- [ ] Forms tested (validation, submission)

### Performance
- [ ] No unnecessary re-renders (checked with React DevTools Profiler)
- [ ] Heavy computations memoized (`useMemo`)
- [ ] Event handlers memoized (`useCallback`) when needed
- [ ] Images optimized (WebP, correct sizes)

### Accessibility
- [ ] Buttons/links have ARIA attributes
- [ ] Forms have labels
- [ ] Keyboard navigation works
- [ ] Focus states visible

---

## Key Principles

1. **Mobile-first, Telegram-first** - приложение создается для Telegram Mini App
2. **Type-safety everywhere** - Zod для runtime, TypeScript для compile-time
3. **No useEffect for data** - React Query решает 99% задач
4. **Offline-first** - Zustand + localStorage для resilience
5. **Single source of truth для цветов** - `globals.css` (CSS variables)
6. **Semantic styling** - используем токены, не arbitrary values
7. **Dark mode by default** - всегда тестируем темную тему
8. **User experience** - haptic feedback, плавные анимации, быстрый отклик
