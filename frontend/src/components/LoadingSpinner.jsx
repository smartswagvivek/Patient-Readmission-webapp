import React from "react";

export function LoadingSpinner({ label }) {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
      <span>{label || "Loading..."}</span>
    </div>
  );
}

