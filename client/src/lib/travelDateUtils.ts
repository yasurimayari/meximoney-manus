export const toDateTimeLocalInput = (value?: Date | string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export const toDateOnlyInput = (value?: Date | string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";

export const toTimeInput = (value?: Date | string | null) => value ? new Date(value).toISOString().slice(11, 16) : "";

export const combineDateAndOptionalTime = (date: string, time?: string) => date && time ? `${date}T${time}` : date;

export const isDateOnlyInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
