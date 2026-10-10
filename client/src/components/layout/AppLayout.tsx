import {
  BarChart3,
  Boxes,
  Contact,
  LayoutDashboard,
  Menu,
  ReceiptText,
  ShoppingCart,
  Tags,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';

const NAV_SECTIONS = [
  {
    id: 'selling',
    title: 'Selling',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/sales/new', label: 'New sale', icon: ShoppingCart },
      { to: '/sales', label: 'Sales history', icon: ReceiptText, end: true },
    ],
  },
  {
    id: 'stock',
    title: 'Stock',
    links: [
      { to: '/products', label: 'Products', icon: Boxes },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    id: 'people',
    title: 'People & insight',
    links: [
      { to: '/customers', label: 'Customers', icon: Contact },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          <p className="mb-2 px-3 text-xs font-semibold text-pasture-100/50">{section.title}</p>
          <ul className="flex flex-col gap-0.5">
            {section.links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'text-pasture-100/75 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-grain-400 transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                        aria-hidden
                      />
                      <Icon className={`size-[1.15rem] ${isActive ? 'text-grain-400' : ''}`} aria-hidden />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function StoreFooter() {
  return (
    <div className="rounded-xl bg-white/5 p-3.5 text-sm ring-1 ring-white/10">
      <p className="font-semibold text-white">San Fernando branch</p>
      <p className="mt-0.5 text-pasture-100/60">Open 8:00 AM – 6:00 PM</p>
    </div>
  );
}

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the page changes
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-8 bg-pasture-900 px-4 py-6 lg:flex">
        <Link to="/" className="px-2" aria-label="FeedWise home">
          <Logo inverted />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <StoreFooter />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-pasture-900 px-4 lg:hidden">
        <Link to="/" aria-label="FeedWise home">
          <Logo inverted />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-pasture-950/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-pasture-900 px-4 py-5 shadow-pop">
            <div className="flex items-center justify-between px-2">
              <Logo inverted />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </div>
            <StoreFooter />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
