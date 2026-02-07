import * as SQLite from 'expo-sqlite';

export type PayFrequency = 'biweekly' | 'monthly';

export interface IncomeData {
  payFrequency: PayFrequency;
  netPayAmount: number;
  /** Kept for backward compatibility; next pay date is computed from pay days when available */
  nextPayDate: string;
  /** Day of month (1–31) for monthly pay. Used to compute next pay date each month. */
  payDayOfMonth?: number;
  /** First pay day of month (1–31) for biweekly. */
  biweeklyPayDay1?: number;
  /** Second pay day of month (1–31) for biweekly. */
  biweeklyPayDay2?: number;
  irregularIncomeEnabled: boolean;
  irregularMonthlyAvg?: number;
  irregularReliability?: 'low' | 'medium' | 'high';
}

/**
 * Get the last day of the month for a given date.
 */
function getLastDayOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Clamp day to the last day of the month (e.g. 31 → 28 in February).
 */
function clampToMonth(year: number, month: number, day: number): number {
  const last = new Date(year, month + 1, 0).getDate();
  return Math.min(day, last);
}

/**
 * Compute the next pay date from stored pay-day settings.
 * For monthly: next occurrence of payDayOfMonth (rolls to next month automatically).
 * For biweekly: next occurrence of either biweeklyPayDay1 or biweeklyPayDay2.
 */
export function getNextPayDateFromIncome(income: IncomeData): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = today.getFullYear();
  const m = today.getMonth();

  if (income.payFrequency === 'monthly' && income.payDayOfMonth != null) {
    const day = clampToMonth(y, m, income.payDayOfMonth);
    const thisMonth = new Date(y, m, day);
    thisMonth.setHours(0, 0, 0, 0);
    if (thisMonth >= today) return thisMonth;
    const nextMonth = new Date(y, m + 1, clampToMonth(y, m + 1, income.payDayOfMonth));
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }

  if (
    income.payFrequency === 'biweekly' &&
    income.biweeklyPayDay1 != null &&
    income.biweeklyPayDay2 != null
  ) {
    const d1 = income.biweeklyPayDay1;
    const d2 = income.biweeklyPayDay2;
    const lastThis = getLastDayOfMonth(today);
    const candidates: Date[] = [
      new Date(y, m, clampToMonth(y, m, d1)),
      new Date(y, m, clampToMonth(y, m, d2)),
    ];
    candidates.sort((a, b) => a.getTime() - b.getTime());
    for (const c of candidates) {
      c.setHours(0, 0, 0, 0);
      if (c >= today) return c;
    }
    const nextMonth = new Date(y, m + 1, 0);
    const lastNext = nextMonth.getDate();
    const nextCandidates: Date[] = [
      new Date(y, m + 1, clampToMonth(y, m + 1, d1)),
      new Date(y, m + 1, clampToMonth(y, m + 1, d2)),
    ];
    nextCandidates.sort((a, b) => a.getTime() - b.getTime());
    nextCandidates[0].setHours(0, 0, 0, 0);
    return nextCandidates[0];
  }

  if (income.nextPayDate) {
    const fallback = new Date(income.nextPayDate);
    fallback.setHours(0, 0, 0, 0);
    if (fallback >= today) return fallback;
    if (income.payFrequency === 'monthly' && income.payDayOfMonth != null) {
      return getNextPayDateFromIncome(income);
    }
  }
  return today;
}

export interface FixedExpense {
  id?: number;
  name: string;
  amountMonthly: number;
  enabled: boolean;
}

export interface Subscription {
  id?: number;
  name: string;
  amountMonthly: number;
}

export interface FlexibleSpending {
  eatingOut: number;
  entertainment: number;
  shopping: number;
  miscBuffer: number;
}

export interface SavingsGoal {
  enabled: boolean;
  savingsType?: 'Emergency' | 'Goal' | 'Both';
  savingsMode?: 'fixedAmount' | 'percent';
  savingsValue?: number;
  goalName?: string;
}

export interface Debt {
  id?: number;
  debtType: 'Credit Card' | 'Student Loan' | 'Car Loan' | 'Personal Loan' | 'Other';
  balance: number;
  minPaymentMonthly: number;
  dueDayOfMonth?: number;
  payoffGoal?: 'ASAP' | '6mo' | '12mo' | '24mo' | 'customDate';
  customPayoffDate?: string; // ISO date string
}

