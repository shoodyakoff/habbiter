# Backend Development Guidelines - Habiter

**Role:** Backend Developer
**Project:** Telegram Mini App для отслеживания привычек
**Goal:** Масштабируемый, безопасный Supabase backend с интеграцией Telegram

---

## 1. Tech Stack

**Backend:**
- Supabase (Auth, Database, Edge Functions, Realtime)
- PostgreSQL 15+ (snake_case naming)
- Deno 1.x (Edge Functions runtime)
- Telegram Bot API
- TypeScript (Strict Mode)
- Zod 4.3.4 (runtime validation)

**Architecture:**
```
supabase/
├── migrations/              # Versioned SQL schema
├── functions/               # Edge Functions (Deno)
│   ├── telegram-auth/       # Web OAuth
│   ├── telegram-auth-miniapp/  # Mini App auth
│   ├── telegram-webhook/    # Deep-link processing
│   ├── check-subscription/  # Manual check
│   └── cron-check-subscriptions/ # Scheduled check
└── config.toml

src/
├── features/auth/hooks/useAuth.ts
├── features/habits/api/useHabits.ts
└── lib/supabase.ts
```

---

## 2. Core Principles

1. **Security-First** - RLS на всех таблицах, валидация Zod, Telegram signature verification
2. **Migration-Based Schema** - все изменения через versioned SQL migrations
3. **Type-Safe** - Generated types from DB + Zod runtime validation
4. **Mobile-Optimized** - Efficient queries, subscription caching
5. **Observability** - Structured logging, audit trail

---

## 3. Database Design

### Naming Conventions
- **Tables/Columns:** `snake_case`
- **Indexes:** `idx_<table>_<column>`
- **Functions:** `snake_case` verbs

### Table Pattern
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT habits_name_length CHECK (char_length(name) <= 50)
);
```

### RLS Pattern (User Ownership)
```sql
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own habits"
  ON habits FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));
```

### Indexing Rules
1. **Foreign keys** - всегда индексируй
2. **WHERE clauses** - частые фильтры
3. **ORDER BY** - сортировка

```sql
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habit_records_date ON habit_records(date);
CREATE INDEX idx_habit_records_user_date ON habit_records(user_id, date DESC);
```

### Migration Workflow
```bash
# 1. Create migration
supabase migration new add_feature

# 2. Write SQL
# supabase/migrations/YYYYMMDD_add_feature.sql

# 3. Test locally
supabase db reset
supabase db diff

# 4. Deploy
supabase db push
```

---

## 4. Authentication

### Telegram Auth Flows

**Flow 1: Web Widget** (`telegram-auth`)
- Telegram Widget → verify hash (HMAC-SHA256) → check subscription → create JWT

**Flow 2: Mini App** (`telegram-auth-miniapp`)
- `window.Telegram.WebApp.initData` → verify signature → check subscription → create JWT

**Flow 3: Deep-Link** (`generate-auth-token` + `telegram-webhook`)
- Generate token → display `t.me/bot?start=auth_{token}` → webhook validates → frontend polls

### Hash Verification (CRITICAL)
```typescript
async function verifyTelegramHash(data: any, botToken: string): Promise<boolean> {
  const { hash, ...authData } = data;

  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');

  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(checkString));
  const calculatedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return calculatedHash === hash;
}
```

### Subscription Check
```typescript
async function checkChannelSubscription(telegramId: number, botToken: string, channelId: string): Promise<boolean> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${telegramId}`
  );
  const data = await response.json();
  const status = data.result.status;
  return ['creator', 'administrator', 'member', 'restricted'].includes(status);
}

// Update user + JWT claims
await supabase.from('users').update({ is_subscribed: isSubscribed }).eq('telegram_id', telegramId);
await supabase.auth.admin.updateUserById(authUserId, { app_metadata: { is_subscribed: isSubscribed } });
```

### Service Role vs Anon Key
- **Anon Key** - frontend, ограничен RLS, безопасен
- **Service Role Key** - Edge Functions, bypasses RLS, НИКОГДА не экспортируй в frontend

---

## 5. Edge Functions

### CORS + Error Handling
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const REQUIRED_ENV = ['TELEGRAM_BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    for (const key of REQUIRED_ENV) {
      if (!Deno.env.get(key)) throw new Error(`Missing ${key}`);
    }

    const body = await req.json();
    const validatedData = Schema.parse(body); // Zod validation

    // Business logic
    const result = await processRequest(validatedData);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### Input Validation with Zod
