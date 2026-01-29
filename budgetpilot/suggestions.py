"""
Budget adjustment suggestions and what-if scenario calculations.
"""

from datetime import date
from typing import List
from copy import deepcopy

from .schema import (
    BudgetInput,
    MonthlyTotals,
    Suggestion,
    Savings,
    Debts
)
from .engine import calculate, calculate_debt_required_monthly, get_payoff_months


def generate_suggestions(
    input_data: BudgetInput,
    income_monthly: float,
    totals: MonthlyTotals,
    current_safe_to_spend_today: float,
    feasible: bool,
    today: date
) -> List[Suggestion]:
    """
    Generate budget adjustment suggestions.
    
    If infeasible, suggests ways to make it feasible.
    If feasible, suggests optimizations.
    
    Args:
        input_data: Original budget input
        income_monthly: Monthly income
        totals: Current monthly totals
        current_safe_to_spend_today: Current safe-to-spend per day
        feasible: Whether current plan is feasible
        today: Current date
    
    Returns:
        List of suggestions
    """
    suggestions: List[Suggestion] = []
    
    if not feasible:
        # Infeasible plan - suggest ways to make it feasible
        suggestions.extend(_generate_infeasible_suggestions(
            input_data,
            income_monthly,
            totals,
            current_safe_to_spend_today,
            today
        ))
    else:
        # Feasible plan - suggest optimizations
        suggestions.extend(_generate_optimization_suggestions(
            input_data,
            income_monthly,
            totals,
            current_safe_to_spend_today,
            today
        ))
    
    return suggestions


def _generate_infeasible_suggestions(
    input_data: BudgetInput,
    income_monthly: float,
    totals: MonthlyTotals,
    current_safe_to_spend_today: float,
    today: date
) -> List[Suggestion]:
    """Generate suggestions for infeasible plans."""
    suggestions = []
    
    # Suggestion 1: Reduce savings to 0
    if input_data.savings.enabled:
        modified_input = deepcopy(input_data)
        modified_input.savings.enabled = False
        modified_input.savings.value = 0.0
        
        result = calculate(modified_input, include_suggestions=False)
        suggestions.append(Suggestion(
            title="Reduce savings to $0",
            changes={"savings": {"enabled": False, "value": 0.0}},
            safe_to_spend_today=result.safe_to_spend_today,
            delta=result.safe_to_spend_today - current_safe_to_spend_today
        ))
    
    # Suggestion 2: Extend debt payoff goal to 24mo or remove goal
    if input_data.debts.enabled and input_data.debts.payoffGoal:
        modified_input = deepcopy(input_data)
        modified_input.debts.payoffGoal = "24mo"
        modified_input.debts.payoffGoalDate = None
        
        result = calculate(modified_input, include_suggestions=False)
        suggestions.append(Suggestion(
            title="Extend debt payoff goal to 24 months",
            changes={"debts": {"payoffGoal": "24mo"}},
            safe_to_spend_today=result.safe_to_spend_today,
            delta=result.safe_to_spend_today - current_safe_to_spend_today
        ))
        
        # Also suggest removing goal entirely (minimum payments only)
        modified_input2 = deepcopy(input_data)
        modified_input2.debts.payoffGoal = None
        modified_input2.debts.payoffGoalDate = None
        
        result2 = calculate(modified_input2)
        suggestions.append(Suggestion(
            title="Use minimum debt payments only",
            changes={"debts": {"payoffGoal": None}},
            safe_to_spend_today=result2.safe_to_spend_today,
            delta=result2.safe_to_spend_today - current_safe_to_spend_today
        ))
    
    # Suggestion 3: Reduce flexible caps by 20%
    if totals.flexible_caps_monthly > 0:
        modified_input = deepcopy(input_data)
        modified_input.flexibleCaps.eatingOut *= 0.8
        modified_input.flexibleCaps.entertainment *= 0.8
        modified_input.flexibleCaps.shopping *= 0.8
        modified_input.flexibleCaps.misc *= 0.8
        
        result = calculate(modified_input, include_suggestions=False)
        suggestions.append(Suggestion(
            title="Reduce flexible spending caps by 20%",
            changes={
                "flexibleCaps": {
                    "eatingOut": modified_input.flexibleCaps.eatingOut,
                    "entertainment": modified_input.flexibleCaps.entertainment,
                    "shopping": modified_input.flexibleCaps.shopping,
                    "misc": modified_input.flexibleCaps.misc
                }
            },
            safe_to_spend_today=result.safe_to_spend_today,
            delta=result.safe_to_spend_today - current_safe_to_spend_today
        ))
    
    return suggestions