export interface OnboardingData {
  completed: boolean;
  income?: IncomeData;
  fixedExpenses?: FixedExpense[];
  subscriptions?: Subscription[];
  flexibleSpending?: FlexibleSpending;
  savings?: SavingsGoal;
  debts?: Debt[];
  notificationsEnabled?: boolean;
  notificationTime?: string; // HH:mm format
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('budgetpilot.db');
  
  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS onboarding_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pay_frequency TEXT NOT NULL,
      net_pay_amount REAL NOT NULL,
      next_pay_date TEXT NOT NULL,
      irregular_income_enabled INTEGER DEFAULT 0,
      irregular_monthly_avg REAL,
      irregular_reliability TEXT
    );

    CREATE TABLE IF NOT EXISTS fixed_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount_monthly REAL NOT NULL,
      enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount_monthly REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flexible_spending (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eating_out REAL DEFAULT 0,
      entertainment REAL DEFAULT 0,
      shopping REAL DEFAULT 0,
      misc_buffer REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 0,
      savings_type TEXT,
      savings_mode TEXT,
      savings_value REAL,
      goal_name TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_type TEXT NOT NULL,
      balance REAL NOT NULL,
      min_payment_monthly REAL NOT NULL,
      due_day_of_month INTEGER,
      payoff_goal TEXT,
      custom_payoff_date TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 0,
      notification_time TEXT
    );
  `);

  // Migrate income table: add pay-day columns if missing
  try {
    await db.execAsync('ALTER TABLE income ADD COLUMN pay_day_of_month INTEGER');
  } catch {
    /* column already exists */
  }
  try {
    await db.execAsync('ALTER TABLE income ADD COLUMN biweekly_pay_day_1 INTEGER');
  } catch {
    /* column already exists */
  }
  try {
    await db.execAsync('ALTER TABLE income ADD COLUMN biweekly_pay_day_2 INTEGER');
  } catch {
    /* column already exists */
  }

  return db;
}

export async function getOnboardingStatus(): Promise<boolean> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<{ completed: number }>(
    'SELECT completed FROM onboarding_status LIMIT 1'
  );
  return result?.completed === 1;
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO onboarding_status (id, completed) VALUES (1, ?)',
    [completed ? 1 : 0]
  );
}

export async function saveIncomeData(data: IncomeData): Promise<void> {
  const database = await initDatabase();
  const nextPayDateIso = data.nextPayDate || getNextPayDateFromIncome(data).toISOString();
  await database.runAsync('DELETE FROM income');
  await database.runAsync(
    `INSERT INTO income (
      pay_frequency, net_pay_amount, next_pay_date,
      irregular_income_enabled, irregular_monthly_avg, irregular_reliability,
      pay_day_of_month, biweekly_pay_day_1, biweekly_pay_day_2
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.payFrequency,
      data.netPayAmount,
      nextPayDateIso,
      data.irregularIncomeEnabled ? 1 : 0,
      data.irregularMonthlyAvg ?? null,
      data.irregularReliability ?? null,
      data.payDayOfMonth ?? null,
      data.biweeklyPayDay1 ?? null,
      data.biweeklyPayDay2 ?? null,
    ]
  );
}

export async function getIncomeData(): Promise<IncomeData | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<{
    pay_frequency: string;
    net_pay_amount: number;
    next_pay_date: string;
    irregular_income_enabled: number;
    irregular_monthly_avg: number | null;
    irregular_reliability: string | null;
    pay_day_of_month: number | null;
    biweekly_pay_day_1: number | null;
    biweekly_pay_day_2: number | null;
  }>('SELECT * FROM income LIMIT 1');

  if (!result) return null;

  const payFrequency = result.pay_frequency === 'weekly' ? 'monthly' : (result.pay_frequency as PayFrequency);
  return {
    payFrequency,
    netPayAmount: result.net_pay_amount,
    nextPayDate: result.next_pay_date || '',
    payDayOfMonth: result.pay_day_of_month ?? undefined,
    biweeklyPayDay1: result.biweekly_pay_day_1 ?? undefined,
    biweeklyPayDay2: result.biweekly_pay_day_2 ?? undefined,
    irregularIncomeEnabled: result.irregular_income_enabled === 1,
    irregularMonthlyAvg: result.irregular_monthly_avg ?? undefined,
    irregularReliability: (result.irregular_reliability as 'low' | 'medium' | 'high') ?? undefined,
  };
}

export async function saveFixedExpenses(expenses: FixedExpense[]): Promise<void> {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM fixed_expenses');
  
  for (const expense of expenses) {
    await database.runAsync(
      'INSERT INTO fixed_expenses (name, amount_monthly, enabled) VALUES (?, ?, ?)',
      [expense.name, expense.amountMonthly, expense.enabled ? 1 : 0]
    );
  }
}

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  const database = await initDatabase();
  const results = await database.getAllAsync<{
    id: number;
    name: string;
    amount_monthly: number;
    enabled: number;
  }>('SELECT * FROM fixed_expenses');

  return results.map(r => ({
    id: r.id,
    name: r.name,
    amountMonthly: r.amount_monthly,
    enabled: r.enabled === 1,
  }));
}

