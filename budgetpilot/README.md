# BudgetPilot Calculation Engine

A deterministic Python calculation engine for computing safe-to-spend budget amounts.

## Quick Start

```python
from budgetpilot.schema import BudgetInput
from budgetpilot.engine import calculate

# Load your data
input_data = BudgetInput.from_dict({
    "currency": "CAD",
    "today": "2026-01-26",
    "balance_now": 500.0,
    "income": {
        "payFrequency": "monthly",
        "netPayAmount": 5000.0,
        "nextPayDate": "2026-02-10"
    },
    "fixedExpenses": [
        {"name": "Rent", "amountMonthly": 2000.0, "enabled": True}
    ],
    "subscriptions": [],
    "flexibleCaps": {"eatingOut": 200, "entertainment": 100},
    "savings": {"enabled": True, "mode": "percent", "value": 10},
    "debts": {"enabled": False, "items": []}
})

# Calculate
result = calculate(input_data)

print(f"Safe to spend today: ${result.safe_to_spend_today}")
print(f"Feasible: {result.feasible}")
```

## Architecture

- **schema.py**: Input/output data structures (dataclasses)
- **engine.py**: Core calculation logic
- **suggestions.py**: What-if scenario calculations
- **api.py**: Optional FastAPI REST endpoint

## Key Features

✅ Income normalization (weekly/biweekly/monthly)  
✅ Irregular income with reliability adjustments  
✅ Debt amortization with APR support  
✅ Feasibility checking  
✅ Safe-to-spend calculations  
✅ Smart suggestions for optimization  

## Testing

```bash
python -m unittest tests.test_engine -v
```

All 14 tests passing ✅
