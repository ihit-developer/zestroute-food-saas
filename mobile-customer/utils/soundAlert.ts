import { Platform, Vibration } from 'react-native';

/**
 * Plays a pleasant two-tone chime on Web (via Web Audio API) and vibrates on iOS/Android.
 * Used when a Rider receives a new delivery offer or a Customer's order status updates.
 */
export function playAlertChime(kind: 'rider_offer' | 'order_update' = 'order_update') {
  try {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(kind === 'rider_offer' ? [0, 220, 100, 220] : [0, 140, 80, 140]);
      return;
    }
    interface WebAudioNode {
      connect: (dest: unknown) => void;
    }
    interface WebGainNode extends WebAudioNode {
      gain: {
        setValueAtTime: (v: number, t: number) => void;
        exponentialRampToValueAtTime: (v: number, t: number) => void;
      };
    }
    interface WebOscNode extends WebAudioNode {
      type: string;
      frequency: { value: number };
      start: (t: number) => void;
      stop: (t: number) => void;
    }
    interface WebAudioCtx {
      currentTime: number;
      destination: unknown;
      createOscillator: () => WebOscNode;
      createGain: () => WebGainNode;
    }
    const win = globalThis as unknown as {
      AudioContext?: new () => WebAudioCtx;
      webkitAudioContext?: new () => WebAudioCtx;
    };
    const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const notes = kind === 'rider_offer' ? [660, 880, 1100] : [587.33, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {
    // Audio playback may be blocked prior to user interaction; fail silently
  }
}
