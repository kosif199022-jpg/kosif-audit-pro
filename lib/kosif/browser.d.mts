export interface Money {
  minor: bigint;
  exp?: number;
  ok?: boolean;
}

export interface MoneyLine {
  label: string;
  minor: bigint;
}

export interface TrialBalanceRow {
  line: number;
  code: string;
  name: string;
  type: string;
  classifiedBy: string;
  debit: bigint;
  credit: bigint;
  opening: bigint;
  net: bigint;
}

export interface TrialBalance {
  ok: boolean;
  exp: number;
  delimiter: string;
  columns: Record<string, number>;
  hasHeader: boolean;
  rows: TrialBalanceRow[];
  totals: { debit: bigint; credit: bigint };
  difference: bigint;
  balanced: boolean;
  unclassified: number;
  errors: Array<{ code?: string; message?: string; line?: number }>;
}

export interface TypeSummary {
  type: string;
  label: string;
  count: number;
  debit: bigint;
  credit: bigint;
  net: bigint;
}

export interface StatementLine {
  key: string;
  label: string;
  statement: string;
  group: string;
  minor: bigint;
  accounts: Array<{ code: string; name: string; minor: bigint }>;
}

export interface Statements {
  version: string;
  exp: number;
  lines: StatementLine[];
  unmapped: TrialBalanceRow[];
  position: {
    currentAssets: MoneyLine;
    nonCurrentAssets: MoneyLine;
    totalAssets: MoneyLine;
    currentLiabilities: MoneyLine;
    nonCurrentLiabilities: MoneyLine;
    totalLiabilities: MoneyLine;
    contributedEquity: MoneyLine;
    resultForPeriod: MoneyLine;
    totalEquity: MoneyLine;
  };
  income: {
    revenue: MoneyLine;
    cogs: MoneyLine;
    grossProfit: MoneyLine;
    operatingExpenses: MoneyLine;
    operatingProfit: MoneyLine;
    financeCosts: MoneyLine;
    netProfit: MoneyLine;
  };
  components: Record<string, bigint>;
  articulation: { balanceCheckMinor: bigint; articulated: boolean; note: string };
  standard: string;
}

export interface PipelineAnalysis {
  ratios: {
    liquidity: { currentRatio: number; quickRatio: number; cashRatio: number };
    profitability: {
      grossMarginPct: number;
      netMarginPct: number;
      roaPct: number;
      roePct: number;
    };
    leverage: { debtToEquity: number; debtToAssets: number; equityRatio: number };
    efficiency: { receivablesTurnover: number; inventoryTurnover: number };
  };
  materiality: {
    ok: boolean;
    basis: string;
    basisLabel: string;
    riskProfile: string;
    overall: Money;
    performance: Money;
    clearlyTrivial: Money;
  };
  risk: { index: number; band: string; bandLabel: string };
  solvency: { ok: boolean; z: number; zone: string; model: string };
}

export interface PipelineResult {
  version: string;
  source: string;
  company: Record<string, string>;
  trialBalance: TrialBalance;
  byType: TypeSummary[];
  largest: TrialBalanceRow[];
  statements: Statements;
  analysis: PipelineAnalysis;
  findings: Array<Record<string, unknown>>;
  sample: unknown;
  misstatements: unknown;
  aging: unknown;
  reliance: {
    canRely: boolean;
    blockers: string[];
    rule: string;
  };
}

export const KOSIF_ENGINE_VERSION: string;
export const KOSIF_ENGINE_SOURCE: string;
export const DEMO_TRIAL_BALANCE: string;
export const DEMO_COMPANY: Record<string, string>;
export function runPipeline(
  trialBalanceText: string,
  options?: Record<string, unknown>,
): PipelineResult;
export function runDemo(options?: Record<string, unknown>): PipelineResult;
export function formatMinor(
  minor: bigint,
  options?: Record<string, unknown>,
): string;
export function compactMinor(
  minor: bigint,
  options?: Record<string, unknown>,
): string;
export function formatNumber(value: number, decimals?: number): string;
