"""
Unit tests for BudgetPilot calculation engine.
"""

import unittest
from datetime import date, timedelta
from budgetpilot.schema import BudgetInput, Income, IrregularIncome, FixedExpense, Subscription, FlexibleCaps, Savings, Debts, DebtItem
from budgetpilot.engine import calculate, normalize_income_to_monthly, calculate_debt_payment_for_goal


class TestIncomeNormalization(unittest.TestCase):
    """Test income normalization to monthly."""
    
    def test_weekly_income(self):
        """Test weekly income normalization."""
        monthly = normalize_income_to_monthly("weekly", 1000.0)
        expected = 1000.0 * 52 / 12
        self.assertAlmostEqual(monthly, expected, places=2)
    
    def test_biweekly_income(self):
        """Test biweekly income normalization."""
        monthly = normalize_income_to_monthly("biweekly", 2000.0)
        expected = 2000.0 * 26 / 12
        self.assertAlmostEqual(monthly, expected, places=2)
    
    def test_monthly_income(self):
        """Test monthly income (no conversion needed)."""
        monthly = normalize_income_to_monthly("monthly", 5000.0)
        self.assertEqual(monthly, 5000.0)
    
    def test_irregular_income_low_reliability(self):
        """Test irregular income with low reliability."""
        monthly = normalize_income_to_monthly("monthly", 4000.0, irregular_monthly_avg=1000.0, irregular_reliability="low")
        expected = 4000.0 + (1000.0 * 0.5)
        self.assertAlmostEqual(monthly, expected, places=2)
    
    def test_irregular_income_high_reliability(self):
        """Test irregular income with high reliability."""
        monthly = normalize_income_to_monthly("monthly", 4000.0, irregular_monthly_avg=1000.0, irregular_reliability="high")
        expected = 4000.0 + (1000.0 * 1.0)
        self.assertAlmostEqual(monthly, expected, places=2)


class TestDebtCalculations(unittest.TestCase):
    """Test debt payment calculations."""
    
    def test_debt_no_interest(self):
        """Test debt payment calculation with 0% APR."""
        payment = calculate_debt_payment_for_goal(10000.0, 12, apr=None)
        expected = 10000.0 / 12
        self.assertAlmostEqual(payment, expected, places=2)
    
    def test_debt_with_interest(self):
        """Test debt payment calculation with APR."""
        # $10,000 at 12% APR over 12 months
        payment = calculate_debt_payment_for_goal(10000.0, 12, apr=12.0)
        # Should be higher than simple division due to interest
        self.assertGreater(payment, 10000.0 / 12)
        # Rough check: should be around $888-900/month
        self.assertGreater(payment, 850.0)
        self.assertLess(payment, 950.0)


class TestSimpleMonthlyBudget(unittest.TestCase):
    """Test 1: Simple monthly income with few fixed expenses."""
    
    def test_simple_budget(self):
        """Simple monthly budget calculation."""
        today = date.today()
        next_pay = today + timedelta(days=14)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=2000.0,  # Higher balance to ensure positive safe-to-spend
            income=Income(
                payFrequency="monthly",
                netPayAmount=5000.0,
                nextPayDate=next_pay.isoformat()
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=2000.0, enabled=True),
                FixedExpense(name="Utilities", amountMonthly=200.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=False, mode="fixedAmount", value=0.0),
            debts=Debts(enabled=False, items=[])
        )
        
        result = calculate(input_data)
        
        # Should be feasible
        self.assertTrue(result.feasible)
        # Income should be 5000
        self.assertEqual(result.income_monthly, 5000.0)
        # Fixed should be 2200
        self.assertEqual(result.totals.fixed_monthly, 2200.0)
        # Essential should be 2200 (no savings or debt)
        self.assertEqual(result.totals.essential_monthly, 2200.0)
        # Should have positive safe-to-spend (with balance_now=2000, reserved ~1011, so ~989 remaining)
        self.assertGreater(result.safe_to_spend_today, 0)


class TestWeeklyIncomeNormalization(unittest.TestCase):
    """Test 2: Weekly income normalization."""
    
    def test_weekly_income_budget(self):
        """Test budget with weekly income."""
        today = date.today()
        next_pay = today + timedelta(days=7)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=200.0,
            income=Income(
                payFrequency="weekly",
                netPayAmount=1000.0,
                nextPayDate=next_pay.isoformat()
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=2000.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=False, mode="fixedAmount", value=0.0),
            debts=Debts(enabled=False, items=[])
        )
        
        result = calculate(input_data)
        
        # Monthly income should be 1000 * 52 / 12 = 4333.33
        expected_monthly = 1000.0 * 52 / 12
        self.assertAlmostEqual(result.income_monthly, expected_monthly, places=2)
        
        # Should be feasible (4333 > 2000)
        self.assertTrue(result.feasible)


