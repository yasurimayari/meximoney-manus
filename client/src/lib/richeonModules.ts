import {
  Airplane,
  Bank,
  Books,
  Calculator,
  ChartLineUp,
  Compass,
  CreditCard,
  Gauge,
  HandCoins,
  SquaresFour,
  Target,
  Users,
  Vault,
  Wallet,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type RicheonModuleRoute = { label: string; path: string };

export type RicheonModule = {
  id: string;
  brand: string;
  description: string;
  icon: Icon;
  badgeClass: string;
  status: "active" | "available" | "soon";
  routes: RicheonModuleRoute[];
};

// Mapeo visual sidebar real -> identidad de marca Richeon (no modifica rutas existentes).
export const richeonModules: RicheonModule[] = [
  {
    id: "coreview",
    brand: "CoreView",
    description: "Tu panorama financiero en tiempo real.",
    icon: SquaresFour,
    badgeClass: "module-coreview",
    status: "active",
    routes: [{ label: "Panel", path: "/" }],
  },
  {
    id: "controlhub",
    brand: "ControlHub",
    description: "Tareas, calendario y cierre mensual.",
    icon: Gauge,
    badgeClass: "module-controlhub",
    status: "active",
    routes: [
      { label: "ToDo", path: "/todo" },
      { label: "Calendario", path: "/calendario" },
      { label: "Control mensual", path: "/control-mensual" },
    ],
  },
  {
    id: "moneylink",
    brand: "MoneyLink",
    description: "Todas tus cuentas, tarjetas y transacciones en un solo lugar.",
    icon: Wallet,
    badgeClass: "module-moneylink",
    status: "active",
    routes: [
      { label: "Registros", path: "/movimientos" },
      { label: "Cuentas", path: "/cuentas" },
    ],
  },
  {
    id: "wealthmap",
    brand: "WealthMap",
    description: "Tu patrimonio, mapeado con claridad.",
    icon: Compass,
    badgeClass: "module-wealthmap",
    status: "active",
    routes: [{ label: "Patrimonio", path: "/patrimonio" }],
  },
  {
    id: "crediscore",
    brand: "CrediScore",
    description: "Mejora tu perfil financiero.",
    icon: ChartLineUp,
    badgeClass: "module-criscore",
    status: "active",
    routes: [{ label: "Score", path: "/score" }],
  },
  {
    id: "debtcenter",
    brand: "DebtCenter",
    description: "Controla y reduce tarjetas y deudas.",
    icon: CreditCard,
    badgeClass: "module-debtcenter",
    status: "active",
    routes: [{ label: "Tarjetas y deudas", path: "/tarjetas" }],
  },
  {
    id: "bookpro",
    brand: "BookPro",
    description: "Libro PFAE y fiscalidad, sin complicaciones.",
    icon: Books,
    badgeClass: "module-bookpro",
    status: "active",
    routes: [{ label: "Libro PFAE", path: "/fiscal" }],
  },
  {
    id: "netlink",
    brand: "NetLink",
    description: "Conecta con tu red de contactos.",
    icon: Users,
    badgeClass: "module-netlink",
    status: "active",
    routes: [{ label: "Contactos", path: "/contactos" }],
  },
  {
    id: "lifegoals",
    brand: "LifeGoals",
    description: "Tus metas, tu plan, tus hábitos.",
    icon: Target,
    badgeClass: "module-lifegoals",
    status: "active",
    routes: [
      { label: "Planificación", path: "/planificacion" },
      { label: "Hábitos", path: "/habitos" },
    ],
  },
  {
    id: "growvault",
    brand: "GrowVault",
    description: "Ahorro e inversiones para crecer.",
    icon: Vault,
    badgeClass: "module-growvault",
    status: "active",
    routes: [{ label: "Ahorro e inversiones", path: "/inversiones" }],
  },
  {
    id: "travelpro",
    brand: "TravelPro",
    description: "Planifica y financia tus viajes.",
    icon: Airplane,
    badgeClass: "module-travelpro",
    status: "active",
    routes: [{ label: "Viajes", path: "/viajes" }],
  },
  {
    id: "ventureflow",
    brand: "VentureFlow",
    description: "Tus proyectos y oportunidades.",
    icon: HandCoins,
    badgeClass: "module-ventureflow",
    status: "active",
    routes: [{ label: "Proyectos", path: "/proyectos" }],
  },
  {
    id: "cashflow",
    brand: "CashFlow",
    description: "Analítica, estados y simulaciones.",
    icon: Calculator,
    badgeClass: "module-cashflow",
    status: "active",
    routes: [
      { label: "Analítica", path: "/analitica" },
      { label: "Estados", path: "/estados" },
      { label: "Simulaciones", path: "/simulaciones" },
    ],
  },
];

export const richeonModuleById = new Map(richeonModules.map(module => [module.id, module]));

export function findModuleByPath(path: string) {
  return richeonModules.find(module => module.routes.some(route => route.path === path));
}

export const richeonAccountIcon = Bank;
