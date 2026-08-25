export type ContactFormContact = {
  id: number;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  entityId: number | null;
  projectId: number | null;
  defaultCurrency: string | null;
  status: string;
  notes: string | null;
};

export type ContactFormValues = {
  name: string;
  type: string;
  email: string;
  phone: string;
  entityId: string;
  projectId: string;
  defaultCurrency: string;
  status: string;
  notes: string;
};

export function createBlankContactForm(): ContactFormValues {
  return {
    name: "",
    type: "other",
    email: "",
    phone: "",
    entityId: "none",
    projectId: "none",
    defaultCurrency: "MXN",
    status: "active",
    notes: "",
  };
}

export function createContactFormValues(contact: ContactFormContact | null): ContactFormValues {
  if (!contact) return createBlankContactForm();

  return {
    name: contact.name,
    type: contact.type,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    entityId: contact.entityId?.toString() ?? "none",
    projectId: contact.projectId?.toString() ?? "none",
    defaultCurrency: contact.defaultCurrency ?? "MXN",
    status: contact.status,
    notes: contact.notes ?? "",
  };
}
