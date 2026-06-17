'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Images, MapPin, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/map',     label: 'Map',      icon: Map },
  { href: '/gallery', label: 'Gallery',  icon: Images },
  { href: '/spots',   label: 'Spots',    icon: MapPin },
  { href: '/planner', label: 'Planner',  icon: CalendarDays },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] border-t border-[var(--border)] safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium',
                active
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[var(--accent)]')} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
