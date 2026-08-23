import React, { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles,
  Calendar,
  Layers,
  UserCheck
} from 'lucide-react';
import { User } from '../types';

interface UserMenuProps {
  user: User | null;
  totalChartsCount: number;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export default function UserMenu({
  user,
  totalChartsCount,
  onLogout,
  onOpenAuth,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
      >
        <UserIcon className="h-3.5 w-3.5" />
        <span>Войти</span>
      </button>
    );
  }

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-all cursor-pointer select-none"
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
          style={{ backgroundColor: user.avatarColor || '#10b981' }}
        >
          {initial}
        </div>
        <span className="text-xs font-semibold text-zinc-200 truncate max-w-[110px]">
          {user.username}
        </span>
        <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in flex flex-col gap-1">
          {/* User Card */}
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850/60 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md flex-shrink-0"
              style={{ backgroundColor: user.avatarColor || '#10b981' }}
            >
              {initial}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{user.username}</h4>
              <p className="text-[11px] text-zinc-400 truncate">
                {user.email || 'Учетная запись'}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3" />
                <span>Авторизован</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-3 py-2 text-xs flex items-center justify-between text-zinc-400 border-b border-zinc-900">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              <span>Сохранено чартов:</span>
            </span>
            <span className="font-bold text-zinc-200 font-mono">{totalChartsCount}</span>
          </div>

          {/* Actions */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenAuth();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
            <span>Сменить аккаунт</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-red-400" />
            <span>Выйти из аккаунта</span>
          </button>
        </div>
      )}
    </div>
  );
}
