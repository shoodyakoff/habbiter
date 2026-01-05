import {
  BarbellIcon,        // Спорт/Фитнес
  BookIcon,           // Чтение
  BookOpenIcon,       // Обучение
  BowlFoodIcon,       // Питание
  BrainIcon,          // Медитация/Мышление
  CoffeeIcon,         // Кофе/Напитки
  DropIcon,           // Вода
  EyeIcon,            // Зрение/Забота о себе
  FirstAidIcon,       // Здоровье
  FlameIcon,          // Streak/Энергия
  GraduationCapIcon,  // Образование
  HeadphonesIcon,     // Музыка/Подкасты
  HeartIcon,          // Любовь/Отношения
  LeafIcon,           // Экология/Природа
  LightningIcon,      // Энергия/Продуктивность
  MoonIcon,           // Сон
  MusicNoteIcon,      // Музыка
  PaintBrushIcon,     // Творчество
  PillIcon,           // Лекарства/Витамины
  PlantIcon,          // Растения/Уход
  PersonSimpleRunIcon,// Бег/Кардио
  ShowerIcon,         // Гигиена
  SunIcon,            // Утро/Витамин D
  TargetIcon,         // Цели
  YinYangIcon,        // Баланс/Йога
  // DesktopIcon,        // Компьютер/Работа
  // CodeIcon,           // Кодинг
  // RobotIcon,          // Технологии/ИИ
  // CpuIcon,            // Железо
  Icon
} from '@phosphor-icons/react';

export const ICON_CATALOG: Record<string, Icon> = {
  // TODO: Uncomment after applying migration 20260105_add_tech_icons.sql
  // desktop: DesktopIcon,
  // code: CodeIcon,
  // robot: RobotIcon,
  // cpu: CpuIcon,
  barbell: BarbellIcon,
  book: BookIcon,
  bookOpen: BookOpenIcon,
  bowlFood: BowlFoodIcon,
  brain: BrainIcon,
  coffee: CoffeeIcon,
  drop: DropIcon,
  eye: EyeIcon,
  firstAid: FirstAidIcon,
  flame: FlameIcon,
  graduationCap: GraduationCapIcon,
  headphones: HeadphonesIcon,
  heart: HeartIcon,
  leaf: LeafIcon,
  lightning: LightningIcon,
  moon: MoonIcon,
  musicNote: MusicNoteIcon,
  paintBrush: PaintBrushIcon,
  pill: PillIcon,
  plant: PlantIcon,
  running: PersonSimpleRunIcon,
  shower: ShowerIcon,
  sun: SunIcon,
  target: TargetIcon,
  yinYang: YinYangIcon,
};

export type IconName = keyof typeof ICON_CATALOG;

export function getIcon(name: string): Icon {
  return ICON_CATALOG[name] || TargetIcon;
}
