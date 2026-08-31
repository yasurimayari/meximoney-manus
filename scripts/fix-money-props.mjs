import fs from "node:fs";
import path from "node:path";
const root = "/home/ubuntu/meximoney/client/src";
const files = ["pages/Analytics.tsx", "pages/Fiscal.tsx", "pages/Home.tsx", "pages/Investments.tsx", "pages/Reports.tsx", "pages/Simulations.tsx"];
const pattern = /value=<MoneyText cents=\{([^}]+)\} currency=\{([^}]+)\} \/>/g;
for (const relative of files) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, "utf8");
  const next = source.replace(pattern, "value={<MoneyText cents={$1} currency={$2} />}");
  if (source !== next) fs.writeFileSync(file, next);
}
