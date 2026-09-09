export type HabitMetricRow = {
  id: number;
  isActive: boolean;
  checkins: Array<{ completedAt: Date | string }>;
};

export function habitMetrics(habits: HabitMetricRow[], referenceDate = new Date()) {
  const active = habits.filter(habit => habit.isActive);
  const weekStart = new Date(referenceDate);
  weekStart.setDate(referenceDate.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const completedThisWeek = active.filter(habit => habit.checkins.some(checkin => new Date(checkin.completedAt) >= weekStart)).length;
  return {
    activeCount: active.length,
    completedThisWeek,
    completionRate: active.length ? Math.round((completedThisWeek / active.length) * 100) : null,
  };
}
