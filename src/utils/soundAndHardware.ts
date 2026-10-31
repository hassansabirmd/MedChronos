export type NotificationTone =
  | 'clinical_bell'
  | 'exam_hall_chime'
  | 'double_pulse'
  | 'soft_marimba'
  | 'mute';

export const TONE_LABELS: Record<NotificationTone, string> = {
  clinical_bell: 'Clinical Brass Bell (Standard)',
  exam_hall_chime: 'Prometric Exam Hall Chime',
  double_pulse: 'Urgent Double Pulse',
  soft_marimba: 'Warm Study Harmonic',
  mute: 'Silent (Visual Alert Only)',
};

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playNotificationBell(tone: NotificationTone, volumePercent: number = 80): void {
  if (tone === 'mute' || volumePercent <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainLevel = Math.min(1, Math.max(0.05, volumePercent / 100)) * 0.35;

    const playNote = (
      freq: number,
      startTime: number,
      duration: number,
      oscType: OscillatorType = 'sine',
      peakGain: number = gainLevel
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    };

    if (tone === 'clinical_bell') {
      // Rich bell overtone triad
      playNote(880, now, 0.9, 'sine', gainLevel);
      playNote(1760, now, 0.55, 'triangle', gainLevel * 0.5);
      playNote(1318.5, now + 0.18, 0.95, 'sine', gainLevel * 0.85);
    } else if (tone === 'exam_hall_chime') {
      // Classic 3-note ascending chime (C5 -> E5 -> G5)
      playNote(523.25, now, 0.45, 'sine', gainLevel);
      playNote(659.25, now + 0.22, 0.45, 'sine', gainLevel);
      playNote(783.99, now + 0.44, 0.85, 'sine', gainLevel);
    } else if (tone === 'double_pulse') {
      playNote(987.77, now, 0.25, 'triangle', gainLevel);
      playNote(987.77, now + 0.32, 0.4, 'triangle', gainLevel);
    } else if (tone === 'soft_marimba') {
      playNote(440, now, 0.5, 'sine', gainLevel);
      playNote(659.25, now + 0.16, 0.65, 'sine', gainLevel * 0.9);
    }
  } catch {
    // Ignore audio context block errors in restricted headless environments
  }
}

export function triggerVibration(pattern: number | number[] = [200, 100, 200]): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }
  return false;
}

export interface WakeLockController {
  isSupported: boolean;
  isActive: boolean;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => Promise<void>;
}

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
}

let activeSentinel: WakeLockSentinelLike | null = null;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function acquireScreenWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) return false;
  try {
    const navWithWake = navigator as unknown as {
      wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    activeSentinel = await navWithWake.wakeLock.request('screen');
    return true;
  } catch {
    return false;
  }
}

export async function releaseScreenWakeLock(): Promise<void> {
  if (activeSentinel) {
    try {
      await activeSentinel.release();
    } catch {
      // Ignore release errors
    }
    activeSentinel = null;
  }
}
