import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/audit", label: " Handicap Audit" },
  { href: "/compare", label: "Compare" },
  { href: "/team-estimator", label: "Team Estimator" },
  { href: "/holes", label: "Hole Stats" },
  { href: "/holes/rankings?view=worst", label: "Worst by Hole" },
  { href: "/holes/rankings?view=best", label: "Best by Hole" },
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
