const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const outputDir = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(outputDir, { recursive: true });

const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);
const clamp = (value) => Math.max(-1, Math.min(1, value));

function writeWav(name, duration, render) {
  const sampleCount = Math.floor(duration * SAMPLE_RATE);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < sampleCount; i += 1) {
    buffer.writeInt16LE(Math.round(clamp(render(i / SAMPLE_RATE)) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(outputDir, name), buffer);
}

function pluck(t, start, frequency, length = 0.42, volume = 1) {
  const local = t - start;
  if (local < 0 || local > length) return 0;
  const attack = Math.min(1, local / 0.012);
  const decay = Math.exp(-local * 7.2);
  const tone = Math.sin(2 * Math.PI * frequency * local)
    + 0.34 * Math.sin(2 * Math.PI * frequency * 2 * local)
    + 0.12 * Math.sin(2 * Math.PI * frequency * 3 * local);
  return tone * attack * decay * volume;
}

const melody = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 83, 81, 79, 76, 74];
const bass = [48, 48, 53, 53, 45, 45, 55, 55];
writeWav('fudu-theme.wav', 16, (t) => {
  let value = 0;
  for (let step = 0; step < 32; step += 1) {
    const note = melody[step % melody.length] + (step >= 16 ? 0 : -12);
    value += pluck(t, step * 0.5, midi(note), 0.48, 0.16);
  }
  for (let beat = 0; beat < 16; beat += 1) {
    value += pluck(t, beat, midi(bass[Math.floor(beat / 2) % bass.length]), 0.75, 0.11);
  }
  const edgeFade = Math.min(1, t / 0.08, (16 - t) / 0.08);
  return value * edgeFade;
});

writeWav('select.wav', 0.12, (t) => pluck(t, 0, midi(79), 0.12, 0.34));

writeWav('button.wav', 0.2, (t) => (
  pluck(t, 0, midi(67), 0.18, 0.24) + pluck(t, 0.045, midi(74), 0.14, 0.2)
));

writeWav('merge.wav', 0.52, (t) => (
  pluck(t, 0, midi(67), 0.32, 0.25)
  + pluck(t, 0.1, midi(72), 0.32, 0.27)
  + pluck(t, 0.2, midi(79), 0.32, 0.3)
));

writeWav('victory.wav', 1.35, (t) => {
  const notes = [60, 64, 67, 72, 76, 79];
  return notes.reduce((sum, note, index) => sum + pluck(t, index * 0.12, midi(note), 0.55, 0.22), 0);
});

console.log(`Generated Fudu Hex audio in ${outputDir}`);
