import { describe, expect, it } from "vitest";
import { creditScoreRange } from "./creditScoreRange";

describe("rangos visuales del score crediticio", () => {
  it("conserva los límites publicados de cada color", () => {
    expect(creditScoreRange(356).key).toBe("red");
    expect(creditScoreRange(577).key).toBe("red");
    expect(creditScoreRange(587).key).toBe("orange");
    expect(creditScoreRange(659).key).toBe("orange");
    expect(creditScoreRange(660).key).toBe("yellow");
    expect(creditScoreRange(696).key).toBe("yellow");
    expect(creditScoreRange(697).key).toBe("green");
    expect(creditScoreRange(848).key).toBe("green");
  });

  it("no inventa una clasificación para huecos ni valores externos", () => {
    expect(creditScoreRange(580).key).toBe("unclassified");
    expect(creditScoreRange(900).key).toBe("unclassified");
    expect(creditScoreRange(null).key).toBe("unclassified");
  });
});
