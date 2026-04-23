'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';
import PushPermissionPrompt from '@/components/notifications/PushPermissionPrompt';

const BOTTOM_NAV_ITEMS = [
  { href: '/', label: 'CARTE', icon: '⌂' },
  { href: '/circles', label: 'CERCLES', icon: '◎' },
  { href: '/create', label: 'DROP', icon: '+', isCenter: true },
  { href: '/inbox', label: 'ACTIVITÉ', icon: '✉' },
  { href: '/profile', label: 'MOI', icon: '◯' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col bg-white text-black md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r-2 border-black bg-white p-6 md:block">
        <h1 className="mb-8 text-2xl font-black uppercase text-black">SEEYA</h1>
        <nav className="space-y-2">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 border-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                pathname === item.href
                  ? 'border-black bg-black text-white'
                  : 'border-black bg-white text-black hover:bg-[#F5F5F5]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-white">
        {children}
      </main>

      {/* Bottom Navigation — Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex flex-col border-t-2 border-black bg-white md:hidden">
        <div className="flex items-stretch">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            if (item.isCenter) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
                >
                  <span className={`flex h-10 w-10 items-center justify-center border-2 border-black text-xl font-black ${
                    active ? 'bg-[#CCFF00] text-black' : 'bg-black text-white'
                  }`}>
                    +
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-black">DROP</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 border-r-2 border-black py-3 last:border-r-0 transition-colors ${
                  active ? 'bg-black text-white' : 'bg-white text-[#888888] hover:bg-[#F5F5F5] hover:text-black'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="safe-bottom bg-white" />
      </nav>

      <PushPermissionPrompt />
    </div>
  );
}
