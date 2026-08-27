import { describe, expect, it } from "vitest";
import { paginateRecords } from "./recordPagination";

describe("paginación de registros", () => {
  const records = Array.from({ length: 56 }, (_, index) => index + 1);

  it("muestra 15 registros en la primera página", () => {
    expect(paginateRecords(records, 1)).toMatchObject({ page: 1, totalPages: 4, start: 0, end: 15, items: records.slice(0, 15) });
  });

  it("muestra los siguientes registros en bloques de 20", () => {
    expect(paginateRecords(records, 2)).toMatchObject({ page: 2, start: 15, end: 35, items: records.slice(15, 35) });
    expect(paginateRecords(records, 3)).toMatchObject({ page: 3, start: 35, end: 55, items: records.slice(35, 55) });
    expect(paginateRecords(records, 4)).toMatchObject({ page: 4, start: 55, end: 56, items: [56] });
  });
});
