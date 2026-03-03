import { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

type ToolboxMode = 'dot' | 'ruler' | 'toolbox' | 'extended';

// ── Ruler strip ───────────────────────────────────────────

function Ruler({ mode, onModeChange }: { mode: ToolboxMode; onModeChange: (m: ToolboxMode) => void }) {
  const modes: { key: ToolboxMode; label: string }[] = [
    { key: 'ruler', label: 'Ruler' },
    { key: 'toolbox', label: 'Toolbox' },
    { key: 'extended', label: 'Extended' },
  ];

  return (
    <div className="flex w-11 flex-col items-center rounded-r-lg bg-gray-950/95 py-3 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-1.5">
        {modes.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            title={label}
            className={`h-2.5 w-7 rounded-sm transition-colors ${
              mode === key ? 'bg-pink-600' : 'bg-pink-600/30 hover:bg-pink-600/60'
            }`}
          />
        ))}
      </div>

      <div className="mt-auto">
        <button
          onClick={() => onModeChange('dot')}
          title="Minimize to dot"
          className="h-4 w-4 rounded-full bg-pink-600 transition-transform hover:scale-110"
        />
      </div>
    </div>
  );
}

// ── Toolbox app ───────────────────────────────────────────

function Toolbox() {
  const [mode, setMode] = useState<ToolboxMode>('dot');

  useEffect(() => {
    window.canvas?.getToolboxMode?.().then(setMode);
    return window.canvas?.onToolboxModeChanged?.((m: ToolboxMode) => setMode(m));
  }, []);

  const switchMode = useCallback((m: ToolboxMode) => {
    window.canvas?.setToolboxMode?.(m);
  }, []);

  // ── Dot mode ─────────────────────────────────────────

  if (mode === 'dot') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <button
          onClick={() => switchMode('ruler')}
          className="h-12 w-12 rounded-full bg-pink-700 shadow-lg transition-transform hover:scale-110 active:scale-95"
        />
      </div>
    );
  }

  // ── Panel modes (ruler / toolbox / extended) ─────────

  return (
    <div className="flex h-screen w-screen overflow-hidden rounded-lg">
      {mode === 'extended' && (
        <div className="flex-1 rounded-l-lg bg-background/95 p-4 backdrop-blur-sm">
          {/* Extended input pane — quick notes, email replies, chat */}
        </div>
      )}

      {(mode === 'toolbox' || mode === 'extended') && (
        <div className={`flex-1 bg-muted/95 p-4 backdrop-blur-sm ${mode === 'toolbox' ? 'rounded-l-lg' : ''}`}>
          {/* Toolbox content pane */}
        </div>
      )}

      <Ruler mode={mode} onModeChange={switchMode} />
    </div>
  );
}

// ── Mount ─────────────────────────────────────────────────

createRoot(document.getElementById('toolbox-root')!).render(
  <StrictMode>
    <Toolbox />
  </StrictMode>,
);
