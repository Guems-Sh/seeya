'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';
import PushPermissionPrompt from '@/components/notifications/PushPermissionPrompt';

const BOTTOM_NAV_ITEMS = [
  { href: '/', label: 'CARTE', icon: '🗺' },
  { href: '/explore', label: 'MATCHS', icon: '⚡' },
  { href: '/create', label: 'DROP', icon: '📍' },
  { href: '/inbox', label: 'INBOX', icon: '📬' },
  { href: '/profile', label: 'MOI', icon: '👤' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col bg-black text-white md:flex-row">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden w-64 border-r-2 border-[#333333] bg-black p-6 md:block">
        <h1 className="mb-8 font-bold text-2xl text-[#CCFF00]">SeeYa</h1>
        <nav className="space-y-4">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 font-bold transition-colors ${
                pathname === item.href
                  ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                  : 'border-[#333333] hover:border-[#CCFF00]'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden bg-black">
        {children}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 flex flex-col border-t-2 border-[#333333] bg-black md:hidden">
        <div className="flex">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 border-r-2 border-[#333333] px-3 py-4 font-bold text-xs transition-colors last:border-r-0 ${
                pathname === item.href
                  ? 'bg-[#CCFF00] text-black'
                  : 'text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        {/* Safe area spacer for iPhone home indicator */}
        <div className="safe-bottom bg-black" />
      </nav>

      <PushPermissionPrompt />
    </div>
  );
}
