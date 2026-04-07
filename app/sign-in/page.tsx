"use client";

import { LoginForm } from "@/components/auth/login-form";

function LetoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M8 8h3v9.5H19V20H8V8z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-svh">
      {/* Branded panel */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between p-12 bg-[oklch(0.1_0_0)] text-white overflow-hidden select-none">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(1 0 0 / 0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Accent glow */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[oklch(0.55_0.18_280)] opacity-[0.12] blur-[80px] pointer-events-none" />
        <div className="absolute -top-20 right-0 w-[300px] h-[300px] rounded-full bg-[oklch(0.6_0.15_200)] opacity-[0.08] blur-[60px] pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <LetoMark />
          <span className="text-lg font-semibold tracking-tight">Leto</span>
        </div>

        {/* Tagline */}
        <div className="relative space-y-5">
          <h2 className="text-[2.5rem] font-bold tracking-tight leading-[1.15]">
            Your finances,<br />finally clear.
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-xs">
            Track your spending, understand patterns, and take control of your monthly budget.
          </p>
          <ul className="space-y-2.5 pt-2">
            {[
              "Smart transaction categorization",
              "Daily & monthly spending insights",
              "Clean, distraction-free interface",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/60">
                <span className="flex-shrink-0 size-4 rounded-full bg-white/10 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.2 5.7L6.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative text-white/25 text-xs">
          © {new Date().getFullYear()} Leto
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center gap-2 text-foreground">
          <LetoMark />
          <span className="text-lg font-semibold tracking-tight">Leto</span>
        </div>

        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
