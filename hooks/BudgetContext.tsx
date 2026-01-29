import type { BudgetCalculation } from "@/services/budgetCalculator";
import React, { createContext, useContext } from "react";
import { useBudget } from "./useBudget";

type BudgetContextValue = {
  budget: BudgetCalculation | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { budget, loading, error, refresh } = useBudget();

  return (
    <BudgetContext.Provider value={{ budget, loading, error, refresh }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgetContext(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudgetContext must be used within a BudgetProvider");
  }
  return ctx;
}