def _generate_optimization_suggestions(
    input_data: BudgetInput,
    income_monthly: float,
    totals: MonthlyTotals,
    current_safe_to_spend_today: float,
    today: date
) -> List[Suggestion]:
    """Generate optimization suggestions for feasible plans."""
    suggestions = []
    
    # Suggestion 1: Increase savings
    if input_data.savings.enabled:
        modified_input = deepcopy(input_data)
        if input_data.savings.mode == "percent":
            # Increase by 5 percentage points
            new_value = min(50, input_data.savings.value + 5)
            modified_input.savings.value = new_value
            changes = {"savings": {"value": new_value}}
            title = f"Increase savings to {new_value}%"
        else:
            # Increase by $50
            new_value = input_data.savings.value + 50
            modified_input.savings.value = new_value
            changes = {"savings": {"value": new_value}}
            title = f"Increase savings by $50/month"
        
        result = calculate(modified_input, include_suggestions=False)
        suggestions.append(Suggestion(
            title=title,
            changes=changes,
            safe_to_spend_today=result.safe_to_spend_today,
            delta=result.safe_to_spend_today - current_safe_to_spend_today
        ))
    else:
        # Suggest enabling savings
        modified_input = deepcopy(input_data)
        modified_input.savings.enabled = True
        modified_input.savings.mode = "fixedAmount"
        modified_input.savings.value = 50.0
        
        result = calculate(modified_input, include_suggestions=False)
        suggestions.append(Suggestion(
            title="Start saving $50/month",
            changes={"savings": {"enabled": True, "mode": "fixedAmount", "value": 50.0}},
            safe_to_spend_today=result.safe_to_spend_today,
            delta=result.safe_to_spend_today - current_safe_to_spend_today
        ))
    
    # Suggestion 2: Pay debt faster (12mo goal)
    if input_data.debts.enabled and input_data.debts.items:
        current_goal = input_data.debts.payoffGoal
        if current_goal != "12mo":
            modified_input = deepcopy(input_data)
            modified_input.debts.payoffGoal = "12mo"
            modified_input.debts.payoffGoalDate = None
            
            result = calculate(modified_input, include_suggestions=False)
            suggestions.append(Suggestion(
                title="Pay off debt in 12 months",
                changes={"debts": {"payoffGoal": "12mo"}},
                safe_to_spend_today=result.safe_to_spend_today,
                delta=result.safe_to_spend_today - current_safe_to_spend_today
            ))
    
    # Suggestion 3: Add 5% buffer to flexible caps
    if totals.flexible_caps_monthly > 0:
        modified_input = deepcopy(input_data)
        modified_input.flexibleCaps.eatingOut *= 1.05
        modified_input.flexibleCaps.entertainment *= 1.05
        modified_input.flexibleCaps.shopping *= 1.05
        modified_input.flexibleCaps.misc *= 1.05
        
        result = calculate(modified_input, include_suggestions=False)
        suggestions.append(Suggestion(
            title="Add 5% buffer to flexible spending",
            changes={
                "flexibleCaps": {
                    "eatingOut": modified_input.flexibleCaps.eatingOut,
                    "entertainment": modified_input.flexibleCaps.entertainment,
                    "shopping": modified_input.flexibleCaps.shopping,
                    "misc": modified_input.flexibleCaps.misc
                }
            },
            safe_to_spend_today=result.safe_to_spend_today,
            delta=result.safe_to_spend_today - current_safe_to_spend_today
        ))
    
    return suggestions
