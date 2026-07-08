import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DataProvider } from "./lib/data";
import TabBar from "./components/TabBar";
import TodayPage from "./pages/TodayPage";
import WorkoutsPage from "./pages/WorkoutsPage";
import WorkoutEditPage from "./pages/WorkoutEditPage";
import ExercisesPage from "./pages/ExercisesPage";
import HistoryPage from "./pages/HistoryPage";
import ProgressPage from "./pages/ProgressPage";

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/treinos" element={<WorkoutsPage />} />
          <Route path="/treinos/:id" element={<WorkoutEditPage />} />
          <Route path="/exercicios" element={<ExercisesPage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/progresso" element={<ProgressPage />} />
        </Routes>
        <TabBar />
      </BrowserRouter>
    </DataProvider>
  );
}
