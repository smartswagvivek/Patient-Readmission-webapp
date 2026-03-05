import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { predictReadmission } from "../api/client.js";
import { PatientForm } from "../components/PatientForm.jsx";

export function Predict() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(payload) {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const result = await predictReadmission(payload);
      navigate("/results", {
        state: {
          result,
          input: payload,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Unable to complete prediction at this time.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="stagger-reveal grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <section className="interactive-lift rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        <header className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-medical-primary">
            Patient Entry Form
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Essential Discharge Inputs
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Enter only clinically essential fields to generate AI-supported
            readmission risk assessment.
          </p>
        </header>

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <PatientForm onSubmit={handleSubmit} isLoading={isLoading} />
      </section>

      <aside className="stagger-reveal space-y-5">
        <article className="interactive-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-slate-800">Assessment Workflow</h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-medical-surface font-bold text-medical-primary">
                1
              </span>
              Clinical entry data captured
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-medical-surface font-bold text-medical-primary">
                2
              </span>
              AI risk score generated
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-medical-surface font-bold text-medical-primary">
                3
              </span>
              Preventive care plan and follow-up generated
            </li>
          </ol>
        </article>

        <article className="interactive-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-slate-800">Clinical Guidance</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="rounded-xl bg-medical-ice px-3 py-2">
              Keep numeric values aligned with latest discharge summary.
            </li>
            <li className="rounded-xl bg-medical-ice px-3 py-2">
              Use this output for decision support, not as the only source of care
              planning.
            </li>
            <li className="rounded-xl bg-medical-ice px-3 py-2">
              Review recommendations with multidisciplinary teams before discharge.
            </li>
          </ul>
        </article>
      </aside>
    </div>
  );
}
