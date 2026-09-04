export type RecordFilterCriteria = {
  startDate?: string;
  endDate?: string;
  type?: string;
};

export type FilterableRecord = {
  occurredAt: Date | string | number;
  type: string;
};

export function filterRecords<T extends FilterableRecord>(records: T[], criteria: RecordFilterCriteria) {
  return records.filter(record => {
    const date = new Date(record.occurredAt);
    if (Number.isNaN(date.getTime())) return false;
    const occurredOn = date.toISOString().slice(0, 10);
    return (!criteria.startDate || occurredOn >= criteria.startDate)
      && (!criteria.endDate || occurredOn <= criteria.endDate)
      && (!criteria.type || record.type === criteria.type);
  });
}
