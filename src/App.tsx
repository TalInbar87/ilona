import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientsPage } from "./pages/PatientsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { TreatmentDetailPage } from "./pages/TreatmentDetailPage";
import { SuperviseesPage } from "./pages/SuperviseesPage";
import { SuperviseeDetailPage } from "./pages/SuperviseeDetailPage";
import { CalendarPage } from "./pages/CalendarPage";

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:patientId" element={<PatientDetailPage />} />
          <Route path="patients/:patientId/treatments/:treatmentId" element={<TreatmentDetailPage />} />
          <Route path="supervisees" element={<SuperviseesPage />} />
          <Route path="supervisees/:superviseeId" element={<SuperviseeDetailPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
