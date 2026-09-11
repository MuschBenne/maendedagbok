/**
 * Huvudmenyn i sidhuvudet.
 *
 * Visar länkarna och markerar sidan man står på. Det är en klientkomponent
 * eftersom den läser den aktuella URL:en i webbläsaren (usePathname).
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Översikt" },
  { href: "/maende", label: "Mående" },
  { href: "/panik", label: "Panik" },
  { href: "/statistik", label: "Statistik" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Huvudmeny">
      <ul className="flex gap-1">
        {links.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-soft text-accent-strong"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
