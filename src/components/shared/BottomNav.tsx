'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, ChartBar, Notebook } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Прогресс',
      href: '/',
      icon: House,
    },
    {
      label: 'Мои привычки',
      href: '/my-habits',
      icon: Notebook,
    },
    {
      label: 'Статистика',
      href: '/stats',
      icon: ChartBar,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
      <div className="flex justify-around items-center h-12">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-0.5",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} weight={isActive ? "fill" : "regular"} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
