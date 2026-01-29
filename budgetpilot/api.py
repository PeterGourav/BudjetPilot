"""
FastAPI endpoint for BudgetPilot calculation engine.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List, Literal

from .schema import BudgetInput, BudgetOutput
from .engine import calculate

app = FastAPI(title="BudgetPilot API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IrregularIncomeInput(BaseModel):
    enabled: bool
    monthlyAvg: float
    reliability: Literal["low", "medium", "high"]


class IncomeInput(BaseModel):
    payFrequency: Literal["weekly", "biweekly", "monthly"]
    netPayAmount: float
    nextPayDate: str
    irregular: Optional[IrregularIncomeInput] = None


class FixedExpenseInput(BaseModel):
    name: str
    amountMonthly: float
    enabled: bool = True


class SubscriptionInput(BaseModel):
    name: str
    amountMonthly: float
    enabled: bool = True


class FlexibleCapsInput(BaseModel):
    eatingOut: float = 0.0
    entertainment: float = 0.0
    shopping: float = 0.0
    misc: float = 0.0


class SavingsInput(BaseModel):
    enabled: bool
    mode: Literal["fixedAmount", "percent"]
    value: float


class DebtItemInput(BaseModel):
    type: str
    balance: float
    minPaymentMonthly: float
    apr: Optional[float] = None


class DebtsInput(BaseModel):
    enabled: bool
    items: List[DebtItemInput]
    payoffGoal: Optional[Literal["ASAP", "6mo", "12mo", "24mo", "customDate"]] = None
    payoffGoalDate: Optional[str] = None


class BudgetRequest(BaseModel):
    currency: str = "CAD"
    today: Optional[str] = None
    balance_now: float = 0.0
    income: IncomeInput
    fixedExpenses: List[FixedExpenseInput] = []
    subscriptions: List[SubscriptionInput] = []
    flexibleCaps: FlexibleCapsInput = FlexibleCapsInput()
    savings: SavingsInput = SavingsInput(enabled=False, mode="fixedAmount", value=0.0)
    debts: DebtsInput = DebtsInput(enabled=False, items=[])


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "BudgetPilot Calculation API", "version": "1.0.0"}


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/calculate", response_model=Dict[str, Any])
def calculate_budget(request: BudgetRequest):
    """
    Calculate budget metrics from input data.
    
    Returns:
        Budget calculation results including:
        - feasible: Whether the plan is feasible
        - income_monthly: Monthly income
        - totals: Monthly expense totals
        - safe_to_spend_until_payday: Safe to spend until next payday
        - safe_to_spend_today: Safe to spend per day
        - warnings: List of warnings
        - suggestions: List of optimization suggestions
    """
    try:
        # Convert Pydantic models to BudgetInput
        input_dict = request.dict()
        
        # Convert to BudgetInput schema
        budget_input = BudgetInput.from_dict(input_dict)
        
        # Calculate
        result = calculate(budget_input)
        
        # Return as dictionary
        return result.to_dict()
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
