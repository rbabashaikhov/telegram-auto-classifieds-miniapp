export interface MortgageInput {
  price: number;
  downPayment: number;
  annualRatePercent: number;
  termYears: number;
}

export interface MortgageResult {
  price: number;
  downPayment: number;
  loanAmount: number;
  annualRatePercent: number;
  termYears: number;
  monthlyPayment: number;
  totalPayment: number;
  overpayment: number;
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const price = Math.max(0, input.price);
  const downPayment = Math.min(Math.max(0, input.downPayment), price);
  const loanAmount = Math.max(0, price - downPayment);
  const termYears = Math.max(1, input.termYears);
  const months = termYears * 12;
  const annualRatePercent = Math.max(0, input.annualRatePercent);
  const monthlyRate = annualRatePercent / 100 / 12;

  let monthlyPayment = 0;
  if (loanAmount === 0) {
    monthlyPayment = 0;
  } else if (monthlyRate === 0) {
    monthlyPayment = loanAmount / months;
  } else {
    const factor = Math.pow(1 + monthlyRate, months);
    monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  const roundedMonthly = Math.round(monthlyPayment);
  const totalPayment = roundedMonthly * months;
  return {
    price,
    downPayment,
    loanAmount,
    annualRatePercent,
    termYears,
    monthlyPayment: roundedMonthly,
    totalPayment,
    overpayment: Math.max(0, totalPayment - loanAmount),
  };
}
