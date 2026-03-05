import { Link, NavLink } from "react-router-dom";

function BrandMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-10 w-10 rounded-xl bg-white p-1.5 shadow-soft"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EA9FF" />
          <stop offset="100%" stopColor="#2F80ED" />
        </linearGradient>
      </defs>
      <path
        d="M24 6c7.5 0 13.5 2.4 13.5 5.4V24c0 8.1-5.8 15.1-13.5 17.8C16.3 39.1 10.5 32.1 10.5 24V11.4C10.5 8.4 16.5 6 24 6Z"
        fill="url(#mark-gradient)"
      />
      <path d="M24 14v16M16 22h16" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Navbar() {
  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? "bg-medical-primary text-white shadow-soft"
        : "text-slate-600 hover:bg-white hover:text-medical-primary"
    }`;

  return (
    <header className="animate-reveal-soft fixed inset-x-0 top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="interactive-lift flex items-center gap-3 rounded-2xl px-2 py-1">
          <BrandMark />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical-primary">
              Clinical AI Platform
            </p>
            <p className="text-base font-bold text-slate-800">
              Readmission Risk System
            </p>
          </div>
        </Link>

        <nav className="interactive-lift flex items-center gap-2 rounded-full bg-medical-surface p-1.5">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/predict" className={linkClass}>
            Patient Assessment
          </NavLink>
          <NavLink to="/results" className={linkClass}>
            Risk Dashboard
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