class TestSavingsPercent(unittest.TestCase):
    """Test 3: Savings with percentage mode."""
    
    def test_savings_percent(self):
        """Test savings calculation with percentage."""
        today = date.today()
        next_pay = today + timedelta(days=14)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=1000.0,
            income=Income(
                payFrequency="monthly",
                netPayAmount=5000.0,
                nextPayDate=next_pay.isoformat()
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=2000.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=True, mode="percent", value=10.0),  # 10%
            debts=Debts(enabled=False, items=[])
        )
        
        result = calculate(input_data)
        
        # Savings should be 10% of 5000 = 500
        self.assertAlmostEqual(result.totals.savings_monthly, 500.0, places=2)
        # Essential should be 2000 + 500 = 2500
        self.assertAlmostEqual(result.totals.essential_monthly, 2500.0, places=2)


class TestDebtPayoffWithAPR(unittest.TestCase):
    """Test 4: Debt payoff calculation with APR."""
    
    def test_debt_payoff_goal(self):
        """Test debt with payoff goal and APR."""
        today = date.today()
        next_pay = today + timedelta(days=14)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=500.0,
            income=Income(
                payFrequency="monthly",
                netPayAmount=5000.0,
                nextPayDate=next_pay.isoformat()
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=2000.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=False, mode="fixedAmount", value=0.0),
            debts=Debts(
                enabled=True,
                items=[
                    DebtItem(
                        type="Credit Card",
                        balance=10000.0,
                        minPaymentMonthly=200.0,
                        apr=18.0  # 18% APR
                    )
                ],
                payoffGoal="12mo"
            )
        )
        
        result = calculate(input_data)
        
        # Debt required should be higher than minimum payment due to 12mo goal
        self.assertGreater(result.totals.debt_required_monthly, 200.0)
        # Should be feasible (5000 > 2000 + debt_required)
        self.assertTrue(result.feasible)


class TestInfeasiblePlan(unittest.TestCase):
    """Test 5: Infeasible budget plan."""
    
    def test_infeasible_plan(self):
        """Test plan where expenses exceed income."""
        today = date.today()
        next_pay = today + timedelta(days=14)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=100.0,
            income=Income(
                payFrequency="monthly",
                netPayAmount=2000.0,
                nextPayDate=next_pay.isoformat()
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=1500.0, enabled=True),
                FixedExpense(name="Utilities", amountMonthly=300.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=True, mode="fixedAmount", value=500.0),
            debts=Debts(enabled=False, items=[])
        )
        
        result = calculate(input_data)
        
        # Should not be feasible (2000 < 1500 + 300 + 500 = 2300)
        self.assertFalse(result.feasible)
        # Should have warnings
        self.assertGreater(len(result.warnings), 0)
        # Safe to spend should be 0
        self.assertEqual(result.safe_to_spend_today, 0.0)
        # Should have suggestions
        self.assertGreater(len(result.suggestions), 0)


class TestIrregularIncomeReliability(unittest.TestCase):
    """Test 6: Irregular income reliability impact."""
    
    def test_irregular_income_low(self):
        """Test with low reliability irregular income."""
        today = date.today()
        next_pay = today + timedelta(days=14)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=500.0,
            income=Income(
                payFrequency="monthly",
                netPayAmount=4000.0,
                nextPayDate=next_pay.isoformat(),
                irregular=IrregularIncome(
                    enabled=True,
                    monthlyAvg=1000.0,
                    reliability="low"
                )
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=2000.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=False, mode="fixedAmount", value=0.0),
            debts=Debts(enabled=False, items=[])
        )
        
        result = calculate(input_data)
        
        # Income should be 4000 + (1000 * 0.5) = 4500
        expected_income = 4000.0 + (1000.0 * 0.5)
        self.assertAlmostEqual(result.income_monthly, expected_income, places=2)
    
    def test_irregular_income_high(self):
        """Test with high reliability irregular income."""
        today = date.today()
        next_pay = today + timedelta(days=14)
        
        input_data = BudgetInput(
            currency="CAD",
            today=today.isoformat(),
            balance_now=500.0,
            income=Income(
                payFrequency="monthly",
                netPayAmount=4000.0,
                nextPayDate=next_pay.isoformat(),
                irregular=IrregularIncome(
                    enabled=True,
                    monthlyAvg=1000.0,
                    reliability="high"
                )
            ),
            fixedExpenses=[
                FixedExpense(name="Rent", amountMonthly=2000.0, enabled=True)
            ],
            subscriptions=[],
            flexibleCaps=FlexibleCaps(),
            savings=Savings(enabled=False, mode="fixedAmount", value=0.0),
            debts=Debts(enabled=False, items=[])
        )
        
        result = calculate(input_data)
        
        # Income should be 4000 + (1000 * 1.0) = 5000
        expected_income = 4000.0 + (1000.0 * 1.0)
        self.assertAlmostEqual(result.income_monthly, expected_income, places=2)


if __name__ == '__main__':
    unittest.main()
