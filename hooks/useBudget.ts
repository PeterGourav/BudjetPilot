import { useEffect, useState, useCallback } from 'react';
import {
  getIncomeData,
  getFixedExpenses,
  getSubscriptions,
  getFlexibleSpending,
  getSavingsGoal,
  getDebts,
} from '@/services/database';
import { calculateBudget, type BudgetCalculation } from '@/services/budgetCalculator';

export function useBudget(balanceNow: number = 0) {
  const [budget, setBudget] = useState<BudgetCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBudget = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [income, fixedExpenses, subscriptions, flexibleSpending, savings, debts] =
        await Promise.all([
          getIncomeData(),
          getFixedExpenses(),
          getSubscriptions(),
          getFlexibleSpending(),
          getSavingsGoal(),
          getDebts(),
        ]);

      const calculation = await calculateBudget(
        income,
        fixedExpenses,
        subscriptions,
        flexibleSpending,
        savings,
        debts,
        balanceNow
      );

      setBudget(calculation);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load budget'));
      console.error('Error loading budget:', err);
    } finally {
      setLoading(false);
    }
  }, [balanceNow]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  return { budget, loading, error, refresh: loadBudget };
}
