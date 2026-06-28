import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/rounds", label: "Rounds" },
  { href: "/events", label: "Events" },
  { href: "/import", label: "Import" },
  { href: "/audit", label: "Audit" },
  { href: "/reports", label: "Reports" },
];

export function AppNav() {
  return (
    <aside className="min-h-screen w-64 border-r bg-gray-950 text-white">
      <div className="border-b border-gray-800 p-6">
        <h1 className="text-xl font-bold">Men&apos;s Club</h1>
        <p className="text-sm text-gray-400">Handicap Dashboard</p>
      </div>

      <nav className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}