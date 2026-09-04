export function toggleRecordSelection(current: Set<number>, id: number, selected: boolean) {
  const next = new Set(current);
  if (selected) next.add(id);
  else next.delete(id);
  return next;
}

export function togglePageSelection(current: Set<number>, ids: number[], selected: boolean) {
  const next = new Set(current);
  for (const id of ids) {
    if (selected) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function selectedRecordsOnPage(ids: number[], selected: Set<number>) {
  return ids.length > 0 && ids.every(id => selected.has(id));
}
