import { describe, expect, it } from "vitest";
import { selectedRecordsOnPage, togglePageSelection, toggleRecordSelection } from "./recordBulkSelection";

describe("record bulk selection", () => {
  it("toggles one movement without mutating the original set", () => {
    const current = new Set([1]);
    const next = toggleRecordSelection(current, 2, true);
    expect([...current]).toEqual([1]);
    expect([...next]).toEqual([1, 2]);
    expect([...toggleRecordSelection(next, 1, false)]).toEqual([2]);
  });

  it("selects and clears all movements visible on the current page", () => {
    const selected = togglePageSelection(new Set([9]), [1, 2, 3], true);
    expect([...selected]).toEqual([9, 1, 2, 3]);
    expect(selectedRecordsOnPage([1, 2, 3], selected)).toBe(true);
    expect([...togglePageSelection(selected, [1, 2, 3], false)]).toEqual([9]);
  });

  it("does not mark an empty page as fully selected", () => {
    expect(selectedRecordsOnPage([], new Set())).toBe(false);
  });
});
