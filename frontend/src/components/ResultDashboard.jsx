import React from "react";
import { RiskGauge } from "./RiskGauge.jsx";

export function ResultDashboard({ result }) {
  if (!result) {
    return <p className="placeholder">Submit a patient discharge form to see predictions.</p>;
  }

  const { risk_score, risk_level, recommendations, similar_cases } = result;

  return (
    <div className="result-dashboard">
      <RiskGauge score={risk_score} level={risk_level} />

      {recommendations && (
        <div className="recommendations">
          <h3>AI-Generated Recommendations</h3>
          <div className="recommendation-section">
            <h4>Risk Explanation</h4>
            <p>{recommendations.risk_explanation}</p>
          </div>
          <div className="recommendation-section">
            <h4>Preventive Care Plan</h4>
            <p>{recommendations.preventive_care_plan}</p>
          </div>
          <div className="recommendation-section">
            <h4>Follow-up Recommendation</h4>
            <p>{recommendations.follow_up_recommendation}</p>
          </div>
          <div className="recommendation-section">
            <h4>Medication Review</h4>
            <p>{recommendations.medication_review}</p>
          </div>
        </div>
      )}

      {similar_cases && similar_cases.length > 0 && (
        <div className="similar-cases">
          <h3>Similar Patient Cases</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Distance</th>
                <th>Readmission</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {similar_cases.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.distance != null ? c.distance.toFixed(3) : "-"}</td>
                  <td>{c.metadata?.readmission_30}</td>
                  <td className="summary-cell">{c.document}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

