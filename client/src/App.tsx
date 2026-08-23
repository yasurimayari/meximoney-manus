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
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/movimientos"}><DashboardLayout><Records /></DashboardLayout></Route>
      <Route path={"/planificacion"}><DashboardLayout><Planning /></DashboardLayout></Route>
      <Route path={"/calidad"}><DashboardLayout><Quality /></DashboardLayout></Route>
      <Route path={"/asistente"}><DashboardLayout><Assistant /></DashboardLayout></Route>
      <Route path={"/analitica"}><DashboardLayout><Analytics /></DashboardLayout></Route>
      <Route path={"/exportar"}><DashboardLayout><Reports /></DashboardLayout></Route>
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
