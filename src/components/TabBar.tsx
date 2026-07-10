import { NavLink } from "react-router-dom";
import {
  IconDumbbell,
  IconHistory,
  IconProgress,
  IconRoutines,
  IconSettings,
} from "./Icons";

const TABS = [
  { to: "/", label: "Registros", icon: IconHistory, exact: true },
  { to: "/treinos", label: "Treinos", icon: IconRoutines },
  { to: "/exercicios", label: "Exercícios", icon: IconDumbbell },
  { to: "/progresso", label: "Progresso", icon: IconProgress },
  { to: "/ajustes", label: "Ajustes", icon: IconSettings },
];

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(({ to, label, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) => `tab${isActive ? " active" : ""}`}
        >
          <Icon size={24} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
