import React from "react";

export function RiskGauge({ score, level }) {
  if (score == null) return null;

  const percentage = Math.round(score * 100);

  let color = "#16a34a";
  if (level === "Medium") color = "#f97316";
  if (level === "High") color = "#dc2626";

  return (
    <div className="risk-gauge">
      <div className="risk-gauge-header">
        <span>Readmission Risk</span>
        <span className={`risk-badge risk-badge-${level?.toLowerCase()}`}>
          {level || "Unknown"}
        </span>
      </div>
      <div className="risk-gauge-bar">
        <div
          className="risk-gauge-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="risk-gauge-footer">
        <span>{percentage}% probability within 30 days</span>
      </div>
    </div>
  );
}

