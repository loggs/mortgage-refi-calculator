import Finance from "financejs";

const finance = new Finance();

const payment = (P, I, N, Q) => {
  return P * (I / Q / (1 - (1 + I / Q) ** -N));
};

export const cumulativeInterest = (P, I, N, B, E) => {
  const Q = 12;
  const M = payment(P, I, N, Q);
  return (
    roundMoney(
      (P - (M * Q) / I) * (1 + I / Q) ** (B - 1) +
        (M * Q) / I -
        ((P - (M * Q) / I) * (1 + I / Q) ** E + (M * Q) / I) -
        M * (E - B + 1),
    ) || ""
  );
};

export const nper = (rate, payment, present) => {
  const num = payment;
  const den = present * rate + payment;
  return roundMoney(Math.log(num / den) / Math.log(1 + rate)) || "";
};

export const roundMoney = money => {
  return Math.round(money * 100) / 100;
};

export const minimumPayment = (inputs, refi) => {
  const op = toFloatSafe(
    refi ? newPrincipal(inputs) : inputs.originalPrincipal,
  );
  const rate = toFloatSafe(refi ? inputs.newRate : inputs.originalRate);
  const term = toFloatSafe(refi ? inputs.newTerm : inputs.originalTerm);
  const pmi = toFloatSafe(refi ? inputs.newPMI : inputs.originalPMI);
  return (
    roundMoney(
      finance.AM(op, rate, term, 1) +
        (op >= toFloatSafe(inputs.appraisal) * 0.8 ? pmi / 12 : 0),
    ) || ""
  );
};

export const toFloatSafe = n => parseFloat(n) || 0;

export const newPrincipal = ({ currentBalance, cashOut, closingCosts }) => {
  return (
    toFloatSafe(currentBalance) +
    toFloatSafe(cashOut) +
    toFloatSafe(closingCosts)
  );
};

export const generateAmortizationTable = (
  appraisal,
  balance,
  rate,
  payment,
  pmi,
  maxTerm,
) => {
  let table = [];
  let cb = balance;
  let interest = 0;
  let pay = payment;
  let ppmt = 0;
  let pmipmt = 0;
  const maxMonths = Math.min(
    Math.ceil(
      nper(
        rate / 12,
        payment - (balance >= 0.8 * appraisal ? pmi / 12 : 0),
        -balance,
      ),
    ),
    maxTerm,
  );
  for (let i = 0; i < maxMonths; i++) {
    interest = roundMoney((cb * rate) / 12);
    pmipmt = roundMoney(cb >= 0.8 * appraisal ? pmi / 12 : 0);
    pay = roundMoney(
      Math.min(
        payment -
          (cb >= 0.8 * appraisal || balance < 0.8 * appraisal ? 0 : pmi / 12),
        cb + interest,
      ),
    );
    ppmt = roundMoney(pay - interest - pmipmt);
    table.push({ month: i + 1, cb, interest, pay, pmipmt, ppmt });
    cb = roundMoney(cb - ppmt);
  }

  return table;
};

export const generateAllAmortizationTables = inputs => {
  const cm = generateAmortizationTable(
    toFloatSafe(inputs.appraisal),
    toFloatSafe(inputs.currentBalance),
    toFloatSafe(inputs.originalRate) / 100,
    toFloatSafe(minimumPayment(inputs)),
    toFloatSafe(inputs.originalPMI),
    toFloatSafe(inputs.originalTerm),
  );

  const cmwa = generateAmortizationTable(
    toFloatSafe(inputs.appraisal),
    toFloatSafe(inputs.currentBalance),
    toFloatSafe(inputs.originalRate) / 100,
    toFloatSafe(inputs.currentPayment),
    toFloatSafe(inputs.originalPMI),
    toFloatSafe(inputs.originalTerm),
  );

  const np = newPrincipal(inputs);
  const refimp = minimumPayment(inputs, true);
  const refiwapmt = Math.max(refimp, toFloatSafe(inputs.currentPayment));

  const refi = generateAmortizationTable(
    toFloatSafe(inputs.appraisal),
    toFloatSafe(np),
    toFloatSafe(inputs.newRate) / 100,
    toFloatSafe(refimp),
    toFloatSafe(inputs.newPMI),
    toFloatSafe(inputs.newTerm),
  );

  const refiwa = generateAmortizationTable(
    toFloatSafe(inputs.appraisal),
    toFloatSafe(np),
    toFloatSafe(inputs.newRate) / 100,
    toFloatSafe(refiwapmt),
    toFloatSafe(inputs.newPMI),
    toFloatSafe(inputs.newTerm),
  );

  return { cm, cmwa, refi, refiwa };
};
