import {
  Activity,
  ClipboardCheck,
  HeartPulse,
  Pill,
  Stethoscope,
} from "lucide-react";
import RadialOrbitalTimeline from "./ui/radial-orbital-timeline.jsx";

const timelineData = [
  {
    id: 1,
    title: "Discharge Intake",
    date: "Stage 01",
    content:
      "Clinician enters final discharge vitals, medication count, and inpatient utilization.",
    category: "intake",
    icon: ClipboardCheck,
    relatedIds: [2],
    status: "completed",
    energy: 96,
  },
  {
    id: 2,
    title: "Risk Stratification",
    date: "Stage 02",
    content:
      "AI model estimates 30-day readmission risk and assigns low, medium, or high category.",
    category: "risk",
    icon: Activity,
    relatedIds: [1, 3],
    status: "completed",
    energy: 88,
  },
  {
    id: 3,
    title: "Clinical Factors",
    date: "Stage 03",
    content:
      "Care team reviews likely drivers including hospitalization duration, medication burden, and prior admissions.",
    category: "factors",
    icon: Stethoscope,
    relatedIds: [2, 4],
    status: "in-progress",
    energy: 73,
  },
  {
    id: 4,
    title: "Medication Plan",
    date: "Stage 04",
    content:
      "Medication review recommendations are generated for reconciliation and post-discharge adherence.",
    category: "medication",
    icon: Pill,
    relatedIds: [3, 5],
    status: "pending",
    energy: 55,
  },
  {
    id: 5,
    title: "Follow-Up Protocol",
    date: "Stage 05",
    content:
      "Recommended follow-up schedule and preventive actions are prepared for outpatient care continuity.",
    category: "followup",
    icon: HeartPulse,
    relatedIds: [4],
    status: "pending",
    energy: 42,
  },
];

export function RadialOrbitalTimelineDemo() {
  return <RadialOrbitalTimeline timelineData={timelineData} />;
}
