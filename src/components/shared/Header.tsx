import React from 'react';

interface HeaderProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Habbiter', rightAction }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
};
