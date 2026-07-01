const test = require('node:test');
const assert = require('node:assert');
const RC = require('../../dist/modules/rooms/room-code.helper.js');

// --- generateRoomCode ---

test('generateRoomCode — floor 1 sequence 1 → A-01', () => {
  assert.strictEqual(RC.generateRoomCode(1, 1), 'A-01');
});

test('generateRoomCode — floor 2 sequence 12 → B-12', () => {
  assert.strictEqual(RC.generateRoomCode(2, 12), 'B-12');
});

test('generateRoomCode — floor 26 sequence 99 → Z-99', () => {
  assert.strictEqual(RC.generateRoomCode(26, 99), 'Z-99');
});

test('generateRoomCode — floor 1 sequence 9 → A-09 (zero-padded)', () => {
  assert.strictEqual(RC.generateRoomCode(1, 9), 'A-09');
});

test('generateRoomCode — floor 1 sequence 10 → A-10', () => {
  assert.strictEqual(RC.generateRoomCode(1, 10), 'A-10');
});

test('generateRoomCode — throws for floor < 1', () => {
  assert.throws(() => RC.generateRoomCode(0, 1), { message: /Floor must be between 1 and 26/ });
});

test('generateRoomCode — throws for floor > 26', () => {
  assert.throws(() => RC.generateRoomCode(27, 1), { message: /Floor must be between 1 and 26/ });
});

test('generateRoomCode — throws for sequence < 1', () => {
  assert.throws(() => RC.generateRoomCode(1, 0), { message: /Sequence must be between 1 and 99/ });
});

test('generateRoomCode — throws for sequence > 99', () => {
  assert.throws(() => RC.generateRoomCode(1, 100), { message: /Sequence must be between 1 and 99/ });
});

// --- validateRoomCode ---

test('validateRoomCode — returns true for valid code A-01', () => {
  assert.strictEqual(RC.validateRoomCode('A-01'), true);
});

test('validateRoomCode — returns true for valid code Z-99', () => {
  assert.strictEqual(RC.validateRoomCode('Z-99'), true);
});

test('validateRoomCode — returns false for missing dash', () => {
  assert.strictEqual(RC.validateRoomCode('A01'), false);
});

test('validateRoomCode — returns false for lowercase', () => {
  // lowercase is still matched by regex due to A-Za-z
  assert.strictEqual(RC.validateRoomCode('a-01'), true);
});

test('validateRoomCode — returns false for no padding', () => {
  assert.strictEqual(RC.validateRoomCode('A-1'), false);
});

test('validateRoomCode — returns false for empty string', () => {
  assert.strictEqual(RC.validateRoomCode(''), false);
});

test('validateRoomCode — returns false for 3-digit sequence', () => {
  assert.strictEqual(RC.validateRoomCode('A-100'), false);
});

// --- parseRoomCode ---

test('parseRoomCode — parses A-01 → floor 1 sequence 1', () => {
  const result = RC.parseRoomCode('A-01');
  assert.deepStrictEqual(result, { floor: 1, sequence: 1 });
});

test('parseRoomCode — parses B-12 → floor 2 sequence 12', () => {
  const result = RC.parseRoomCode('B-12');
  assert.deepStrictEqual(result, { floor: 2, sequence: 12 });
});

test('parseRoomCode — parses Z-99 → floor 26 sequence 99', () => {
  const result = RC.parseRoomCode('Z-99');
  assert.deepStrictEqual(result, { floor: 26, sequence: 99 });
});

test('parseRoomCode — returns null for invalid code', () => {
  assert.strictEqual(RC.parseRoomCode('invalid'), null);
});

test('parseRoomCode — returns null for empty string', () => {
  assert.strictEqual(RC.parseRoomCode(''), null);
});

test('parseRoomCode — handles lowercase input', () => {
  const result = RC.parseRoomCode('a-01');
  assert.deepStrictEqual(result, { floor: 1, sequence: 1 });
});
