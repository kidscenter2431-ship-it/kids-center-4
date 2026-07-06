import { ExamConfig, MathQuestion } from '../types';

// Helper to get random number in range
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random number with a specific number of digits
function generateNumberByDigits(digits: number, minVal: number, maxVal: number): number {
  if (digits <= 1) {
    return getRandomInt(Math.max(0, minVal), Math.min(9, maxVal));
  }
  const min = Math.max(Math.pow(10, digits - 1), minVal);
  const max = Math.min(Math.pow(10, digits) - 1, maxVal);
  return getRandomInt(min, max);
}

// Ensure no-carry addition digit-by-digit
function generateNoCarryAddend(runningSum: number, digits: number): number {
  const sumDigits = String(runningSum).split('').reverse().map(Number);
  const addendDigits: number[] = [];

  for (let i = 0; i < digits; i++) {
    const sumDigit = sumDigits[i] || 0;
    const maxDigit = 9 - sumDigit;
    let d = getRandomInt(0, maxDigit);
    if (i === digits - 1 && digits > 1 && d === 0) {
      d = getRandomInt(1, Math.max(1, maxDigit));
    }
    addendDigits.push(d);
  }

  return parseInt(addendDigits.reverse().join(''), 10);
}

// Ensure no-borrow subtraction digit-by-digit
function generateNoBorrowSubtrahend(minuend: number, digits: number): number {
  const minuendDigits = String(minuend).split('').reverse().map(Number);
  const subtrahendDigits: number[] = [];

  for (let i = 0; i < digits; i++) {
    const mDigit = minuendDigits[i] || 0;
    // For subtrahend, the digit must be <= minuend digit so no borrowing is needed
    let d = getRandomInt(0, mDigit);
    subtrahendDigits.push(d);
  }

  let result = parseInt(subtrahendDigits.reverse().join(''), 10);
  // Ensure subtrahend is not greater than minuend
  if (result > minuend) {
    result = minuend;
  }
  return result;
}

