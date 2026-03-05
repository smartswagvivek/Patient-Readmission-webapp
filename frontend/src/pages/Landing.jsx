import { Link } from "react-router-dom";
import { RadialOrbitalTimelineDemo } from "../components/RadialOrbitalTimelineDemo.jsx";

const featureCards = [
  {
    title: "AI Risk Prediction",
    description:
      "Rapid 30-day readmission assessment from structured discharge indicators.",
  },
  {
    title: "Clinical Recommendations",
    description:
      "Action-focused care guidance tailored for discharge planning and follow-up.",
  },
  {
    title: "Similar Patient Intelligence",
    description:
      "Compare with historical patient patterns to support safer care decisions.",
  },
];

const workflow = [
  "Enter discharge data",
  "AI predicts risk",
  "Preventive care generated",
];

const benefits = [
  "Reduce readmissions",
  "Improve patient outcomes",
  "Assist clinicians",
  "Evidence-based care",
];

export function Landing() {
  return (
    <div className="stagger-reveal space-y-12">
      <section className="interactive-lift grid gap-8 rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(235,247,255,0.92))] p-8 shadow-soft lg:grid-cols-2 lg:items-center lg:p-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">
            Hospital Decision Support
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            AI Patient Readmission Risk Prediction
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Clinical decision support system predicting 30-day hospital
            readmission risk.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/predict"
              className="interactive-lift rounded-2xl bg-medical-primary px-6 py-3 text-base font-bold text-white shadow-soft transition hover:bg-medical-primary-dark"
            >
              Start Prediction
            </Link>
            <a
              href="#learn-more"
              className="interactive-lift rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:border-medical-primary hover:text-medical-primary"
            >
              Learn More
            </a>
          </div>
        </div>
        <div className="relative w-full">
          <div className="absolute -left-4 -top-4 hidden h-24 w-24 rounded-full bg-medical-primary/15 blur-2xl lg:block" />
          <div className="absolute -bottom-6 -right-6 hidden h-28 w-28 rounded-full bg-cyan-200/40 blur-2xl lg:block" />
          <div className="orbital-float">
            <RadialOrbitalTimelineDemo />
          </div>
        </div>
      </section>

      <section id="learn-more" className="grid gap-5 md:grid-cols-3">
        {featureCards.map((card) => (
          <article
            key={card.title}
            className="animate-reveal-soft float-soft interactive-lift rounded-3xl border border-sky-100 bg-[linear-gradient(180deg,#ffffff,#f2f9ff)] p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-card"
          >
            <h2 className="text-xl font-bold text-slate-800">{card.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {card.description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="interactive-lift rounded-3xl border border-sky-100 bg-[linear-gradient(180deg,#ffffff,#f4fbff)] p-6 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-800">Clinical Workflow</h2>
          <ol className="mt-5 space-y-4">
            {workflow.map((step, index) => (
              <li key={step} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-medical-surface text-sm font-bold text-medical-primary">
                  {index + 1}
                </div>
                <p className="pt-1 text-base font-medium text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="interactive-lift rounded-3xl border border-sky-100 bg-[linear-gradient(180deg,#ffffff,#f4fbff)] p-6 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-800">Clinical Benefits</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {benefits.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-medical-ice px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="interactive-lift rounded-3xl border border-cyan-200 bg-[linear-gradient(135deg,#e9f6ff,#dff8ff)] p-8 text-center shadow-soft">
        <h2 className="text-3xl font-bold text-slate-800">
          Ready for Patient Discharge Risk Assessment
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
          Start the assessment workflow and generate risk-informed discharge
          planning in seconds.
        </p>
        <Link
          to="/predict"
          className="interactive-lift mt-7 inline-flex rounded-2xl bg-medical-primary px-7 py-3 text-base font-bold text-white shadow-soft transition hover:bg-medical-primary-dark"
        >
          Start Patient Assessment
        </Link>
      </section>
    </div>
  );
}
