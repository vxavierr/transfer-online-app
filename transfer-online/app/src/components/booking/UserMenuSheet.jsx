import React from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, User, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UserMenuSheet({ user, userMenuItems, open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] p-0">
        <SheetTitle className="hidden">Menu do Usuário</SheetTitle>
        <SheetDescription className="hidden">Navegação e opções da conta</SheetDescription>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Olá,</p>
                <p className="font-bold text-lg">
                  {user ? user.full_name : 'Visitante'}
                </p>
                {user?.email && (
                  <p className="text-xs text-blue-100 truncate">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t p-4">
            <button
              onClick={() => {
                onOpenChange(false);
                base44.auth.logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}