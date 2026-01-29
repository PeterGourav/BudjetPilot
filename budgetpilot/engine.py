"""
BudgetPilot calculation engine.

Computes safe-to-spend amounts based on income, expenses, savings, and debt goals.
"""

from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional
import math

from .schema import (
    BudgetInput,
    BudgetOutput,
    MonthlyTotals,
    Suggestion,
    DebtItem
)


def parse_date(date_str: str) -> date:
    """Parse ISO date string to date object."""
    return datetime.fromisoformat(date_str).date()


def normalize_income_to_monthly(
    pay_frequency: str,
    net_pay_amount: float,
    irregular_monthly_avg: float = 0.0,
    irregular_reliability: str = "medium"
) -> float:
    """
    Normalize income to monthly amount.
    
    Args:
        pay_frequency: "weekly", "biweekly", or "monthly"
        net_pay_amount: Net pay per period
        irregular_monthly_avg: Average irregular income per month
        irregular_reliability: "low", "medium", or "high"
    
    Returns:
        Monthly income amount
    """
    # Base income normalization
    if pay_frequency == "weekly":
        base_monthly = net_pay_amount * 52 / 12
    elif pay_frequency == "biweekly":
        base_monthly = net_pay_amount * 26 / 12
    elif pay_frequency == "monthly":
        base_monthly = net_pay_amount
    else:
        raise ValueError(f"Unknown pay frequency: {pay_frequency}")
    
    # Add irregular income with reliability adjustment
    reliability_multiplier = {
        "low": 0.5,
        "medium": 0.75,
        "high": 1.0
    }.get(irregular_reliability, 0.75)
    
    irregular_adjusted = irregular_monthly_avg * reliability_multiplier
    
    return base_monthly + irregular_adjusted


def calculate_debt_payment_for_goal(
    balance: float,
    months: int,
    apr: Optional[float] = None
) -> float:
    """
    Calculate required monthly payment to pay off debt in N months.
    
    Uses amortization formula if APR is provided, otherwise simple division.
    
    Args:
        balance: Current debt balance
        months: Number of months to pay off
        apr: Annual percentage rate (0-100), or None for 0% interest
    
    Returns:
        Required monthly payment
    """
    if months <= 0:
        return balance
    
    if apr is None or apr == 0:
        # Simple division: balance / months
        return balance / months
    
    # Amortization formula: P = (r * PV) / (1 - (1 + r)^(-n))
    # where r = monthly rate, PV = present value, n = number of payments
    monthly_rate = (apr / 100) / 12
    
    if monthly_rate == 0:
        return balance / months
    
    # Calculate payment using amortization formula
    if monthly_rate > 0:
        payment = (monthly_rate * balance) / (1 - (1 + monthly_rate) ** (-months))
    else:
        payment = balance / months
    
    return payment


def get_payoff_months(goal: str, goal_date: Optional[str] = None, today: date = None) -> Optional[int]:
    """
    Convert payoff goal to number of months.
    
    Args:
        goal: "ASAP", "6mo", "12mo", "24mo", "customDate", or None
        goal_date: ISO date string for customDate goal
        today: Current date (defaults to date.today())
    
    Returns:
        Number of months, or None if goal is None
    """
    if goal is None:
        return None
    
    if today is None:
        today = date.today()
    
    if goal == "ASAP":
        return 1  # Minimum 1 month
    elif goal == "6mo":
        return 6
    elif goal == "12mo":
        return 12
    elif goal == "24mo":
        return 24
    elif goal == "customDate" and goal_date:
        goal_dt = parse_date(goal_date)
        delta = goal_dt - today
        months = max(1, int(delta.days / 30.44))  # Average days per month
        return months
    
    return None


def calculate_debt_required_monthly(
    debts: List[DebtItem],
    payoff_goal: Optional[str],
    payoff_goal_date: Optional[str],
    today: date
) -> float:
    """
    Calculate required monthly debt payment.
    
    If payoff goal is set, computes required payments to meet goal.
    Otherwise uses minimum payments.
    
    Args:
        debts: List of debt items
        payoff_goal: Payoff goal string
        payoff_goal_date: Custom payoff date if applicable
        today: Current date
    
    Returns:
        Total required monthly debt payment
    """
    if not debts:
        return 0.0
    
    payoff_months = get_payoff_months(payoff_goal, payoff_goal_date, today)
    
    if payoff_months is None:
        # No goal set, use minimum payments
        return sum(debt.minPaymentMonthly for debt in debts)
    
    # Calculate required payment for each debt to meet goal
    total_required = 0.0
    
    for debt in debts:
        goal_payment = calculate_debt_payment_for_goal(
            debt.balance,
            payoff_months,
            debt.apr
        )
        # Use the maximum of minimum payment and goal payment
        required = max(debt.minPaymentMonthly, goal_payment)
        total_required += required
    
    return total_required


