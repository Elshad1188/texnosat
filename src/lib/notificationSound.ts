// Short, distinctive 2-tone notification chime via Web Audio API.
// No external assets required.

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
};

const tone = (audio: AudioContext, freq: number, start: number, duration: number, peakGain = 0.18) => {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, audio.currentTime + start);
  gain.gain.setValueAtTime(0.0001, audio.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(peakGain, audio.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.05);
};

export const playNotificationSound = () => {
  const audio = getCtx();
  if (!audio) return;
  // Two quick high-pitched bell notes (E6 → A6) — short and distinctive
  tone(audio, 1318.51, 0, 0.18);
  tone(audio, 1760.0, 0.1, 0.22);
};
