export function RecommendationCard({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`animate-reveal-soft interactive-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-card ${className}`}
    >
      <header className="mb-4">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
