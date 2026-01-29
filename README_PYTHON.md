# BudgetPilot Calculation Engine

A deterministic Python calculation engine for computing safe-to-spend budget amounts based on income, expenses, savings, and debt goals.

## Features

- **Income Normalization**: Converts weekly/biweekly/monthly income to monthly amounts
- **Debt Calculations**: Supports amortization with APR for payoff goals
- **Feasibility Checking**: Detects when expenses exceed income
- **Safe-to-Spend Calculation**: Computes daily and period-based spending limits
- **Smart Suggestions**: Provides what-if scenarios for budget optimization

## Installation

The engine uses only Python standard library. For the optional API endpoint:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Calculation

```python
from budgetpilot.schema import BudgetInput
from budgetpilot.engine import calculate

# Create input data
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

# Access results
print(f"Feasible: {result.feasible}")
print(f"Safe to spend today: ${result.safe_to_spend_today}")
print(f"Income monthly: ${result.income_monthly}")
```

### API Endpoint (Optional)

Start the FastAPI server:

```bash
python -m budgetpilot.api
```

Or with uvicorn:

```bash
uvicorn budgetpilot.api:app --reload
```

Then POST to `/calculate`:

```bash
curl -X POST http://localhost:8000/calculate \
  -H "Content-Type: application/json" \
  -d @budget_input.json
```

## Input Schema

See `budgetpilot/schema.py` for complete schema definitions. Key fields:

- **income**: Pay frequency, amount, next pay date, optional irregular income
- **fixedExpenses**: List of monthly fixed expenses
- **subscriptions**: List of subscription expenses
- **flexibleCaps**: Monthly caps for flexible spending categories
- **savings**: Savings goal (fixed amount or percentage)
- **debts**: Debt items with optional payoff goals and APR

## Output Schema

The calculation returns:

- `feasible`: Boolean indicating if plan is feasible
- `income_monthly`: Normalized monthly income
- `totals`: Monthly expense breakdown
- `safe_to_spend_until_payday`: Total safe to spend until next payday
- `safe_to_spend_today`: Safe to spend per day
- `warnings`: List of warnings (if infeasible)
- `suggestions`: List of optimization suggestions

## Testing

Run unit tests:

```bash
python -m pytest tests/
```

Or with unittest:

```bash
python -m unittest tests.test_engine
```

## Algorithm Details

### Income Normalization
- Weekly: `amount * 52 / 12`
- Biweekly: `amount * 26 / 12`
- Monthly: `amount`
- Irregular income adjusted by reliability (low=0.5x, medium=0.75x, high=1.0x)

### Debt Calculations
- Uses amortization formula when APR is provided
- Falls back to simple division for 0% interest
- Supports payoff goals: ASAP, 6mo, 12mo, 24mo, customDate

### Safe-to-Spend
- Prorates essential expenses by days until payday
- `safe_to_spend = balance_now - (essential_monthly * days_until_payday / 30.44)`
- Divides by days to get daily amount

## License

Part of BudgetPilot project.
