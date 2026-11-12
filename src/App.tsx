import React, { useState, useEffect, useRef, useCallback } from 'react';

// =========================================
// ポモドーロタイマーの設定 (18分サイクル)
// =========================================
const SCHEDULE = [
  { type: 'work', set: 1, duration: 300, label: 'WORK 1 (5m)' },
  { type: 'break', set: 1, duration: 60, label: '1m' },
  { type: 'work', set: 2, duration: 300, label: 'WORK 2 (5m)' },
  { type: 'break', set: 2, duration: 60, label: '1m' },
  { type: 'work', set: 3, duration: 300, label: 'WORK 3 (5m)' },
  { type: 'break', set: 3, duration: 60, label: '1m' },
];

const TOTAL_SEC = SCHEDULE.reduce((acc, s) => acc + s.duration, 0); // 1080s (18:00)

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(true);
  const prevPhase = useRef(0);

  const isDone = elapsed >= TOTAL_SEC;

  // 現在のフェーズと残り時間の計算
  let accumulated = 0;
  let currentIdx = 0;
  let remainingInPhase = 0;

  for (let i = 0; i < SCHEDULE.length; i++) {
    if (elapsed < accumulated + SCHEDULE[i].duration) {
      currentIdx = i;
      remainingInPhase = accumulated + SCHEDULE[i].duration - elapsed;
      break;
    }
    accumulated += SCHEDULE[i].duration;
    if (i === SCHEDULE.length - 1) {
      currentIdx = i;
      remainingInPhase = 0;
    }
  }

  const currentSeg = SCHEDULE[currentIdx];
  const isBreak = currentSeg.type === 'break' && !isDone;

  // チャイム音
  const playChime = useCallback(() => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, [sound]);

  useEffect(() => {
    if (!running || isDone) return;
    const t = setInterval(() => {
      setElapsed((p) => {
        const next = p + 1;
        if (next >= TOTAL_SEC) {
          setRunning(false);
          return TOTAL_SEC;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, isDone]);

  useEffect(() => {
    if (prevPhase.current !== currentIdx && elapsed > 0 && !isDone) {
      playChime();
    }
    prevPhase.current = currentIdx;
  }, [currentIdx, elapsed, isDone, playChime]);

  const percent = Math.min(100, (elapsed / TOTAL_SEC) * 100);

  return (
    <div className={`root-container ${isBreak ? 'break-mode' : ''} ${isDone ? 'done-mode' : ''}`}>
      {/* 
        =========================================
        デザインの修正ポイント (App.cssを統合)
        =========================================
      */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&family=Outfit:wght@600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; height: 100%; height: 100dvh; overflow: hidden; background: #191615; font-family: 'M PLUS Rounded 1c', sans-serif; color: #fffdf9; user-select: none; }

        .root-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        /* 修正: 作成いただいた背景画像を統合 */
        .bg-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
          transition: filter 1s ease;
        }

        /* 修正: UIの視認性を高めるビネットを強化 */
        .vignette {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(12,10,9,0.78) 0%, rgba(12,10,9,0.1) 40%, rgba(12,10,9,0.05) 75%, rgba(12,10,9,0.3) 100%);
          pointer-events: none;
          z-index: 1;
        }

        /* Top Header */
        .header-bar { position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center; padding: max(16px, env(safe-area-inset-top)) 20px 12px 20px; }
        .badge { background: rgba(24,20,18,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.22); font-size: 0.8rem; font-weight: 700; color: #fffdf9; }
        .btn-group { display: flex; align-items: center; gap: 8px; }
        .action-btn { background: rgba(24,20,18,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.22); color: #fffdf9; height: 38px; padding: 0 14px; border-radius: 20px; font-family: 'M PLUS Rounded 1c', sans-serif; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: transform 0.15s; }
        .action-btn:active { transform: scale(0.95); }
        .action-btn.primary { background: rgba(246,173,85,0.92); color: #1c140d; border-color: rgba(255,235,200,0.5); }

        /* Bottom-Left Timer HUD */
        .timer-hud { position: relative; z-index: 10; padding: 0 20px calc(34px + env(safe-area-inset-bottom)) 20px; pointer-events: none; }
        .hud-card { pointer-events: auto; display: flex; flex-direction: column; gap: 4px; padding: 12px 18px 14px; border-radius: 18px; background: rgba(18,15,13,0.52); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,248,235,0.18); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
        .status-row { display: flex; align-items: center; gap: 8px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: #f6ad55; box-shadow: 0 0 10px #f6ad55; transition: background-color 0.4s ease, box-shadow 0.4s ease; }
        .break-mode .dot { background: #68d391; box-shadow: 0 0 10px #68d391; }
        .done-mode .dot { background: #63b3ed; box-shadow: 0 0 10px #63b3ed; }
        .phase-label { font-size: 0.85rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #fde68a; }
        .break-mode .phase-label { color: #a7f3d0; }
        .done-mode .phase-label { color: #bae6fd; }

        .countdown-row { display: flex; align-items: baseline; gap: 12px; }
        .countdown-time { font-family: 'Outfit', sans-serif; font-size: clamp(2.6rem, 7vw, 4.1rem); font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; text-shadow: 0 2px 14px rgba(0,0,0,0.45); }
        .total-elapsed { font-family: 'Outfit', sans-serif; font-size: clamp(0.84rem, 2.2vw, 1rem); font-weight: 600; color: rgba(255,253,249,0.78); font-variant-numeric: tabular-nums; }

        /* 修正: 休憩中の画像トーンの変更 */
        .app-container.break-mode .bg-image { filter: brightness(0.8) saturate(1.1) hue-rotate(-10deg); }

        /* Bottom Timeline Progress Bar */
        .timeline-bar { position: fixed; left: 0; right: 0; bottom: 0; height: calc(26px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: rgba(15,12,10,0.85); border-top: 1px solid rgba(255,248,235,0.25); z-index: 20; overflow: hidden; }
        .timeline-fill { position: absolute; top: 0; left: 0; height: 26px; width: 0%; background: linear-gradient(90deg, #dd6b20, #f6ad55); box-shadow: 0 0 16px rgba(246,173,85,0.85); transition: width 0.3s linear; }
        .break-mode .timeline-fill { background: linear-gradient(90deg, #2f855a, #48bb78); box-shadow: 0 0 16px rgba(104,211,145,0.85); }
        .done-mode .timeline-fill { background: linear-gradient(90deg, #3182ce, #63b3ed); }
        .progress-head-glow { position: absolute; top: 0; right: 0; width: 3px; height: 100%; background: #ffffff; box-shadow: 0 0 8px #ffffff, 0 0 14px #fde68a; }
        .progress-segments { position: relative; width: 100%; height: 26px; display: flex; pointer-events: none; z-index: 2; }
        .segment-slot { height: 100%; display: flex; align-items: center; justify-content: center; border-right: 1.5px solid rgba(255,255,255,0.35); font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700; color: #fffdf9; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
        .segment-slot:last-child { border-right: none; }
        .segment-slot.is-break-slot { background: rgba(104,211,145,0.18); font-size: 0.65rem; }

        /* iPhone / Android スマホ縦画面向け調整 */
        @media (max-width: 600px) {
          .header-bar { padding: max(12px, env(safe-area-inset-top)) 14px 10px 14px; }
          .session-pill { font-size: 0.72rem; padding: 5px 10px; }
          .action-btn { height: 34px; padding: 0 11px; font-size: 0.76rem; }
          .timer-hud { padding: 0 14px calc(24px + env(safe-area-inset-bottom)) 14px; }
          .timeline-bar { height: calc(22px + env(safe-area-inset-bottom)); }
          .segment-slot { font-size: 0.65rem; }
          .segment-slot.is-break-slot { font-size: 0.6rem; }
        }
      `}</style>

      {/* 
        =========================================
        背景画像エリア
        =========================================
      */}
      <div className="bg-area" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop"
          className="bg-image"
          alt="Lo-Fi Study Background"
        />
        <div className="vignette" />
      </div>

      {/* 
        =========================================
        上部 コントロールエリア
        =========================================
      */}
      <header className="header-bar">
        <div className="session-pill">
          <span>5m WORK + 1m BREAK × 3</span>
        </div>
        <div className="btn-group">
          <button type="button" className="action-btn" onClick={() => setSound(!sound)} aria-label="音のオンオフ">
            {sound ? '🔔 ON' : '🔕 OFF'}
          </button>
          <button type="button" className="action-btn primary" onClick={() => { if (isDone) { setElapsed(0); setRunning(true); } else { setRunning(!running); } }} aria-label="再生と一時停止">
            {isDone ? '↻ RESTART' : running ? '⏸ PAUSE' : '▶ START'}
          </button>
          {elapsed > 0 && (
            <button type="button" className="action-btn" onClick={() => { setRunning(false); setElapsed(0); }} aria-label="リセット">
              ↺
            </button>
          )}
        </div>
      </header>

      {/* 
        =========================================
        左下 タイムカウントHUDエリア
        =========================================
      */}
      <main className="timer-hud">
        <div className="hud-card">
          <div className="status-row">
            <span className="dot" />
            <span className="phase-label">
              {isDone ? 'COMPLETED · 18 MIN' : currentSeg.label}
            </span>
          </div>
          <div className="countdown-row">
            <div className="countdown-time">{fmtTime(remainingInPhase)}</div>
            <div className="total-elapsed">{fmtTime(elapsed)} / 18:00</div>
          </div>
        </div>
      </main>

      {/* 
        =========================================
        最下部 18分経過タイムラインバー
        =========================================
      */}
      <div className="timeline-bar" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="18分の進行バー">
        {/* 経過に合わせて伸びるバー */}
        <div className="timeline-fill" style={{ width: `${percent}%` }}>
          {elapsed > 0 && elapsed < TOTAL_SEC && (
            <span className="progress-head-glow" />
          )}
        </div>
        {/* 5分作業 / 1分休憩の区間ラベル */}
        <div className="progress-segments">
          {SCHEDULE.map((seg, idx) => (
            <div
              key={idx}
              className={`segment-slot ${seg.type === 'break' ? 'is-break-slot' : ''}`}
              style={{ flex: seg.duration }}
            >
              {seg.type === 'work' ? `WORK${seg.set} (5m)` : '1m'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}