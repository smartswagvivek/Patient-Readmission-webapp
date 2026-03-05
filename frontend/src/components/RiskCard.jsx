function getRiskMeta(riskLevel) {
  const normalized = (riskLevel || "").toLowerCase();
  if (normalized === "high") {
    return {
      label: "High",
      badge: "bg-red-100 text-red-700 border-red-200",
      circle: "text-red-500",
    };
  }
  if (normalized === "medium") {
    return {
      label: "Medium",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      circle: "text-amber-500",
    };
  }
  return {
    label: "Low",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    circle: "text-emerald-500",
  };
}

export function RiskCard({ riskScore = 0, riskLevel = "Low" }) {
  const clampedScore = Math.max(0, Math.min(1, Number(riskScore) || 0));
  const percentage = Math.round(clampedScore * 100);
  const meta = getRiskMeta(riskLevel);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (percentage / 100) * circumference;

  return (
    <section className="animate-reveal-soft interactive-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Risk Summary
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800">
            Readmission Risk
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            AI-generated 30-day post-discharge risk category.
          </p>
        </div>
        <span
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${meta.badge}`}
        >
          {meta.label} Risk
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-8">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 140 140" className="-rotate-90">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#E5EAF2"
              strokeWidth="12"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className={`${meta.circle} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-3xl font-extrabold text-slate-800">{percentage}%</span>
          </div>
        </div>

        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-semibold text-slate-500">Readmission Risk</dt>
            <dd className="text-xl font-bold text-slate-800">{percentage}%</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Risk Category</dt>
            <dd className="text-xl font-bold text-slate-800">{meta.label.toUpperCase()}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
