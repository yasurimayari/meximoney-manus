import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Records from "./pages/Records";
import Planning from "./pages/Planning";
import Quality from "./pages/Quality";
import Assistant from "./pages/Assistant";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Calendar from "./pages/Calendar";
import Statements from "./pages/Statements";
import Workspace from "./pages/Workspace";
import Review from "./pages/Review";
import Notifications from "./pages/Notifications";
import Contacts from "./pages/Contacts";
import Investments from "./pages/Investments";
import Patrimony from "./pages/Patrimony";
import CreditCards from "./pages/CreditCards";
import PasswordReset from "./pages/PasswordReset";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/restablecer-contrasena"} component={PasswordReset} />
      <Route path={"/"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/movimientos"}><DashboardLayout><Records /></DashboardLayout></Route>
      <Route path={"/planificacion"}><DashboardLayout><Planning /></DashboardLayout></Route>
      <Route path={"/calidad"}><DashboardLayout><Quality /></DashboardLayout></Route>
      <Route path={"/asistente"}><DashboardLayout><Assistant /></DashboardLayout></Route>
      <Route path={"/analitica"}><DashboardLayout><Analytics /></DashboardLayout></Route>
      <Route path={"/calendario"}><DashboardLayout><Calendar /></DashboardLayout></Route>
      <Route path={"/estados"}><DashboardLayout><Statements /></DashboardLayout></Route>
      <Route path={"/exportar"}><DashboardLayout><Reports /></DashboardLayout></Route>
      <Route path={"/espacio"}><DashboardLayout><Workspace /></DashboardLayout></Route>
      <Route path={"/revision"}><DashboardLayout><Review /></DashboardLayout></Route>
      <Route path={"/notificaciones"}><DashboardLayout><Notifications /></DashboardLayout></Route>
      <Route path={"/contactos"}><DashboardLayout><Contacts /></DashboardLayout></Route>
      <Route path={"/inversiones"}><DashboardLayout><Investments /></DashboardLayout></Route>
      <Route path={"/patrimonio"}><DashboardLayout><Patrimony /></DashboardLayout></Route>
      <Route path={"/tarjetas"}><DashboardLayout><CreditCards /></DashboardLayout></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
