import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

describe("layout del onboarding", () => {
  it("usa una tarjeta de flujo independiente y protege sus controles del desbordamiento", () => {
    const page = readFileSync(resolve(projectRoot, "client/src/pages/Onboarding.tsx"), "utf8");
    const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

    expect(page).toContain('className="onboarding-flow-card"');
    expect(page).not.toContain('<section className="onboarding-card">');
    expect(styles).toContain(".onboarding-flow-card { @apply mx-auto mt-6 block w-full");
    expect(styles).toContain(".onboarding-flow-card .form-field input");
  });
});
