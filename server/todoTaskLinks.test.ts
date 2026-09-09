import { describe, expect, it } from "vitest";
import { uniqueTaskLinks } from "./routers";

describe("uniqueTaskLinks", () => {
  it("elimina enlaces duplicados del mismo recurso sin alterar el primer vínculo", () => {
    expect(uniqueTaskLinks([
      { resourceType: "credit_card", resourceId: 12 },
      { resourceType: "credit_card", resourceId: 12 },
      { resourceType: "account", resourceId: 8 },
    ])).toEqual([
      { resourceType: "credit_card", resourceId: 12 },
      { resourceType: "account", resourceId: 8 },
    ]);
  });

  it("conserva recursos de tipos distintos aunque compartan el mismo identificador", () => {
    expect(uniqueTaskLinks([
      { resourceType: "account", resourceId: 3 },
      { resourceType: "credit_card", resourceId: 3 },
    ])).toHaveLength(2);
  });

  it("permite enlazar recursos de varios módulos en una misma tarea", () => {
    expect(uniqueTaskLinks([
      { resourceType: "contact", resourceId: 4 },
      { resourceType: "investment", resourceId: 9 },
      { resourceType: "travel", resourceId: 2 },
    ]).map(link => link.resourceType)).toEqual(["contact", "investment", "travel"]);
  });
});
