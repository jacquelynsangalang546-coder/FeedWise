import { AlertTriangle, BarChart3, PackageCheck, ReceiptText, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/layout/Logo';
import { ButtonLink } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Sample receipt lines used only for the hero illustration
const SAMPLE_LINES = [
  { id: 'chb', name: 'Chick Booster Crumble 50kg', qty: 2, price: 1750 },
  { id: 'vtb', name: 'Vitamin B-Complex 100g', qty: 3, price: 120 },
  { id: 'pch', name: 'Tuna Wet Pouch 85g', qty: 6, price: 32 },
];

const FEATURES = [
  {
    id: 'checkout',
    icon: ShoppingCart,
    title: 'Checkout that does the math',
    text: 'Subtotal, discount, VAT and change are computed from current shelf prices. Discounts above store policy and quantities you do not have are refused before the sale is saved.',
  },
  {
    id: 'stock',
    icon: PackageCheck,
    title: 'Stock that updates itself',
    text: 'Completing a sale deducts every item at once. If any part fails, the whole sale is rolled back, so the shelf count and the receipt always agree.',
  },
  {
    id: 'reorder',
    icon: AlertTriangle,
    title: 'Reorder before you run out',
    text: 'Each product has its own reorder level. FeedWise lists what is low, how many units to order, and which supplier to call.',
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Know what actually sells',
    text: 'Daily revenue, profit, payment mix, category share and a ranking of top-selling products for any date range.',
  },
];

const peso = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function ReceiptIllustration() {
  // Derived values for the illustration, computed during render
  const subtotal = SAMPLE_LINES.reduce((sum, line) => sum + line.qty * line.price, 0);
  const discount = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal - discount;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -top-4 -right-3 z-10 flex items-center gap-2 rounded-xl bg-grain-400 px-3.5 py-2 text-sm font-semibold text-pasture-950 shadow-pop sm:-right-8">
        <AlertTriangle className="size-4" aria-hidden />
        Grower Pellets: 6 sacks left
      </div>
      <div className="rotate-[-1.5deg] rounded-2xl bg-white p-6 shadow-pop ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-dashed border-ink-300 pb-4">
          <div>
            <p className="font-display text-lg font-bold text-pasture-900">Sale FW-1009-A3F</p>
            <p className="text-sm text-ink-500">Tolentino Poultry Farm</p>
          </div>
          <ReceiptText className="size-6 text-leaf-600" aria-hidden />
        </div>
        <ul className="divide-y divide-line py-2 text-sm">
          {SAMPLE_LINES.map((line) => (
            <li key={line.id} className="flex justify-between gap-4 py-2.5">
              <span className="text-ink-700">
                <span className="font-semibold text-ink-900 tabular">{line.qty} ×</span> {line.name}
              </span>
              <span className="font-medium tabular">{peso(line.qty * line.price)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-dashed border-ink-300 pt-4 text-sm">
          <div className="flex justify-between text-ink-500">
            <dt>Subtotal</dt>
            <dd className="tabular">{peso(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-leaf-700">
            <dt>Wholesale discount (5%)</dt>
            <dd className="tabular">−{peso(discount)}</dd>
          </div>
          <div className="flex justify-between pt-2 font-display text-xl font-bold text-pasture-900">
            <dt>Total</dt>
            <dd className="tabular">{peso(total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useDocumentTitle('Pet & Poultry Supply Sales and Inventory');

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="FeedWise home">
          <Logo />
        </Link>
        <ButtonLink to="/dashboard" variant="secondary" size="sm">
          Open dashboard
        </ButtonLink>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-16 lg:pb-28">
        <div>
          <h1 className="max-w-xl text-[2.6rem] leading-[1.02] font-extrabold text-pasture-900 sm:text-6xl">
            Every sack, can and pouch, counted.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-700">
            FeedWise is the sales and inventory system for pet and poultry supply stores. It rings up sales, deducts
            stock the moment a sale completes, and tells you which feeds to reorder before the shelf runs empty.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/sales/new" size="lg" icon={<ShoppingCart className="size-5" />}>
              Start a sale
            </ButtonLink>
            <ButtonLink to="/dashboard" size="lg" variant="secondary">
              View today’s numbers
            </ButtonLink>
          </div>
        </div>
        <ReceiptIllustration />
      </section>

      <section className="bg-pasture-900 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">Built around how a feed store actually runs</h2>
          <p className="mt-3 max-w-2xl text-pasture-100/75">
            Poultry feed by the sack or kilo, dog and cat food, vitamins and accessories: one counter, one source of
            truth.
          </p>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {FEATURES.map(({ id, icon: Icon, title, text }) => (
              <div key={id} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-grain-400 text-pasture-950">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-pasture-100/75">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-grain-100 p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold text-pasture-900 sm:text-3xl">Check what needs reordering today</h2>
            <p className="mt-2 max-w-xl text-ink-700">
              The reports page lists every product at or below its reorder level, with a suggested order quantity.
            </p>
          </div>
          <ButtonLink to="/reports" variant="dark" size="lg">
            Open reports
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-500 sm:flex-row sm:justify-between sm:px-6">
          <p>FeedWise, an Advanced Web Programming final project at NU Clark</p>
          <p>Built with React, Express and MongoDB</p>
        </div>
      </footer>
    </div>
  );
}
