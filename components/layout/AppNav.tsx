import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/rounds", label: "Rounds" },
  { href: "/events", label: "Events" },
  { href: "/import", label: "Import" },
  { href: "/audit", label: "Audit" },
  { href: "/reports", label: "Reports" },
  { href: "/import/history", label: "Import History" },
  { href: "/compare", label: "Compare" },
  { href: "/holes", label: "Hole Stats" },
];

export function AppNav() {
  return (
    <aside className="min-h-screen w-64 border-r border-slate-800 bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-xl font-bold text-white">Men&apos;s Club</h1>
        <p className="mt-1 text-sm font-medium text-slate-300">
          Handicap Dashboard
        </p>
      </div>

      <nav className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}