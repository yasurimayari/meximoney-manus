export function paginateRecords<T>(items: T[], requestedPage: number) {
  const firstPageSize = 15;
  const subsequentPageSize = 20;
  const totalPages = Math.max(1, items.length <= firstPageSize ? 1 : 1 + Math.ceil((items.length - firstPageSize) / subsequentPageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = page === 1 ? 0 : firstPageSize + (page - 2) * subsequentPageSize;
  const end = start + (page === 1 ? firstPageSize : subsequentPageSize);
  return { page, totalPages, start, end: Math.min(end, items.length), items: items.slice(start, end) };
}
