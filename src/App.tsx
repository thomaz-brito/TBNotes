import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider } from "./lib/data";
import TabBar from "./components/TabBar";
import RecordsPage from "./pages/RecordsPage";
import WorkoutsPage from "./pages/WorkoutsPage";
import WorkoutEditPage from "./pages/WorkoutEditPage";
import ExercisesPage from "./pages/ExercisesPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RecordsPage />} />
          <Route path="/treinos" element={<WorkoutsPage />} />
          <Route path="/treinos/:id" element={<WorkoutEditPage />} />
          <Route path="/exercicios" element={<ExercisesPage />} />
          <Route path="/progresso" element={<ProgressPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </BrowserRouter>
    </DataProvider>
  );
}