```typescript
import { z } from 'https://deno.land/x/zod/mod.ts';

const CreateHabitSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.enum(['yellow', 'orange', 'red', 'pink', 'purple', 'indigo', 'blue', 'cyan', 'teal', 'green', 'lime']),
  icon: z.string(),
  track_count: z.boolean().default(false),
  count_target: z.number().min(1).optional(),
});

const validatedData = CreateHabitSchema.parse(body);
```

---

## 6. Security Standards

### Critical Rules
1. **Validate ALL input with Zod** - никогда не используй raw user input
2. **NEVER construct SQL with string interpolation** - только parameterized queries (Supabase client)
3. **Always verify Telegram signatures** - используй `verifyTelegramHash` / `verifyWebAppData`
4. **Verify query_id uniqueness** - защита от replay attacks
5. **Validate timestamp** - `auth_date` не старше 1 часа

### Replay Attack Prevention
```typescript
async function verifyQueryId(queryId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('telegram_queries')
    .select('id')
    .eq('query_id', queryId)
    .single();

  if (existing) throw new Error('Query already processed (replay attack)');

  await supabase.from('telegram_queries').insert({ query_id: queryId, processed_at: new Date().toISOString() });
  return true;
}
```

### Timestamp Validation
```typescript
function validateTimestamp(authDate: number, maxAgeSeconds = 3600): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;
  if (age > maxAgeSeconds) throw new Error('Auth data expired');
  if (age < 0) throw new Error('Auth date in the future (clock skew)');
  return true;
}
```

---

## 7. Data Transformation

### snake_case → camelCase
**Backend (PostgreSQL):** `snake_case`
**Frontend (TypeScript):** `camelCase`

```typescript
// src/features/habits/api/useHabits.ts
export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase.from('habits').select('*');
      if (error) throw error;

      return data.map(habit => ({
        id: habit.id,
        userId: habit.user_id,
        trackNotes: habit.track_notes,
        createdAt: habit.created_at,
      }));
    }
  });
}
```

### Type Safety
```bash
# Generate types from DB
supabase gen types typescript --local > src/types/supabase.ts
```

```typescript
import { Database } from '@/types/supabase';
type Habit = Database['public']['Tables']['habits']['Row'];

// Zod schema for runtime validation
const HabitSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(50),
});
```

---

## 8. Analytics

### Admin Analytics (Metabase)
```sql
-- User engagement
CREATE VIEW analytics_user_engagement AS
SELECT
  u.id,
  COUNT(DISTINCT DATE(hr.created_at)) as days_active,
  COUNT(hr.id) as total_completions,
  MAX(hr.created_at) as last_activity
FROM users u
LEFT JOIN habit_records hr ON u.id = hr.user_id
GROUP BY u.id;

-- Habit performance
CREATE VIEW analytics_habit_performance AS
SELECT
  h.name,
  COUNT(CASE WHEN hr.completed THEN 1 END)::float / NULLIF(COUNT(hr.id), 0)::float as completion_rate
FROM habits h
LEFT JOIN habit_records hr ON h.id = hr.habit_id
WHERE h.status = 'active'
GROUP BY h.id, h.name;
```

### User-Facing Analytics
```typescript
// Edge Function: get-user-stats
const { data: dailyStats } = await supabase
  .from('habit_records')
  .select('date, completed')
  .eq('user_id', userId)
  .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

// Aggregate for Recharts
const chartData = Object.values(aggregated || {}).map(item => ({
  date: item.date,
  completionRate: (item.completed / item.total) * 100
}));
```

---

## 9. Audit Logging

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'create_habit', 'complete_habit', 'archive_habit'
  entity_type TEXT,     -- 'habit', 'habit_record'
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log action
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
VALUES ($1, 'complete_habit', 'habit_record', $2, jsonb_build_object('habit_name', $3));
```

---

## 10. PR Checklist

### Database
- [ ] Migration created (`YYYYMMDD_description.sql`)
- [ ] RLS policies applied
- [ ] Indexes added (FK, WHERE, ORDER BY)
- [ ] Tested locally (`supabase db reset`)

### Edge Functions
- [ ] CORS configured
- [ ] Zod validation
- [ ] Error handling (try-catch)
- [ ] Environment variables documented

### Security
- [ ] Telegram signature verified
- [ ] Query ID uniqueness checked
- [ ] Timestamp validated
- [ ] No secrets in code
- [ ] RLS authorization checked

### TypeScript
- [ ] Types generated (`supabase gen types`)
- [ ] No `any` types
- [ ] Strict mode compliant

---

## Remember

**Backend - это фундамент приложения. Безопасность и надежность важнее скорости разработки.**

1. Всегда валидируй input с Zod
2. Всегда используй RLS
3. Всегда verify Telegram signatures
4. Всегда тестируй миграции локально перед деплоем
5. Service Role Key - только в Edge Functions, НИКОГДА в frontend
