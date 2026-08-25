import { describe, expect, it } from "vitest";
import { createContactFormValues } from "./contactForm";

const sebastian = {
  id: 11,
  name: "Sebastian Robinson",
  type: "client",
  email: null,
  phone: "5510154873",
  entityId: 7,
  projectId: null,
  defaultCurrency: "MXN",
  status: "active",
  notes: null,
};

const claudia = {
  id: 12,
  name: "Claudia Sanchez",
  type: "supplier",
  email: "claudia@example.invalid",
  phone: null,
  entityId: null,
  projectId: 9,
  defaultCurrency: "USD",
  status: "paused",
  notes: "Proveedor",
};

describe("createContactFormValues", () => {
  it("deriva un formulario independiente para el contacto seleccionado", () => {
    const claudiaForm = createContactFormValues(claudia);
    const sebastianForm = createContactFormValues(sebastian);

    expect(claudiaForm.name).toBe("Claudia Sanchez");
    expect(sebastianForm).toMatchObject({
      name: "Sebastian Robinson",
      type: "client",
      phone: "5510154873",
      entityId: "7",
      projectId: "none",
      email: "",
    });
    expect(sebastianForm.name).not.toBe(claudiaForm.name);
  });

  it("crea valores nuevos sin reutilizar los del último contacto editado", () => {
    const blank = createContactFormValues(null);

    expect(blank).toMatchObject({
      name: "",
      type: "other",
      entityId: "none",
      projectId: "none",
      status: "active",
    });
  });
});
