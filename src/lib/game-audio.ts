type GameSound = "queue" | "found" | "accept";

let context: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  context ??= new AudioContextClass();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(audio: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType, volume: number, endFrequency = frequency) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noiseSweep(audio: AudioContext, start: number, duration: number, volume: number) {
  const frames = Math.ceil(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) channel[i] = (Math.random() * 2 - 1) * (1 - i / frames * 0.22);
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(420, start);
  filter.frequency.exponentialRampToValueAtTime(1500, start + duration * 0.62);
  filter.frequency.exponentialRampToValueAtTime(680, start + duration);
  filter.Q.value = 0.6;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

export function playGameSound(sound: GameSound) {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  if (sound === "queue") {
    // A restrained two-pulse scanner cue marks entry into matchmaking.
    noiseSweep(audio, now, 0.16, 0.045);
    tone(audio, 392, now, 0.16, "triangle", 0.055, 330);
    tone(audio, 587.33, now + 0.12, 0.2, "sine", 0.045, 440);
    return;
  }
  if (sound === "found") {
    // A bright, three-step tactical alert with a short impact; intentionally distinct from queue entry.
    noiseSweep(audio, now, 0.24, 0.11);
    tone(audio, 523.25, now, 0.19, "triangle", 0.11, 659.25);
    tone(audio, 783.99, now + 0.12, 0.23, "square", 0.07, 783.99);
    tone(audio, 1046.5, now + 0.3, 0.42, "triangle", 0.14, 1046.5);
    tone(audio, 523.25, now + 0.3, 0.38, "sine", 0.075, 523.25);
    return;
  }
  tone(audio, 660, now, 0.1, "square", 0.04, 880);
  tone(audio, 990, now + 0.075, 0.18, "sine", 0.05, 1320);
}
