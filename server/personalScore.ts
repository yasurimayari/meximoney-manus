export type PersonalScoreInput = {
  netWorthCents: number;
  creditCardBalanceCents: number;
  creditLimitCents: number;
  creditScore: number | null;
  emergencyFundCents: number;
  incomeCents: number;
  expenseCents: number;
  recentTransactionCount: number;
  habitsOptIn?: boolean;
  principalPaidLast30DaysCents: number;
  outstandingDebtCents: number;
};

export type PersonalScore = {
  totalScore: number;
  level: "Crisis" | "Sobreviviendo" | "Estable" | "Construyendo" | "Próspera";
  factors: {
    netWorthPoints: number;
    creditUtilizationPoints: number;
    creditScorePoints: number;
    emergencyFundPoints: number;
    cashFlowPoints: number;
    habitPoints: number;
    debtPaymentPoints: number;
  };
  dataGaps: string[];
  creditUtilizationRatio: number | null;
  debtPaymentRatio: number | null;
};

function netWorthPoints(netWorthCents: number) {
  if (netWorthCents <= 0) return 0;
  if (netWorthCents < 100_000_00) return 50;
  if (netWorthCents < 300_000_00) return 100;
  if (netWorthCents < 600_000_00) return 150;
  return 200;
}

function creditUtilizationPoints(balanceCents: number, limitCents: number) {
  if (limitCents <= 0) return { points: 0, ratio: null as number | null };
  const ratio = Math.max(0, balanceCents) / limitCents;
  if (ratio > 1) return { points: 0, ratio };
  if (ratio >= 0.7) return { points: 50, ratio };
  if (ratio >= 0.5) return { points: 100, ratio };
  if (ratio >= 0.3) return { points: 150, ratio };
  return { points: 200, ratio };
}

function creditScorePoints(creditScore: number | null) {
  if (creditScore === null) return 0;
  if (creditScore < 600) return 0;
  if (creditScore < 650) return 50;
  if (creditScore < 700) return 100;
  if (creditScore < 720) return 130;
  return 150;
}

function debtPaymentPoints(principalPaidCents: number, outstandingDebtCents: number) {
  if (outstandingDebtCents <= 0) return { points: 0, ratio: null as number | null };
  const ratio = Math.max(0, principalPaidCents) / outstandingDebtCents;
  if (ratio === 0) return { points: 0, ratio };
  if (ratio < 0.005) return { points: 25, ratio };
  if (ratio < 0.01) return { points: 50, ratio };
  if (ratio < 0.02) return { points: 75, ratio };
  return { points: 100, ratio };
}

export function personalScoreLevel(totalScore: number): PersonalScore["level"] {
  if (totalScore < 250) return "Crisis";
  if (totalScore < 500) return "Sobreviviendo";
  if (totalScore < 700) return "Estable";
  if (totalScore < 850) return "Construyendo";
  return "Próspera";
}

export function calculatePersonalScore(input: PersonalScoreInput): PersonalScore {
  const utilization = creditUtilizationPoints(input.creditCardBalanceCents, input.creditLimitCents);
  const payment = debtPaymentPoints(input.principalPaidLast30DaysCents, input.outstandingDebtCents);
  const factors = {
    netWorthPoints: netWorthPoints(input.netWorthCents),
    creditUtilizationPoints: utilization.points,
    creditScorePoints: creditScorePoints(input.creditScore),
    emergencyFundPoints: Math.min(150, Math.max(0, Math.round((input.emergencyFundCents / 60_000_00) * 150))),
    cashFlowPoints: input.incomeCents > 0 && input.incomeCents > input.expenseCents ? 100 : 0,
    habitPoints: input.habitsOptIn === true && input.recentTransactionCount > 0 ? 100 : 0,
    debtPaymentPoints: payment.points,
  };
  const totalScore = Object.values(factors).reduce((total, points) => total + points, 0);
  const dataGaps: string[] = [];
  if (input.creditScore === null) dataGaps.push("Agrega tu score crediticio manual para completar este factor.");
  if (utilization.ratio === null) dataGaps.push("Registra el límite y saldo de al menos una tarjeta para calcular la utilización.");
  if (input.emergencyFundCents <= 0) dataGaps.push("Actualiza tu objetivo o posición del fondo de emergencia para medir este factor.");
  return { totalScore, level: personalScoreLevel(totalScore), factors, dataGaps, creditUtilizationRatio: utilization.ratio, debtPaymentRatio: payment.ratio };
}
