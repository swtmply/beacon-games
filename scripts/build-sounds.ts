// bun scripts/build-sounds.ts rebuilds the original game feedback sounds.
import { writeFileSync } from 'node:fs';

import { seededRandom } from '../src/utils/sudoku';

const sampleRate = 44100;
const tau = Math.PI * 2;

function writeSound(name: string, samples: Float64Array, volume: number) {
  const peak = samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM, mono, 16 bit.
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => wav.writeInt16LE(Math.round(sample / peak * volume * 32767), 44 + index * 2));
  writeFileSync(new URL(`../assets/sounds/${name}.wav`, import.meta.url), wav);
  console.log(`${name}: ${(samples.length / sampleRate).toFixed(2)}s, ${wav.length} bytes`);
}

function envelope(time: number, duration: number, decay: number) {
  return Math.min(1, time / 0.004) * Math.exp(-time / decay) * Math.min(1, (duration - time) / 0.025);
}

function chime(name: string, frequencies: number[], spacing: number, tail: number, volume = 0.5) {
  const samples = new Float64Array(Math.ceil(((frequencies.length - 1) * spacing + tail) * sampleRate));
  frequencies.forEach((frequency, note) => {
    const start = Math.round(note * spacing * sampleRate);
    for (let index = 0; index < tail * sampleRate && start + index < samples.length; index++) {
      const time = index / sampleRate;
      const bell = Math.sin(tau * frequency * time) + 0.22 * Math.sin(tau * frequency * 2 * time) * Math.exp(-time / 0.05);
      samples[start + index] += bell * envelope(time, tail, tail / 3);
    }
  });
  writeSound(name, samples, volume);
}

// A bright major arpeggio for a correct answer; each milestone has its own melody.
chime('correct', [659.25, 1046.5, 1318.51], 0.06, 0.22);
chime('row', [523.25, 659.25, 783.99], 0.085, 0.28);
chime('column', [783.99, 1046.5, 1567.98], 0.095, 0.28);
chime('box', [523.25, 783.99, 1046.5, 1318.51], 0.075, 0.32, 0.55);

// Two low, rough, falling tones make mistakes unmistakable.
const error = new Float64Array(Math.ceil(0.34 * sampleRate));
[0, 0.16].forEach((start, note) => {
  const duration = 0.15;
  for (let index = 0; index < duration * sampleRate; index++) {
    const time = index / sampleRate;
    const frequency = note === 0 ? 240 : 175;
    const phase = tau * (frequency * time - 75 * time * time);
    const buzz = Math.sin(phase) + 0.35 * Math.sin(phase * 3) + 0.18 * Math.sin(phase * 5);
    error[Math.round(start * sampleRate) + index] += buzz * envelope(time, duration, 0.1);
  }
});
writeSound('error', error, 0.5);

// Filtered noise in three slower strokes, with a tiny wooden pencil tap.
const note = new Float64Array(Math.ceil(0.28 * sampleRate));
const random = seededRandom(42);
let low = 0;
let band = 0;
note.forEach((_, index) => {
  const time = index / sampleRate;
  const noise = random() * 2 - 1;
  low += 0.12 * (noise - low);
  band += 0.5 * (noise - low - band);
  const stroke = time % 0.085;
  const scratch = time < 0.25 && stroke < 0.065 ? Math.sin(Math.PI * stroke / 0.065) ** 0.6 : 0;
  const tap = time < 0.035 ? Math.sin(tau * 1800 * time) * envelope(time, 0.035, 0.008) * 0.18 : 0;
  note[index] = band * scratch + tap;
});
writeSound('note', note, 0.4);
