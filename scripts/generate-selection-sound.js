const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 0.14;
const frameCount = Math.floor(sampleRate * duration);
const outputDir = path.join(__dirname, '..', 'assets', 'audio', 'previews');
const outputPath = path.join(outputDir, 'select-bubble.wav');

fs.mkdirSync(outputDir, { recursive: true });

const data = Buffer.alloc(frameCount * 2);
for (let index = 0; index < frameCount; index += 1) {
  const time = index / sampleRate;
  const frequency = 300 + 520 * time;
  const envelope = Math.exp(-28 * time) * Math.min(1, time * 180);
  const sample = envelope * Math.sin(2 * Math.PI * frequency * time + 22 * time * time) * 0.72;
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), index * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

fs.writeFileSync(outputPath, Buffer.concat([header, data]));
console.log(`Generated ${outputPath}`);
