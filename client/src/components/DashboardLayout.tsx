import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { notificationBadgeLabel, unreadNotificationCount } from "@/lib/notificationBadge";
import { ArrowLeftRight, BarChart3, BellRing, BotMessageSquare, CalendarDays, CircleCheckBig, CloudDownload, ContactRound, CreditCard, EyeOff, FileDown, KeyRound, Landmark, LayoutDashboard, LockKeyhole, LogOut, PanelLeft, PiggyBank, ShieldCheck, Target, BookOpenCheck, Settings2, ClipboardCheck, ReceiptText, Calculator } from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import Onboarding from "@/pages/Onboarding";
import { Button } from "./ui/button";

const primaryMenuItems = [
  { icon: LayoutDashboard, label: "Panel", path: "/" },
  { icon: ArrowLeftRight, label: "Registros", path: "/movimientos" },
  { icon: Landmark, label: "Cuentas", path: "/cuentas" },
  { icon: CreditCard, label: "Tarjetas", path: "/tarjetas" },
  { icon: Target, label: "Planificación", path: "/planificacion" },
  { icon: ContactRound, label: "Contactos", path: "/contactos" },
  { icon: PiggyBank, label: "Ahorro e inversiones", path: "/inversiones" },
  { icon: Landmark, label: "Patrimonio", path: "/patrimonio" },
  { icon: BarChart3, label: "Analítica", path: "/analitica" },
  { icon: Calculator, label: "Simulaciones", path: "/simulaciones" },
  { icon: CalendarDays, label: "Calendario", path: "/calendario" },
  { icon: ReceiptText, label: "Libro PFAE", path: "/fiscal" },
  { icon: BookOpenCheck, label: "Estados", path: "/estados" },
  { icon: CircleCheckBig, label: "Control mensual", path: "/control-mensual" },
  { icon: BotMessageSquare, label: "Asistente", path: "/asistente" },
];

