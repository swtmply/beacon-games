// bun scripts/build-sudoku.ts validates the pack; add --generate to rebuild it.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

import pack from '../src/data/sudoku.json';
import { candidates, dailyId, DIGITS, getPuzzle, seededRandom, shuffle } from '../src/utils/sudoku';

const random = seededRandom(20261003);
const units = [
  ...Array.from({ length: 9 }, (_, row) => DIGITS.map(column => row * 9 + column - 1)),
  ...Array.from({ length: 9 }, (_, column) => DIGITS.map(row => (row - 1) * 9 + column)),
  ...Array.from({ length: 9 }, (_, box) => DIGITS.map(cell => Math.floor(box / 3) * 27 + box % 3 * 3 + Math.floor((cell - 1) / 3) * 9 + (cell - 1) % 3)),
];

function solve(input: number[], limit = 2) {
  let count = 0;
  let solution: number[] = [];
  let score = 0;
  function visit(values: number[]) {
    if (count >= limit) return;
    const board = [...values];
    while (board.includes(0)) {
      const options = board.map((value, i) => value ? [] : candidates(board, i));
      if (options.some((digits, i) => !board[i] && !digits.length)) return;
      let index = options.findIndex(digits => digits.length === 1);
      let digit = options[index]?.[0];
      if (index < 0) {
        for (const unit of units) {
          for (const value of DIGITS) {
            const places = unit.filter(i => options[i].includes(value));
            if (places.length === 1) {
              index = places[0]; digit = value; break;
            }
          }
          if (index >= 0) break;
        }
        if (index >= 0) score += 5;
      }
      if (index >= 0 && digit) {
        board[index] = digit;
        score++;
        continue;
      }
      index = options.reduce((best, digits, i) => digits.length && (best < 0 || digits.length < options[best].length) ? i : best, -1);
      score += 100;
      for (const value of options[index]) {
        const branch = [...board]; branch[index] = value;
        visit(branch);
      }
      return;
    }
    count++; solution = board;
  }
  visit(input);
  return { count, solution, score };
}

function solvedBoard() {
  const digits = shuffle(DIGITS, random);
  const order = () => shuffle([0, 1, 2], random).flatMap(group => shuffle([0, 1, 2], random).map(offset => group * 3 + offset));
  const rows = order(); const columns = order();
  return rows.flatMap(row => columns.map(column => digits[(row * 3 + Math.floor(row / 3) + column) % 9]));
}

let levels = pack;
if (process.argv.includes('--generate')) {
  const pool: typeof pack = [];
  for (let attempt = 0; attempt < 300; attempt++) {
    const solution = solvedBoard();
    const board = [...solution];
    const target = 26 + Math.floor(random() * 25);
    for (const index of shuffle(Array.from({ length: 81 }, (_, i) => i), random)) {
      const previous = board[index]; board[index] = 0;
      if (solve(board).count !== 1) board[index] = previous;
      if (board.filter(Boolean).length <= target) break;
    }
    const result = solve(board, 1);
    pool.push({ givens: board.join(''), solution: solution.join(''), score: result.score });
  }

  // ponytail: this solver rates singles and search effort; add advanced logical techniques if finer human ratings are needed.
  const ranked = [...new Map(pool.sort((a, b) => a.score - b.score).map(entry => [entry.score, entry])).values()];
  assert(ranked.length >= 24, 'Need 24 distinct difficulty scores');
  levels = Array.from({ length: 24 }, (_, i) => ranked[Math.round(i * (ranked.length - 1) / 23)]);
  writeFileSync(new URL('../src/data/sudoku.json', import.meta.url), JSON.stringify(levels, null, 2) + '\n');
}
for (const [i, entry] of levels.entries()) {
  const board = [...entry.givens].map(Number);
  const result = solve(board);
  assert.equal(result.count, 1, `Level ${i + 1} must have one solution`);
  assert.equal(result.solution.join(''), entry.solution);
  assert(i === 0 || entry.score > levels[i - 1].score, 'Difficulty must increase');
  assert(units.every(unit => new Set(unit.map(index => result.solution[index])).size === 9));
}
assert.equal(getPuzzle('level-25'), null);
assert.equal(getPuzzle('daily-2026-02-30'), null);
for (let day = 1; day <= 31; day++) {
  const id = dailyId(`2026-10-${String(day).padStart(2, '0')}`);
  const puzzle = getPuzzle(id);
  assert(puzzle);
  assert.deepEqual(puzzle, getPuzzle(id), 'Daily puzzles must be repeatable');
  const result = solve(puzzle.givens);
  assert.equal(result.count, 1);
  assert.deepEqual(result.solution, puzzle.solution);
}
console.log(`Verified ${levels.length} unique adventure puzzles with increasing difficulty, and 31 repeatable daily puzzles.`);
