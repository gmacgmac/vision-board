// The calculator's tools. One file that imports nothing, so the hash the person allows covers all
// of the app's code (apps.md, "The tools module"). The parser reads the sum one character at a
// time: no eval, no Function, nothing matched against the input with a pattern.

const MAX_LENGTH = 200;
const MAX_BRACKETS = 32;
const KEEP = 20;
const DIGITS = 12;

const OPERATORS = { '+': '+', '-': '-', '−': '-', '*': '*', '×': '*', '/': '/', '÷': '/' };

const fail = (message) => {
  throw new Error(message);
};
const finite = (value) => (Number.isFinite(value) ? value : fail('Number too big'));
const isDigit = (c) => c >= '0' && c <= '9';
const shorten = (text) => (text.length > 20 ? `${text.slice(0, 20)}…` : text);

/** The sum as a list of numbers and one-character strings (+ - * / ( ) %). */
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
    } else if (isDigit(c) || c === '.') {
      let end = i;
      while (isDigit(text[end]) || text[end] === '.') end++;
      const digits = text.slice(i, end);
      if (digits === '.' || digits.indexOf('.') !== digits.lastIndexOf('.')) fail(`Check the number "${shorten(digits)}"`);
      // A power of ten (1e21) so an answer shown in that form can be used again.
      let after = end + (text[end] === 'e' || text[end] === 'E' ? 1 : 0);
      if (after > end && (text[after] === '+' || text[after] === '-')) after++;
      const exponentStart = after;
      while (after > end && isDigit(text[after])) after++;
      if (after > exponentStart) end = after;
      tokens.push(finite(Number(text.slice(i, end))));
      i = end;
    } else if (Object.hasOwn(OPERATORS, c)) {
      tokens.push(OPERATORS[c]);
      i++;
    } else if (c === '(' || c === ')' || c === '%') {
      tokens.push(c);
      i++;
    } else {
      fail(`Can't use "${String.fromCodePoint(text.codePointAt(i))}"`);
    }
  }
  return tokens;
}

/**
 * Works a sum out and rounds it to 12 digits. Percent as on a pocket calculator: alone it is a
 * hundredth (10% is 0.1); on the right of + or - it is that share of everything to its left
 * (50+10% is 55); after * or / it is a hundredth (200*10% is 20).
 */
export function calculate(text) {
  if (typeof text !== 'string' || text.trim() === '') fail('Type a sum first');
  if (text.length > MAX_LENGTH) fail(`Too long: ${MAX_LENGTH} characters at most`);
  const tokens = tokenize(text);
  let at = 0;
  let open = 0;

  const sum = () => {
    let total = product().value;
    while (tokens[at] === '+' || tokens[at] === '-') {
      const sign = tokens[at++] === '+' ? 1 : -1;
      const right = product();
      total = finite(total + sign * (right.percent ? total * right.value : right.value));
    }
    return total;
  };

  const product = () => {
    let { value, percent } = factor();
    while (tokens[at] === '*' || tokens[at] === '/') {
      const divide = tokens[at++] === '/';
      const right = factor().value;
      if (divide && right === 0) fail("Can't divide by zero");
      value = finite(divide ? value / right : value * right);
      percent = false;
    }
    return { value, percent };
  };

  const factor = () => {
    let negative = false;
    while (tokens[at] === '-' || tokens[at] === '+') negative = negative !== (tokens[at++] === '-');
    let operand = primary();
    while (tokens[at] === '%') {
      at++;
      operand = { value: operand.value / 100, percent: true };
    }
    return negative ? { value: -operand.value, percent: operand.percent } : operand;
  };

  const primary = () => {
    const token = tokens[at];
    if (typeof token === 'number') {
      at++;
      return { value: token, percent: false };
    }
    if (token === '(') {
      if (++open > MAX_BRACKETS) fail('Too many brackets');
      at++;
      const value = sum();
      if (tokens[at] !== ')') fail(at < tokens.length ? 'Check the sum' : 'Check the brackets');
      at++;
      open--;
      return { value, percent: false };
    }
    if (token === undefined) fail('Finish the sum');
    return fail(token === ')' ? 'Check the brackets' : 'Check the sum');
  };

  const value = sum();
  if (at < tokens.length) fail(tokens[at] === ')' ? 'Check the brackets' : 'Check the sum');
  return Number(value.toPrecision(DIGITS));
}

// What the last calculations were. It lives in this process, so it is gone when the process stops.
const calculations = [];

const evaluate = {
  name: 'evaluate',
  description: 'Work out a sum such as 2+3*4 or 50+10%. Brackets, × and ÷ work too. The answer is rounded to 12 digits.',
  inputSchema: {
    type: 'object',
    properties: { expression: { type: 'string', maxLength: MAX_LENGTH, description: 'The sum to work out.' } },
    required: ['expression'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: { value: { type: 'number' }, expression: { type: 'string' } },
    required: ['value', 'expression'],
  },
  async run(input) {
    const value = calculate(input?.expression);
    const expression = input.expression.trim();
    calculations.unshift({ expression, value });
    calculations.splice(KEEP);
    return { value, expression };
  },
};

const history = {
  name: 'history',
  description: `The last ${KEEP} sums that worked, newest first.`,
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  outputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        maxItems: KEEP,
        items: {
          type: 'object',
          properties: { expression: { type: 'string' }, value: { type: 'number' } },
          required: ['expression', 'value'],
        },
      },
    },
    required: ['items'],
  },
  run: async () => ({ items: calculations.map((item) => ({ ...item })) }),
};

export default { tools: [evaluate, history] };