const accountMenuItems = [
  { icon: FileDown, label: "Exportar", path: "/exportar" },
  { icon: ClipboardCheck, label: "Revisión", path: "/revision" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const PUBLISHED_HOST = "mexifinance-stkndi6z.manus.space";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { data: workspace, isLoading: workspaceLoading } = trpc.finance.workspace.get.useQuery(undefined, { enabled: Boolean(user) });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (import.meta.env.DEV || window.location.hostname.endsWith(".manus.computer")) return <PreviewRedirect />;

  if (!user) {
    return (
      <div className="auth-gate">
        <div className="auth-orbit auth-orbit-one" />
        <div className="auth-orbit auth-orbit-two" />
        <div className="auth-shell">
          <section className="auth-intro">
            <div className="auth-wordmark"><span className="auth-logo">M</span><span>Meximoney</span></div>
            <p className="eyebrow">Finanzas manuales · espacio privado</p>
            <h1>Tu dinero, tu ritmo,<br /><em>tu claridad.</em></h1>
            <p>Organiza y analiza tus finanzas personales y empresariales sin conectar bancos, compartir credenciales ni ejecutar pagos.</p>
            <div className="auth-trust-list">
              <span><LockKeyhole className="size-4" /> Acceso autenticado</span>
              <span><EyeOff className="size-4" /> Solo datos manuales</span>
              <span><ShieldCheck className="size-4" /> Decisiones explicables</span>
            </div>
          </section>
          <LocalAuthCard />
        </div>
      </div>
    );
  }

  if (workspaceLoading) return <DashboardLayoutSkeleton />;
  if (!workspace?.profile?.onboardingCompleted) return <Onboarding />;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function PreviewRedirect() {
  useEffect(() => {
    const redirect = window.setTimeout(() => window.location.replace(`https://${PUBLISHED_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`), 900);
    return () => window.clearTimeout(redirect);
  }, []);
  return <div className="auth-gate"><div className="auth-shell"><section className="auth-intro"><div className="auth-wordmark"><span className="auth-logo">M</span><span>Meximoney</span></div><p className="eyebrow">Vista temporal de desarrollo</p><h1>Abriendo el acceso <em>publicado.</em></h1><p>Esta dirección técnica utiliza una sesión independiente y no debe utilizarse para acceder a tus datos. Te dirigiremos al dominio publicado de Meximoney.</p><a href={`https://${PUBLISHED_HOST}`} className="mt-6 inline-flex rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Abrir Meximoney publicado ahora</a></section></div></div>;
}

function LocalAuthCard() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const onSuccess = async (message: string, sessionToken: string) => {
    sessionStorage.setItem("meximoney-local-session", sessionToken);
    await utils.auth.me.invalidate();
    toast.success(message);
    window.location.assign("/");
  };
  const login = trpc.auth.login.useMutation({ onSuccess: response => onSuccess("Sesión iniciada", response.sessionToken), onError: error => toast.error(error.message) });
  const register = trpc.auth.register.useMutation({ onSuccess: response => onSuccess("Cuenta creada", response.sessionToken), onError: error => toast.error(error.message) });
  const isPending = login.isPending || register.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "register") register.mutate({ name, email, password });
    else login.mutate({ email, password });
  };

  return <section className="auth-card">
      <div className="auth-card-icon"><ShieldCheck className="size-5" /></div>
    <p className="auth-card-kicker">Acceso protegido</p>
    <h2>{mode === "login" ? "Entra a tu espacio privado" : "Crea tu espacio privado"}</h2>
    <p>{mode === "login" ? "Usa tu correo y contraseña para abrir tus registros, planes y revisiones." : "Regístrate con correo y contraseña. Tus datos financieros comienzan vacíos y bajo tu control."}</p>
    <Tabs value={mode} onValueChange={value => setMode(value as "login" | "register")} className="mt-5">
      <TabsList className="auth-tabs"><TabsTrigger value="login">Iniciar sesión</TabsTrigger><TabsTrigger value="register">Registrarme</TabsTrigger></TabsList>
    </Tabs>
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" ? <div className="form-field"><Label htmlFor="auth-name">Nombre</Label><Input id="auth-name" autoComplete="name" required value={name} onChange={event => setName(event.target.value)} /></div> : null}
      <div className="form-field"><Label htmlFor="auth-email">Correo electrónico</Label><Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="form-field"><Label htmlFor="auth-password">Contraseña</Label><Input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} required value={password} onChange={event => setPassword(event.target.value)} />{mode === "register" ? <small>Usa al menos 12 caracteres.</small> : null}</div>
      <Button type="submit" size="lg" className="w-full btn-primary" disabled={isPending}>{isPending ? "Procesando…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</Button>
    </form>
    {mode === "login" ? <a href="/restablecer-contrasena" className="mt-3 block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</a> : null}
    <p className="mt-4 text-center text-sm text-muted-foreground">{mode === "login" ? <>¿Es tu primera vez? <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setMode("register")}>Crear cuenta</button></> : <>¿Ya tienes cuenta? <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setMode("login")}>Iniciar sesión</button></>}</p>
    <div className="auth-card-footer"><span>0 conexiones bancarias</span><i /> <span>0 pagos ejecutados</span></div>
  </section>;
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = [...primaryMenuItems, ...accountMenuItems].find(item => item.path === location) ?? [{ path: "/calidad", label: "Perfil y privacidad" }, { path: "/seguridad/cambiar-contrasena", label: "Cambiar contraseña" }, { path: "/notificaciones", label: "Notificaciones" }, { path: "/datos-offline", label: "Datos offline" }, { path: "/espacio", label: "Espacio" }].find(item => item.path === location);
  const isMobile = useIsMobile();
  const { data: notificationData } = trpc.finance.notifications.get.useQuery(undefined, { enabled: Boolean(user) });
  const unreadNotifications = notificationData ? unreadNotificationCount(notificationData.notifications) : 0;

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="brand-mark">M</span><span className="font-semibold tracking-tight truncate brand-word">Meximoney</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {primaryMenuItems.map(item => {
                const isActive = location === item.path;
                const isNotificationsItem = item.path === "/notificaciones";
                const notificationLabel = unreadNotifications ? `${unreadNotifications} notificaciones sin leer` : "Sin notificaciones sin leer";
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={isNotificationsItem && unreadNotifications ? `${item.label}: ${notificationLabel}` : item.label}
                      aria-label={isNotificationsItem ? `${item.label}. ${notificationLabel}` : item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                      {isNotificationsItem && unreadNotifications ? <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-primary-foreground group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-0.5 group-data-[collapsible=icon]:top-0.5" aria-hidden="true">{notificationBadgeLabel(unreadNotifications)}</span> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation("/calidad")} className="cursor-pointer">
                  <CircleCheckBig className="mr-2 h-4 w-4" />
                  <span>Calidad, perfil y privacidad</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/seguridad/cambiar-contrasena")} className="cursor-pointer">
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Cambiar contraseña</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/notificaciones")} className="cursor-pointer">
                  <BellRing className="mr-2 h-4 w-4" />
                  <span>Notificaciones</span>
                  {unreadNotifications ? <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[0.62rem] font-bold text-primary-foreground">{notificationBadgeLabel(unreadNotifications)}</span> : null}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/datos-offline")} className="cursor-pointer">
                  <CloudDownload className="mr-2 h-4 w-4" />
                  <span>Datos offline</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/espacio")} className="cursor-pointer">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span>Espacio</span>
                </DropdownMenuItem>
                {accountMenuItems.map(item => (
                  <DropdownMenuItem key={item.path} onClick={() => setLocation(item.path)} className="cursor-pointer">
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Meximoney"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1 p-4 lg:p-7"><div className="mx-auto min-w-0 max-w-7xl">{children}</div></main>
      </SidebarInset>
    </>
  );
}
