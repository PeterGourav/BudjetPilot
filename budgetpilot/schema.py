"""
Input/output schema definitions for BudgetPilot calculation engine.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Dict, List, Optional, Literal, Any
import json


@dataclass
class IrregularIncome:
    """Irregular income configuration."""
    enabled: bool
    monthlyAvg: float
    reliability: Literal["low", "medium", "high"]


@dataclass
class Income:
    """Income configuration."""
    payFrequency: Literal["weekly", "biweekly", "monthly"]
    netPayAmount: float
    nextPayDate: str  # ISO date string
    irregular: Optional[IrregularIncome] = None


@dataclass
class FixedExpense:
    """Fixed monthly expense."""
    name: str
    amountMonthly: float
    enabled: bool = True


@dataclass
class Subscription:
    """Subscription expense."""
    name: str
    amountMonthly: float
    enabled: bool = True


@dataclass
class FlexibleCaps:
    """Flexible spending category caps."""
    eatingOut: float = 0.0
    entertainment: float = 0.0
    shopping: float = 0.0
    misc: float = 0.0


@dataclass
class Savings:
    """Savings goal configuration."""
    enabled: bool
    mode: Literal["fixedAmount", "percent"]
    value: float


@dataclass
class DebtItem:
    """Individual debt item."""
    type: str
    balance: float
    minPaymentMonthly: float
    apr: Optional[float] = None  # Annual percentage rate (0-100)


@dataclass
class Debts:
    """Debt configuration."""
    enabled: bool
    items: List[DebtItem]
    payoffGoal: Optional[Literal["ASAP", "6mo", "12mo", "24mo", "customDate"]] = None
    payoffGoalDate: Optional[str] = None  # ISO date string


@dataclass
class BudgetInput:
    """Complete budget input schema."""
    currency: str = "CAD"
    today: Optional[str] = None  # ISO date string; if None, use date.today()
    balance_now: float = 0.0
    income: Income = field(default_factory=lambda: Income(
        payFrequency="monthly",
        netPayAmount=0.0,
        nextPayDate=""
    ))
    fixedExpenses: List[FixedExpense] = field(default_factory=list)
    subscriptions: List[Subscription] = field(default_factory=list)
    flexibleCaps: FlexibleCaps = field(default_factory=FlexibleCaps)
    savings: Savings = field(default_factory=lambda: Savings(
        enabled=False,
        mode="fixedAmount",
        value=0.0
    ))
    debts: Debts = field(default_factory=lambda: Debts(
        enabled=False,
        items=[]
    ))

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BudgetInput":
        """Parse input from JSON dictionary."""
        # Parse income
        income_data = data.get("income", {})
        irregular_data = income_data.get("irregular")
        irregular = None
        if irregular_data:
            irregular = IrregularIncome(
                enabled=irregular_data.get("enabled", False),
                monthlyAvg=irregular_data.get("monthlyAvg", 0.0),
                reliability=irregular_data.get("reliability", "medium")
            )
        
        income = Income(
            payFrequency=income_data.get("payFrequency", "monthly"),
            netPayAmount=income_data.get("netPayAmount", 0.0),
            nextPayDate=income_data.get("nextPayDate", ""),
            irregular=irregular
        )

        # Parse fixed expenses
        fixed_expenses = [
            FixedExpense(
                name=exp.get("name", ""),
                amountMonthly=exp.get("amountMonthly", 0.0),
                enabled=exp.get("enabled", True)
            )
            for exp in data.get("fixedExpenses", [])
        ]

        # Parse subscriptions
        subscriptions = [
            Subscription(
                name=sub.get("name", ""),
                amountMonthly=sub.get("amountMonthly", 0.0),
                enabled=sub.get("enabled", True)
            )
            for sub in data.get("subscriptions", [])
        ]

        # Parse flexible caps
        flex_data = data.get("flexibleCaps", {})
        flexible_caps = FlexibleCaps(
            eatingOut=flex_data.get("eatingOut", 0.0),
            entertainment=flex_data.get("entertainment", 0.0),
            shopping=flex_data.get("shopping", 0.0),
            misc=flex_data.get("misc", 0.0)
        )

        # Parse savings
        savings_data = data.get("savings", {})
        savings = Savings(
            enabled=savings_data.get("enabled", False),
            mode=savings_data.get("mode", "fixedAmount"),
            value=savings_data.get("value", 0.0)
        )

        # Parse debts
        debts_data = data.get("debts", {})
        debt_items = [
            DebtItem(
                type=item.get("type", ""),
                balance=item.get("balance", 0.0),
                minPaymentMonthly=item.get("minPaymentMonthly", 0.0),
                apr=item.get("apr")
            )
            for item in debts_data.get("items", [])
        ]
        debts = Debts(
            enabled=debts_data.get("enabled", False),
            items=debt_items,
            payoffGoal=debts_data.get("payoffGoal"),
            payoffGoalDate=debts_data.get("payoffGoalDate")
        )

        return cls(
            currency=data.get("currency", "CAD"),
            today=data.get("today"),
            balance_now=data.get("balance_now", 0.0),
            income=income,
            fixedExpenses=fixed_expenses,
            subscriptions=subscriptions,
            flexibleCaps=flexible_caps,
            savings=savings,
            debts=debts
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "currency": self.currency,
            "today": self.today or date.today().isoformat(),
            "balance_now": self.balance_now,
            "income": {
                "payFrequency": self.income.payFrequency,
                "netPayAmount": self.income.netPayAmount,
                "nextPayDate": self.income.nextPayDate,
                "irregular": {
                    "enabled": self.income.irregular.enabled,
                    "monthlyAvg": self.income.irregular.monthlyAvg,
                    "reliability": self.income.irregular.reliability
                } if self.income.irregular is not None else None
            },
            "fixedExpenses": [
                {"name": exp.name, "amountMonthly": exp.amountMonthly, "enabled": exp.enabled}
                for exp in self.fixedExpenses
            ],
            "subscriptions": [
                {"name": sub.name, "amountMonthly": sub.amountMonthly, "enabled": sub.enabled}
                for sub in self.subscriptions
            ],
            "flexibleCaps": {
                "eatingOut": self.flexibleCaps.eatingOut,
                "entertainment": self.flexibleCaps.entertainment,
                "shopping": self.flexibleCaps.shopping,
                "misc": self.flexibleCaps.misc
            },
            "savings": {
                "enabled": self.savings.enabled,
                "mode": self.savings.mode,
                "value": self.savings.value
            },
            "debts": {
                "enabled": self.debts.enabled,
                "items": [
                    {
                        "type": item.type,
                        "balance": item.balance,
                        "minPaymentMonthly": item.minPaymentMonthly,
                        "apr": item.apr
                    }
                    for item in self.debts.items
                ],
                "payoffGoal": self.debts.payoffGoal,
                "payoffGoalDate": self.debts.payoffGoalDate
            }
        }


@dataclass
class MonthlyTotals:
    """Monthly expense totals."""
    fixed_monthly: float
    subs_monthly: float
    flexible_caps_monthly: float
    savings_monthly: float
    debt_required_monthly: float
    essential_monthly: float


@dataclass
class Suggestion:
    """A budget adjustment suggestion."""
    title: str
    changes: Dict[str, Any]
    safe_to_spend_today: float
    delta: float  # Change from current safe_to_spend_today


@dataclass
class BudgetOutput:
    """Budget calculation output."""
    feasible: bool
    currency: str
    days_until_payday: int
    income_monthly: float
    totals: MonthlyTotals
    safe_to_spend_until_payday: float
    safe_to_spend_today: float
    warnings: List[str]
    suggestions: List[Suggestion]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "feasible": self.feasible,
            "currency": self.currency,
            "days_until_payday": self.days_until_payday,
            "income_monthly": self.income_monthly,
            "totals": {
                "fixed_monthly": self.totals.fixed_monthly,
                "subs_monthly": self.totals.subs_monthly,
                "flexible_caps_monthly": self.totals.flexible_caps_monthly,
                "savings_monthly": self.totals.savings_monthly,
                "debt_required_monthly": self.totals.debt_required_monthly,
                "essential_monthly": self.totals.essential_monthly
            },
            "safe_to_spend_until_payday": round(self.safe_to_spend_until_payday, 2),
            "safe_to_spend_today": round(self.safe_to_spend_today, 2),
            "warnings": self.warnings,
            "suggestions": [
                {
                    "title": sug.title,
                    "changes": sug.changes,
                    "safe_to_spend_today": round(sug.safe_to_spend_today, 2),
                    "delta": round(sug.delta, 2)
                }
                for sug in self.suggestions
            ]
        }
