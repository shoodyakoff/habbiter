import {
  Barbell,
  Book,
  Drop,
  Moon,
  Sun,
  Laptop,
  Leaf,
  Check,
  Coffee,
  Heart,
  Briefcase,
  Money,
  MusicNotes,
  PaintBrush,
  Icon
} from '@phosphor-icons/react';

export const ICON_CATALOG: Record<string, Icon> = {
  barbell: Barbell,
  book: Book,
  drop: Drop,
  moon: Moon,
  sun: Sun,
  laptop: Laptop,
  leaf: Leaf,
  check: Check,
  coffee: Coffee,
  heart: Heart,
  briefcase: Briefcase,
  money: Money,
  music: MusicNotes,
  art: PaintBrush,
};

export const getIcon = (name: string): Icon => {
  return ICON_CATALOG[name] || Check;
};
