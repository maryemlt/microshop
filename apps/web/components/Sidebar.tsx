"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicServiceUrls } from "@/lib/config";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Tableau de bord",
    icon: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  },
  {
    href: "/users",
    label: "Utilisateurs",
    icon: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05A4.22 4.22 0 0 1 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z",
  },
  {
    href: "/orders",
    label: "Commandes",
    icon: "M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM1 2v2h2l3.6 7.59-1.35 2.45A2 2 0 0 0 7 17h12v-2H7.42a.25.25 0 0 1-.22-.37L8.1 13h7.45a2 2 0 0 0 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21l-.94-2H1Zm16 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          M
        </span>
        <span>
          MicroShop
          <small>Back-office</small>
        </span>
      </Link>

      <nav className="nav" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="nav-link" aria-current={active ? "page" : undefined}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d={item.icon} fill="currentColor" />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <dl className="sidebar-services">
        <dt>users-service</dt>
        <dd>{publicServiceUrls.users}</dd>
        <dt>orders-service</dt>
        <dd>{publicServiceUrls.orders}</dd>
      </dl>
    </aside>
  );
}
