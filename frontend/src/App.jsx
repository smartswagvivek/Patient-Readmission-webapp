import { Route, Routes, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar.jsx";
import { Landing } from "./pages/Landing.jsx";
import { Predict } from "./pages/Predict.jsx";
import { Results } from "./pages/Results.jsx";

export default function App() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-medical-ice text-slate-700">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(47,128,237,0.18),transparent_44%),radial-gradient(circle_at_88%_6%,rgba(29,211,176,0.15),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(111,168,255,0.16),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)]" />
      <Navbar />
      <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div key={location.pathname} className="animate-page-enter">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/*" element={<Results />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

