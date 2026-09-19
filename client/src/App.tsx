import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import PasswordReset from "@/pages/PasswordReset";
import Offline from "@/pages/Offline";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

const Records = lazy(() => import("@/pages/Records"));
const Planning = lazy(() => import("@/pages/Planning"));
const Quality = lazy(() => import("@/pages/Quality"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Reports = lazy(() => import("@/pages/Reports"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Statements = lazy(() => import("@/pages/Statements"));
const Workspace = lazy(() => import("@/pages/Workspace"));
const Review = lazy(() => import("@/pages/Review"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const Investments = lazy(() => import("@/pages/Investments"));
const Patrimony = lazy(() => import("@/pages/Patrimony"));
const CreditCards = lazy(() => import("@/pages/CreditCards"));
const Fiscal = lazy(() => import("@/pages/Fiscal"));
const ChangePassword = lazy(() => import("@/pages/ChangePassword"));
const MonthlyControl = lazy(() => import("@/pages/MonthlyControl"));
const Simulations = lazy(() => import("@/pages/Simulations"));
const Accounts = lazy(() => import("@/pages/Accounts"));
const OfflineData = lazy(() => import("@/pages/OfflineData"));
const Projects = lazy(() => import("@/pages/Projects"));
const Score = lazy(() => import("@/pages/Score"));
const Travels = lazy(() => import("@/pages/Travels"));
const ToDo = lazy(() => import("@/pages/ToDo"));
const Habits = lazy(() => import("@/pages/Habits"));
const Home = lazy(() => import("@/pages/Home"));
const Assistant = lazy(() => import("@/pages/Assistant"));

function RouteLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando módulo…</div>}>{children}</Suspense>;
}

function PrivatePage({ children }: { children: React.ReactNode }) {
  return <DashboardLayout><RouteLoader>{children}</RouteLoader></DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/restablecer-contrasena" component={PasswordReset} />
      <Route path="/offline" component={Offline} />
      <Route path="/seguridad/cambiar-contrasena"><PrivatePage><ChangePassword /></PrivatePage></Route>
      <Route path="/datos-offline"><PrivatePage><OfflineData /></PrivatePage></Route>
      <Route path="/"><PrivatePage><Home /></PrivatePage></Route>
      <Route path="/todo"><PrivatePage><ToDo /></PrivatePage></Route>
      <Route path="/habitos"><PrivatePage><Habits /></PrivatePage></Route>
      <Route path="/movimientos"><PrivatePage><Records /></PrivatePage></Route>
      <Route path="/cuentas"><PrivatePage><Accounts /></PrivatePage></Route>
      <Route path="/planificacion"><PrivatePage><Planning /></PrivatePage></Route>
      <Route path="/proyectos"><PrivatePage><Projects /></PrivatePage></Route>
      <Route path="/viajes"><PrivatePage><Travels /></PrivatePage></Route>
      <Route path="/score"><PrivatePage><Score /></PrivatePage></Route>
      <Route path="/calidad"><PrivatePage><Quality /></PrivatePage></Route>
      <Route path="/asistente"><PrivatePage><Assistant /></PrivatePage></Route>
      <Route path="/analitica"><PrivatePage><Analytics /></PrivatePage></Route>
      <Route path="/calendario"><PrivatePage><Calendar /></PrivatePage></Route>
      <Route path="/estados"><PrivatePage><Statements /></PrivatePage></Route>
      <Route path="/control-mensual"><PrivatePage><MonthlyControl /></PrivatePage></Route>
      <Route path="/simulaciones"><PrivatePage><Simulations /></PrivatePage></Route>
      <Route path="/exportar"><PrivatePage><Reports /></PrivatePage></Route>
      <Route path="/espacio"><PrivatePage><Workspace /></PrivatePage></Route>
      <Route path="/revision"><PrivatePage><Review /></PrivatePage></Route>
      <Route path="/notificaciones"><PrivatePage><Notifications /></PrivatePage></Route>
      <Route path="/contactos"><PrivatePage><Contacts /></PrivatePage></Route>
      <Route path="/inversiones"><PrivatePage><Investments /></PrivatePage></Route>
      <Route path="/patrimonio"><PrivatePage><Patrimony /></PrivatePage></Route>
      <Route path="/tarjetas"><PrivatePage><CreditCards /></PrivatePage></Route>
      <Route path="/fiscal"><PrivatePage><Fiscal /></PrivatePage></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
