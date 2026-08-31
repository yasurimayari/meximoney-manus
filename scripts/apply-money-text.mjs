import fs from "node:fs";
import path from "node:path";

const root = "/home/ubuntu/meximoney/client/src";
const files = [
  "pages/Analytics.tsx", "pages/Assistant.tsx", "pages/Calendar.tsx", "pages/Contacts.tsx",
  "pages/CreditCards.tsx", "pages/Fiscal.tsx", "pages/Home.tsx", "pages/Investments.tsx",
  "pages/Patrimony.tsx", "pages/Planning.tsx", "pages/Reports.tsx", "pages/Review.tsx",
  "pages/Simulations.tsx", "pages/Statements.tsx", "components/PlanningDebtAmortizationDialog.tsx",
  "components/FinancedAssetPaymentForm.tsx",
];
const simpleMoney = /\{formatMoney\(([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*),\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\)\}/g;
for (const relative of files) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, "utf8");
  const next = source.replace(simpleMoney, (_match, cents, currency) => `<MoneyText cents={${cents}} currency={${currency}} />`);
  if (next === source) continue;
  const importLine = 'import { MoneyText } from "@/components/MoneyText";\n';
  source = next.includes(importLine) ? next : importLine + next;
  fs.writeFileSync(file, source);
  console.log(relative);
}
