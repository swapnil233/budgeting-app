import Link from "next/link";
import { CreditCard, BarChart3, PiggyBank, ArrowDownUp } from "lucide-react";

function LetoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="28" height="28" rx="7" fill="currentColor" fillOpacity="0.12" />
      <path d="M8 8h3v9.5H19V20H8V8z" fill="currentColor" />
    </svg>
  );
}

const features = [
  {
    icon: ArrowDownUp,
    title: "Transaction Tracking",
    description:
      "Log expenses manually, import via CSV, or connect your bank for automatic sync.",
  },
  {
    icon: PiggyBank,
    title: "Budget Management",
    description:
      "Set monthly budgets by category group — Fixed, Food, Lifestyle, and more.",
  },
  {
    icon: CreditCard,
    title: "Bank Connections",
    description:
      "Link your accounts securely through Plaid for real-time transaction imports.",
  },
  {
    icon: BarChart3,
    title: "Spending Reports",
    description:
      "Visualize monthly spending with line charts, category breakdowns, and trends.",
  },
];

const steps = [
  {
    n: "1",
    title: "Connect your accounts",
    description: "Link your bank accounts through Plaid's secure connection in seconds.",
  },
  {
    n: "2",
    title: "Track your spending",
    description: "Transactions import automatically and are categorized for you.",
  },
  {
    n: "3",
    title: "Set your budgets",
    description: "Define monthly budget limits per category and monitor your progress.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <LetoMark />
            <span className="text-lg font-semibold tracking-tight">Leto</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm text-neutral-400 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-neutral-400 transition-colors hover:text-white"
            >
              How it works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-neutral-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-600/10 px-3 py-1 text-xs font-medium text-indigo-400">
              Free to get started
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Take control of your finances.
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-neutral-400">
              Leto helps you track spending, manage budgets, and understand your money
              — all in one clean, focused dashboard.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="rounded-md bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Get started free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-white/10 px-6 py-2.5 font-medium text-neutral-400 transition-colors hover:border-white/20 hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-16 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">
                Features
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Everything you need to budget smarter
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col gap-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10">
                    <Icon className="size-5 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-16 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">
                How it works
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Up and running in minutes
              </h2>
            </div>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map(({ n, title, description }) => (
                <div key={n} className="flex flex-col items-center gap-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-600/10 text-lg font-bold text-indigo-400">
                    {n}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="max-w-xs text-sm leading-relaxed text-neutral-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to take control of your money?
            </h2>
            <p className="mb-8 text-neutral-400">
              Join Leto and start budgeting with clarity today.
            </p>
            <Link
              href="/sign-up"
              className="rounded-md bg-indigo-600 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <LetoMark />
            <span className="font-semibold">Leto</span>
          </div>
          <span>© {new Date().getFullYear()} Leto. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
