import React from "react";

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="error-alert">
      <strong>Error:</strong> {message}
    </div>
  );
}