export async function saveSubscriptions(subscriptions: Subscription[]): Promise<void> {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM subscriptions');
  
  for (const sub of subscriptions) {
    await database.runAsync(
      'INSERT INTO subscriptions (name, amount_monthly) VALUES (?, ?)',
      [sub.name, sub.amountMonthly]
    );
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const database = await initDatabase();
  const results = await database.getAllAsync<{
    id: number;
    name: string;
    amount_monthly: number;
  }>('SELECT * FROM subscriptions');

  return results.map(r => ({
    id: r.id,
    name: r.name,
    amountMonthly: r.amount_monthly,
  }));
}

export async function saveFlexibleSpending(data: FlexibleSpending): Promise<void> {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM flexible_spending');
  await database.runAsync(
    'INSERT INTO flexible_spending (eating_out, entertainment, shopping, misc_buffer) VALUES (?, ?, ?, ?)',
    [data.eatingOut, data.entertainment, data.shopping, data.miscBuffer]
  );
}

export async function getFlexibleSpending(): Promise<FlexibleSpending | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<{
    eating_out: number;
    entertainment: number;
    shopping: number;
    misc_buffer: number;
  }>('SELECT * FROM flexible_spending LIMIT 1');

  if (!result) return null;

  return {
    eatingOut: result.eating_out,
    entertainment: result.entertainment,
    shopping: result.shopping,
    miscBuffer: result.misc_buffer,
  };
}

export async function saveSavingsGoal(data: SavingsGoal): Promise<void> {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM savings');
  await database.runAsync(
    `INSERT INTO savings (enabled, savings_type, savings_mode, savings_value, goal_name)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.enabled ? 1 : 0,
      data.savingsType || null,
      data.savingsMode || null,
      data.savingsValue || null,
      data.goalName || null,
    ]
  );
}

export async function getSavingsGoal(): Promise<SavingsGoal | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<{
    enabled: number;
    savings_type: string | null;
    savings_mode: string | null;
    savings_value: number | null;
    goal_name: string | null;
  }>('SELECT * FROM savings LIMIT 1');

  if (!result) return null;

  return {
    enabled: result.enabled === 1,
    savingsType: (result.savings_type as 'Emergency' | 'Goal' | 'Both') || undefined,
    savingsMode: (result.savings_mode as 'fixedAmount' | 'percent') || undefined,
    savingsValue: result.savings_value || undefined,
    goalName: result.goal_name || undefined,
  };
}

export async function saveDebts(debts: Debt[]): Promise<void> {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM debts');
  
  for (const debt of debts) {
    await database.runAsync(
      `INSERT INTO debts (
        debt_type, balance, min_payment_monthly, due_day_of_month,
        payoff_goal, custom_payoff_date
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        debt.debtType,
        debt.balance,
        debt.minPaymentMonthly,
        debt.dueDayOfMonth || null,
        debt.payoffGoal || null,
        debt.customPayoffDate || null,
      ]
    );
  }
}

export async function getDebts(): Promise<Debt[]> {
  const database = await initDatabase();
  const results = await database.getAllAsync<{
    id: number;
    debt_type: string;
    balance: number;
    min_payment_monthly: number;
    due_day_of_month: number | null;
    payoff_goal: string | null;
    custom_payoff_date: string | null;
  }>('SELECT * FROM debts');

  return results.map(r => ({
    id: r.id,
    debtType: r.debt_type as Debt['debtType'],
    balance: r.balance,
    minPaymentMonthly: r.min_payment_monthly,
    dueDayOfMonth: r.due_day_of_month || undefined,
    payoffGoal: (r.payoff_goal as Debt['payoffGoal']) || undefined,
    customPayoffDate: r.custom_payoff_date || undefined,
  }));
}

export async function saveNotifications(enabled: boolean, time?: string): Promise<void> {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM notifications');
  await database.runAsync(
    'INSERT INTO notifications (enabled, notification_time) VALUES (?, ?)',
    [enabled ? 1 : 0, time || null]
  );
}

export async function getNotifications(): Promise<{ enabled: boolean; notificationTime?: string } | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<{
    enabled: number;
    notification_time: string | null;
  }>('SELECT * FROM notifications LIMIT 1');

  if (!result) return null;

  return {
    enabled: result.enabled === 1,
    notificationTime: result.notification_time || undefined,
  };
}

export async function getAllOnboardingData(): Promise<OnboardingData> {
  const [completed, income, fixedExpenses, subscriptions, flexibleSpending, savings, debts, notifications] = await Promise.all([
    getOnboardingStatus(),
    getIncomeData(),
    getFixedExpenses(),
    getSubscriptions(),
    getFlexibleSpending(),
    getSavingsGoal(),
    getDebts(),
    getNotifications(),
  ]);

  return {
    completed,
    income: income || undefined,
    fixedExpenses: fixedExpenses.length > 0 ? fixedExpenses : undefined,
    subscriptions: subscriptions.length > 0 ? subscriptions : undefined,
    flexibleSpending: flexibleSpending || undefined,
    savings: savings || undefined,
    debts: debts.length > 0 ? debts : undefined,
    notificationsEnabled: notifications?.enabled,
    notificationTime: notifications?.notificationTime,
  };
}