export function generateQuestions(config: ExamConfig): MathQuestion[] {
  const questions: MathQuestion[] = [];
  let idCounter = 1;

  // 1. ADDITION
  if (config.addition.enabled && config.addition.numQuestions > 0) {
    for (let q = 0; q < config.addition.numQuestions; q++) {
      const termsCount = config.addition.termsCount;
      const terms: number[] = [];
      const carryEnabled = config.addition.carryEnabled;
      const digits = config.addition.digits;
      const minVal = config.addition.minVal;
      const maxVal = config.addition.maxVal;

      // Start with first term
      let firstTerm = generateNumberByDigits(digits, minVal, maxVal);
      if (firstTerm === 0 && digits > 1) {
        firstTerm = generateNumberByDigits(digits, minVal, maxVal);
      }
      terms.push(firstTerm);

      // We want to place exactly ONE subtraction term somewhere from index 1 to termsCount-1.
      // Let's decide which index will be the subtraction index.
      // (must not be first, so 1 <= subIndex < termsCount)
      const subIndex = termsCount > 1 ? getRandomInt(1, termsCount - 1) : -1;

      let runningSum = firstTerm;

      for (let i = 1; i < termsCount; i++) {
        if (i === subIndex) {
          // This is a subtraction term. It must be strictly smaller than the previous term (terms[i-1])
          // so intermediate calculation is always valid, and cannot be first term.
          const prevTerm = terms[i - 1];
          let subValue = 0;
          if (prevTerm <= 1) {
            subValue = 0; // cannot subtract safely
          } else {
            subValue = getRandomInt(1, prevTerm - 1);
          }
          terms.push(-subValue);
          runningSum -= subValue;
        } else {
          // Addition term
          let addValue = 0;
          if (!carryEnabled) {
            addValue = generateNoCarryAddend(runningSum, digits);
          } else {
            addValue = generateNumberByDigits(digits, minVal, maxVal);
          }
          terms.push(addValue);
          runningSum += addValue;
        }
      }

      // Display format: e.g., "54 23 16 -9 42" (no plus signs, keep only minus sign)
      const displayParts = terms.map((t, idx) => {
        if (t < 0) {
          return `${t}`; // contains minus sign
        }
        return `${t}`;
      });

      questions.push({
        id: `add_${idCounter++}`,
        expression: terms.map(t => (t < 0 ? `${t}` : `+${t}`)).join(' ').substring(1), // raw standard formula
        displayExpression: displayParts.join(' '), // spaces, hidden plus signs
        answer: runningSum,
        points: config.general.pointsPerQuestion,
        category: 'addition'
      });
    }
  }

  // 2. SUBTRACTION
  if (config.subtraction.enabled && config.subtraction.numQuestions > 0) {
    for (let q = 0; q < config.subtraction.numQuestions; q++) {
      const digits = config.subtraction.digits;
      const borrowEnabled = config.subtraction.borrowEnabled;
      const alwaysPositive = config.subtraction.alwaysPositive;

      let term1 = generateNumberByDigits(digits, 1, Math.pow(10, digits) - 1);
      let term2 = 0;

      if (!borrowEnabled) {
        term2 = generateNoBorrowSubtrahend(term1, digits);
      } else {
        term2 = generateNumberByDigits(digits, 1, Math.pow(10, digits) - 1);
        if (alwaysPositive && term2 > term1) {
          const temp = term1;
          term1 = term2;
          term2 = temp;
        }
      }

      questions.push({
        id: `sub_${idCounter++}`,
        expression: `${term1} - ${term2}`,
        displayExpression: `${term1} - ${term2}`,
        answer: term1 - term2,
        points: config.general.pointsPerQuestion,
        category: 'subtraction'
      });
    }
  }

  // 3. MULTIPLICATION
  if (config.multiplication.enabled && config.multiplication.numQuestions > 0) {
    for (let q = 0; q < config.multiplication.numQuestions; q++) {
      const configMult = config.multiplication;
      const digits1 = configMult.digits1 || 2;
      const digits2 = configMult.digits2 || 1;

      const term1 = generateNumberByDigits(digits1, 1, Math.pow(10, digits1) - 1);
      const term2 = generateNumberByDigits(digits2, 1, Math.pow(10, digits2) - 1);

      questions.push({
        id: `mult_${idCounter++}`,
        expression: `${term1} × ${term2}`,
        displayExpression: `${term1} × ${term2}`,
        answer: term1 * term2,
        points: config.general.pointsPerQuestion,
        category: 'multiplication'
      });
    }
  }

  // 4. DIVISION
  if (config.division.enabled && config.division.numQuestions > 0) {
    for (let q = 0; q < config.division.numQuestions; q++) {
      const divConfig = config.division;
      const dividendDigits = divConfig.dividendDigits || 2;
      const divisorDigits = divConfig.divisorDigits || 1;
      const exactOnly = divConfig.exactOnly;
      const allowRemainder = divConfig.allowRemainder;

      // Divisor must have exactly divisorDigits, and be >= 2 for divisorDigits = 1 to prevent division by 0 or 1.
      const minDiv = divisorDigits === 1 ? 2 : Math.pow(10, divisorDigits - 1);
      const maxDiv = Math.pow(10, divisorDigits) - 1;
      const divisor = getRandomInt(minDiv, maxDiv);

      // We want dividend to have exactly dividendDigits.
      // dividend = divisor * quotient + remainder
      // To keep dividend exactly dividendDigits:
      // Minimum dividend = 10^(dividendDigits - 1)
      // Maximum dividend = 10^(dividendDigits) - 1
      const minQuotient = Math.max(1, Math.ceil(Math.pow(10, dividendDigits - 1) / divisor));
      const maxQuotient = Math.max(1, Math.floor((Math.pow(10, dividendDigits) - 1) / divisor));

      let quotient = 1;
      if (maxQuotient >= minQuotient) {
        quotient = getRandomInt(minQuotient, maxQuotient);
      } else {
        quotient = minQuotient;
      }

      let dividend = divisor * quotient;
      let remainder = 0;

      if (!exactOnly && allowRemainder && divisor > 1) {
        remainder = getRandomInt(0, divisor - 1);
        const maxDividend = Math.pow(10, dividendDigits) - 1;
        if (dividend + remainder <= maxDividend) {
          dividend += remainder;
        } else {
          remainder = 0;
        }
      }

      // If user types answer, what is the answer?
      // In free-text math with remainders, usually they type the quotient, or we ask for the quotient.
      questions.push({
        id: `div_${idCounter++}`,
        expression: `${dividend} ÷ ${divisor}`,
        displayExpression: remainder > 0 ? `${dividend} ÷ ${divisor} (Find quotient)` : `${dividend} ÷ ${divisor}`,
        answer: quotient,
        remainder: remainder > 0 ? remainder : undefined,
        points: config.general.pointsPerQuestion,
        category: 'division'
      });
    }
  }

  // Trim or randomize order if requested
  let finalQuestions = questions;
  if (config.general.randomOrder) {
    finalQuestions = [...questions].sort(() => Math.random() - 0.5);
  }

  // Limit total questions to the general config
  if (config.general.totalQuestions > 0 && finalQuestions.length > config.general.totalQuestions) {
    finalQuestions = finalQuestions.slice(0, config.general.totalQuestions);
  }

  return finalQuestions;
}
