export function atLocalMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonday(date: Date) {
  const localDate = atLocalMidnight(date);
  const offset = (localDate.getDay() + 6) % 7;
  localDate.setDate(localDate.getDate() - offset);
  return localDate;
}

export function calendarDateKey(date: Date | string) {
  const value = atLocalMidnight(new Date(date));
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export function buildProjectWeek(referenceDate: Date) {
  const start = startOfMonday(referenceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function buildProjectMonth(referenceDate: Date) {
  const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const firstDay = startOfMonday(firstOfMonth);
  const lastOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const lastDayOffset = (7 - ((lastOfMonth.getDay() + 6) % 7) - 1) % 7;
  const lastGridDay = new Date(lastOfMonth);
  lastGridDay.setDate(lastOfMonth.getDate() + lastDayOffset);
  const dayCount = Math.round((lastGridDay.getTime() - firstDay.getTime()) / 86_400_000) + 1;

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return date;
  });
}

export function shiftProjectCalendar(referenceDate: Date, mode: "month" | "week", direction: -1 | 1) {
  const next = new Date(referenceDate);
  if (mode === "month") next.setMonth(next.getMonth() + direction);
  else next.setDate(next.getDate() + direction * 7);
  return next;
}
