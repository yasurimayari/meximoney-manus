import { describe, expect, it } from "vitest";
import { amortizationDialogClass } from "./amortizationDialogLayout";

describe("disposición de diálogo de amortización", () => {
  it("ocupa el viewport disponible con desplazamiento interno en modo normal", () => {
    expect(amortizationDialogClass(false)).toContain("w-[calc(100vw-1rem)]");
    expect(amortizationDialogClass(false)).toContain("overflow-y-auto");
    expect(amortizationDialogClass(false)).toContain("sm:w-[min(72rem,calc(100vw-2rem))]");
  });

  it("el modo ampliado usa el viewport completo sin depender de un ancho fijo", () => {
    const layout = amortizationDialogClass(true);
    expect(layout).toContain("!w-[calc(100vw-1rem)]");
    expect(layout).toContain("!h-[calc(100dvh-1rem)]");
    expect(layout).toContain("!max-w-none");
  });
});