def calculate_monthly_totals(input_data: BudgetInput, today: date) -> MonthlyTotals:
    """
    Calculate all monthly expense totals.
    
    Args:
        input_data: Budget input data
        today: Current date
    
    Returns:
        MonthlyTotals object
    """
    # Fixed expenses
    fixed_monthly = sum(
        exp.amountMonthly for exp in input_data.fixedExpenses if exp.enabled
    )
    
    # Subscriptions
    subs_monthly = sum(
        sub.amountMonthly for sub in input_data.subscriptions if sub.enabled
    )
    
    # Flexible caps
    flexible_caps_monthly = (
        input_data.flexibleCaps.eatingOut +
        input_data.flexibleCaps.entertainment +
        input_data.flexibleCaps.shopping +
        input_data.flexibleCaps.misc
    )
    
    # Savings
    if input_data.savings.enabled:
        if input_data.savings.mode == "fixedAmount":
            savings_monthly = input_data.savings.value
        else:  # percent
            # Will be calculated with income_monthly, placeholder for now
            savings_monthly = 0.0  # Will be recalculated
    else:
        savings_monthly = 0.0
    
    # Debt required
    if input_data.debts.enabled:
        debt_required_monthly = calculate_debt_required_monthly(
            input_data.debts.items,
            input_data.debts.payoffGoal,
            input_data.debts.payoffGoalDate,
            today
        )
    else:
        debt_required_monthly = 0.0
    
    # Essential monthly (fixed + subs + savings + debt)
    essential_monthly = (
        fixed_monthly +
        subs_monthly +
        savings_monthly +
        debt_required_monthly
    )
    
    return MonthlyTotals(
        fixed_monthly=fixed_monthly,
        subs_monthly=subs_monthly,
        flexible_caps_monthly=flexible_caps_monthly,
        savings_monthly=savings_monthly,  # Will be updated with income
        debt_required_monthly=debt_required_monthly,
        essential_monthly=essential_monthly
    )


def calculate(
    input_data: BudgetInput,
    include_suggestions: bool = True
) -> BudgetOutput:
    """
    Main calculation function.
    
    Args:
        input_data: Budget input data
    
    Returns:
        BudgetOutput with all calculations
    """
    # Parse dates
    today = parse_date(input_data.today) if input_data.today else date.today()
    next_pay_date = parse_date(input_data.income.nextPayDate)
    
    # Calculate days until payday
    days_until_payday = max(1, (next_pay_date - today).days)
    
    # Normalize income to monthly
    irregular_avg = 0.0
    irregular_reliability = "medium"
    if input_data.income.irregular and input_data.income.irregular.enabled:
        irregular_avg = input_data.income.irregular.monthlyAvg
        irregular_reliability = input_data.income.irregular.reliability
    
    income_monthly = normalize_income_to_monthly(
        input_data.income.payFrequency,
        input_data.income.netPayAmount,
        irregular_avg,
        irregular_reliability
    )
    
    # Calculate monthly totals
    totals = calculate_monthly_totals(input_data, today)
    
    # Update savings if it's percentage-based
    if input_data.savings.enabled and input_data.savings.mode == "percent":
        totals.savings_monthly = income_monthly * (input_data.savings.value / 100)
        totals.essential_monthly = (
            totals.fixed_monthly +
            totals.subs_monthly +
            totals.savings_monthly +
            totals.debt_required_monthly
        )
    
    # Check feasibility
    feasible = totals.essential_monthly <= income_monthly
    warnings: List[str] = []
    
    if not feasible:
        shortfall = totals.essential_monthly - income_monthly
        warnings.append(
            f"Plan is not feasible. Monthly shortfall: ${shortfall:.2f}. "
            f"Essential expenses (${totals.essential_monthly:.2f}) exceed income (${income_monthly:.2f})."
        )
        safe_to_spend_until_payday = 0.0
        safe_to_spend_today = 0.0
    else:
        # Calculate safe-to-spend
        # Assume no additional income until next payday
        income_until_payday = 0.0
        
        # Prorate essential expenses for the period until payday
        days_in_month = 30.44  # Average days per month
        reserved_until_payday = totals.essential_monthly * (days_until_payday / days_in_month)
        
        safe_to_spend_until_payday = max(
            0.0,
            input_data.balance_now + income_until_payday - reserved_until_payday
        )
        
        safe_to_spend_today = round(safe_to_spend_until_payday / days_until_payday, 2)
    
    # Generate suggestions (skip if this is a what-if calculation)
    suggestions = []
    if include_suggestions:
        from .suggestions import generate_suggestions
        suggestions = generate_suggestions(
            input_data,
            income_monthly,
            totals,
            safe_to_spend_today,
            feasible,
            today
        )
    
    return BudgetOutput(
        feasible=feasible,
        currency=input_data.currency,
        days_until_payday=days_until_payday,
        income_monthly=round(income_monthly, 2),
        totals=totals,
        safe_to_spend_until_payday=round(safe_to_spend_until_payday, 2),
        safe_to_spend_today=safe_to_spend_today,
        warnings=warnings,
        suggestions=suggestions
    )
