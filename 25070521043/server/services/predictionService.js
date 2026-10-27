/**
 * Predict month-end spend using a 7-calendar-day burn rate.
 * Dates are compared as local calendar dates to avoid time-of-day edge cases.
 */
export function buildPrediction({ expenses = [], monthlyBudget, now = new Date() }) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const nextMonthStart = new Date(year, month + 1, 1);
  const todayStart = new Date(year, month, now.getDate());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - now.getDate());
  const sevenDayStart = new Date(year, month, now.getDate() - 6);
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= monthStart && d < nextMonthStart;
  });
  const recentExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return day >= sevenDayStart && day <= todayStart;
  });
  const monthToDate = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const lastSevenDays = recentExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const dailyVelocity = lastSevenDays / 7;
  const projectedMonthlySpend = monthToDate + dailyVelocity * daysRemaining;
  const budget = Number(monthlyBudget || 0);
  const remainingBudget = budget - monthToDate;
  const historyDays = new Set(recentExpenses.map(e => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })).size;
  const dataLimited = historyDays < 3;
  let riskLevel = 'safe';
  if (projectedMonthlySpend > budget) riskLevel = 'danger';
  else if (projectedMonthlySpend >= budget * 0.85 || dataLimited) riskLevel = 'caution';

  let exhaustedDate = null;
  if (dailyVelocity > 0 && remainingBudget >= 0 && dailyVelocity * daysRemaining > remainingBudget) {
    const daysUntilExhaustion = Math.max(0, Math.ceil(remainingBudget / dailyVelocity));
    const exhaustion = new Date(year, month, now.getDate() + daysUntilExhaustion);
    exhaustedDate = exhaustion.toISOString().slice(0, 10);
  } else if (remainingBudget < 0) {
    exhaustedDate = todayStart.toISOString().slice(0, 10);
  }

  let recommendation = 'Your current spending pace looks manageable. Keep logging shared expenses.';
  if (riskLevel === 'danger') recommendation = 'Pause optional purchases and review Entertainment and Food spending with your roommates.';
  else if (riskLevel === 'caution' && !dataLimited) recommendation = 'You are approaching your budget. Review optional spending before making new shared purchases.';
  else if (dataLimited) recommendation = 'Forecast confidence is limited. Log expenses across more days for a more useful trend.';

  return {
    monthlyBudget: round(budget),
    monthToDate: round(monthToDate),
    lastSevenDays: round(lastSevenDays),
    dailyVelocity: round(dailyVelocity),
    projectedMonthlySpend: round(projectedMonthlySpend),
    remainingBudget: round(remainingBudget),
    daysRemaining,
    historyDays,
    dataLimited,
    riskLevel,
    exhaustedDate,
    recommendation,
    monthLabel: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  };
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
