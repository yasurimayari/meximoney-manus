import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

describe("layout del onboarding (PFI)", () => {
  it("usa la tarjeta de flujo del PFI con estilos de marca definidos", () => {
    const orchestrator = readFileSync(resolve(projectRoot, "client/src/pages/onboarding/PfiOnboarding.tsx"), "utf8");
    const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

    expect(orchestrator).toContain('className="pfi-page"');
    expect(orchestrator).toContain('className="pfi-shell"');
    expect(styles).toContain(".pfi-shell { @apply w-full max-w-xl");
    expect(styles).toContain(".pfi-actions {");
  });
});
