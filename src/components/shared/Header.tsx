import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Habbiter', rightAction }) => {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
            {rightAction && <div>{rightAction}</div>}
            {user && (
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
                    <LogOut className="h-5 w-5 text-muted-foreground" />
                </Button>
            )}
        </div>
      </div>
    </header>
  );
};
