import fs from "node:fs";
import path from "node:path";
const root = "/home/ubuntu/meximoney/client/src";
const files = ["pages/Analytics.tsx", "pages/Fiscal.tsx", "pages/Home.tsx", "pages/Investments.tsx", "pages/Reports.tsx", "pages/Simulations.tsx"];
for (const relative of files) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/value: string/g, "value: ReactNode");
  if (!source.includes('import type { ReactNode } from "react";')) source = 'import type { ReactNode } from "react";\n' + source;
  fs.writeFileSync(file, source);
}
const investments = path.join(root, "pages/Investments.tsx");
let source = fs.readFileSync(investments, "utf8");
source = source.replace(' · $<MoneyText cents={item.amountCents} currency={item.currency} /> · $', ' · ${formatMoney(item.amountCents, item.currency)} · $');
fs.writeFileSync(investments, source);
