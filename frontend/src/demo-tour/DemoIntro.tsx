import { useEffect, useRef } from 'react';
import type { DemoTourDefinition } from './types';

export function DemoIntro({
  intro,
  onStart,
  onSkip,
  onClose,
}: {
  intro: DemoTourDefinition['intro'];
  onStart: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('.btn-primary')?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className="demo-sheet-backdrop" role="presentation">
      <div ref={dialogRef} className="demo-sheet" role="dialog" aria-modal="true" aria-labelledby="demo-intro-title">
        <button type="button" className="demo-tour-close" aria-label="Закрыть тур" onClick={onClose}>×</button>
        <p className="eyebrow">Демонстрация возможностей</p>
        <h2 id="demo-intro-title">{intro.title}</h2>
        <p className="lead">{intro.lead}</p>
        <ul className="demo-sheet-list">
          {intro.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="demo-sheet-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onStart}>
            {intro.startLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onSkip}>
            {intro.skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
