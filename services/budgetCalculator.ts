/**
 * Budget calculation service
 * Implements the same logic as the Python engine
 */

import type {
    Debt,
    FixedExpense,
    FlexibleSpending,
    IncomeData,
    SavingsGoal,
    Subscription,
} from "./database";

export interface BudgetCalculation {
  feasible: boolean;
  incomeMonthly: number;
  totals: {
    fixedMonthly: number;
    subsMonthly: number;
    flexibleCapsMonthly: number;
    savingsMonthly: number;
    debtRequiredMonthly: number;
    essentialMonthly: number;
  };
  safeToSpendUntilPayday: number;
  safeToSpendToday: number;
  daysUntilPayday: number;
  nextPayDate: Date;
  warnings: string[];
}

/**
 * Normalize income to monthly amount
 */
function normalizeIncomeToMonthly(
  payFrequency: "weekly" | "biweekly" | "monthly",
  netPayAmount: number,
  irregularMonthlyAvg: number = 0,
  irregularReliability: "low" | "medium" | "high" = "medium",
): number {
  // Base income normalization
  let baseMonthly: number;
  if (payFrequency === "weekly") {
    baseMonthly = (netPayAmount * 52) / 12;
  } else if (payFrequency === "biweekly") {
    baseMonthly = (netPayAmount * 26) / 12;
  } else if (payFrequency === "monthly") {
    baseMonthly = netPayAmount;
  } else {
    throw new Error(`Unknown pay frequency: ${payFrequency}`);
  }

  // Add irregular income with reliability adjustment
  const reliabilityMultiplier =
    {
      low: 0.5,
      medium: 0.75,
      high: 1.0,
    }[irregularReliability] || 0.75;

  const irregularAdjusted = irregularMonthlyAvg * reliabilityMultiplier;

  return baseMonthly + irregularAdjusted;
}

/**
 * Calculate debt payment for goal (simplified - no APR for now)
 */
function calculateDebtPaymentForGoal(balance: number, months: number): number {
  if (months <= 0) return balance;
  return balance / months;
}

/**
 * Get payoff months from goal
 */
function getPayoffMonths(
  goal: "ASAP" | "6mo" | "12mo" | "24mo" | "customDate" | undefined,
  goalDate: string | undefined,
  today: Date,
): number | null {
  if (!goal) return null;

  if (goal === "ASAP") return 1;
  if (goal === "6mo") return 6;
  if (goal === "12mo") return 12;
  if (goal === "24mo") return 24;
  if (goal === "customDate" && goalDate) {
    const goalDt = new Date(goalDate);
    const delta = goalDt.getTime() - today.getTime();
    const months = Math.max(
      1,
      Math.floor(delta / (1000 * 60 * 60 * 24 * 30.44)),
    );
    return months;
  }

  return null;
}

/**
 * Calculate required monthly debt payment
 */
function calculateDebtRequiredMonthly(debts: Debt[], today: Date): number {
  if (!debts || debts.length === 0) return 0;

  // For now, use minimum payments
  // TODO: Add payoff goal logic if needed
  return debts.reduce((sum, debt) => sum + debt.minPaymentMonthly, 0);
}

/**
 * Calculate budget from onboarding data
 */
export async function calculateBudget(
  income: IncomeData | undefined,
  fixedExpenses: FixedExpense[] | undefined,
  subscriptions: Subscription[] | undefined,
  flexibleSpending: FlexibleSpending | undefined,
  savings: SavingsGoal | undefined,
  debts: Debt[] | undefined,
  balanceNow: number = 0,
): Promise<BudgetCalculation | null> {
  if (!income) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextPayDate = new Date(income.nextPayDate);
  nextPayDate.setHours(0, 0, 0, 0);

  // Calculate days until payday
  const daysUntilPayday = Math.max(
    1,
    Math.ceil(
      (nextPayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Normalize income to monthly
  const irregularAvg =
    income.irregularIncomeEnabled && income.irregularMonthlyAvg
      ? income.irregularMonthlyAvg
      : 0;
  const irregularReliability = income.irregularReliability || "medium";

  const incomeMonthly = normalizeIncomeToMonthly(
    income.payFrequency,
    income.netPayAmount,
    irregularAvg,
    irregularReliability,
  );

  // Calculate monthly totals
  const fixedMonthly = (fixedExpenses || [])
    .filter((exp) => exp.enabled)
    .reduce((sum, exp) => sum + exp.amountMonthly, 0);

  const subsMonthly = (subscriptions || []).reduce(
    (sum, sub) => sum + sub.amountMonthly,
    0,
  );

  const flexibleCapsMonthly = flexibleSpending
    ? flexibleSpending.eatingOut +
      flexibleSpending.entertainment +
      flexibleSpending.shopping +
      flexibleSpending.miscBuffer
    : 0;

  let savingsMonthly = 0;
  if (savings?.enabled && savings.savingsValue) {
    if (savings.savingsMode === "fixedAmount") {
      savingsMonthly = savings.savingsValue;
    } else if (savings.savingsMode === "percent") {
      savingsMonthly = incomeMonthly * (savings.savingsValue / 100);
    }
  }

  const debtRequiredMonthly = calculateDebtRequiredMonthly(debts || [], today);

  const essentialMonthly =
    fixedMonthly + subsMonthly + savingsMonthly + debtRequiredMonthly;

  // Check feasibility
  const feasible = essentialMonthly <= incomeMonthly;
  const warnings: string[] = [];

  if (!feasible) {
    const shortfall = essentialMonthly - incomeMonthly;
    warnings.push(
      `Plan is not feasible. Monthly shortfall: $${shortfall.toFixed(2)}. ` +
        `Essential expenses ($${essentialMonthly.toFixed(2)}) exceed income ($${incomeMonthly.toFixed(2)}).`,
    );
  }

  // Calculate safe-to-spend, aligned with summary logic:
  // Use the monthly surplus after essentials and spread it across the period.
  let safeToSpendUntilPayday = 0;
  let safeToSpendToday = 0;

  if (feasible) {
    // Amount available for flexible spending in a typical month
    const surplusMonthly = incomeMonthly - essentialMonthly;

    if (surplusMonthly > 0) {
      const daysInMonth = 30.44; // Average days per month

      // Daily flexible budget
      const dailyBudget = surplusMonthly / daysInMonth;

      // Total we can safely spend between now and next payday
      safeToSpendUntilPayday = Math.max(
        0,
        Math.round(dailyBudget * daysUntilPayday * 100) / 100,
      );

      // Safe to spend today is the same daily budget, rounded
      safeToSpendToday = Math.round(dailyBudget * 100) / 100;
    }
  }

  return {
    feasible,
    incomeMonthly: Math.round(incomeMonthly * 100) / 100,
    totals: {
      fixedMonthly: Math.round(fixedMonthly * 100) / 100,
      subsMonthly: Math.round(subsMonthly * 100) / 100,
      flexibleCapsMonthly: Math.round(flexibleCapsMonthly * 100) / 100,
      savingsMonthly: Math.round(savingsMonthly * 100) / 100,
      debtRequiredMonthly: Math.round(debtRequiredMonthly * 100) / 100,
      essentialMonthly: Math.round(essentialMonthly * 100) / 100,
    },
    safeToSpendUntilPayday: Math.round(safeToSpendUntilPayday * 100) / 100,
    safeToSpendToday,
    daysUntilPayday,
    nextPayDate,
    warnings,
  };
}
