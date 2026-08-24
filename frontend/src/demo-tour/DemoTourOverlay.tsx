import { useEffect, useRef, useState } from 'react';
import { chooseTooltipPlacement } from './placement';
import type { TourStep } from './types';

interface DemoTourOverlayProps {
  step: TourStep;
  stepIndex: number;
  stepCount: number;
  targetRect: {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
  } | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function DemoTourOverlay({
  step,
  stepIndex,
  stepCount,
  targetRect,
  onNext,
  onBack,
  onSkip,
  onClose,
}: DemoTourOverlayProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);

  useEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    setTooltipHeight(node.getBoundingClientRect().height);
  }, [step.id, targetRect?.top, targetRect?.height]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !tooltipRef.current) return;
      const focusable = Array.from(tooltipRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    window.setTimeout(() => tooltipRef.current?.querySelector<HTMLElement>('[data-tour-primary]')?.focus(), 0);
  }, [step.id]);

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const placement = targetRect
    ? chooseTooltipPlacement({
        targetTop: targetRect.top,
        targetBottom: targetRect.bottom,
        tooltipHeight,
        viewportHeight,
        preferred: step.placement,
        bottomReserve: 88,
      })
    : 'bottom';

  const tooltipWidth = Math.min(360, viewportWidth - 32);
  let tooltipTop = targetRect
    ? placement === 'top'
      ? targetRect.top - tooltipHeight - 12
      : targetRect.bottom + 12
    : Math.max(24, viewportHeight * 0.28);
  tooltipTop = Math.min(Math.max(12, tooltipTop), viewportHeight - tooltipHeight - 16);

  const tooltipLeft = targetRect
    ? Math.min(
        Math.max(16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2),
        viewportWidth - tooltipWidth - 16,
      )
    : (viewportWidth - tooltipWidth) / 2;

  return (
    <div className="demo-tour-layer" role="dialog" aria-modal="true" aria-labelledby="demo-tour-title">
      {targetRect && (
        <div
          className="demo-tour-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}
      <div
        ref={tooltipRef}
        className="demo-tour-tooltip"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
      >
        <button type="button" className="demo-tour-close" aria-label="Закрыть тур" onClick={onClose}>×</button>
        <p className="demo-tour-progress">
          {stepIndex + 1} из {stepCount}
        </p>
        <h2 id="demo-tour-title">{step.title}</h2>
        <p>{step.description}</p>
        <div className="demo-tour-actions">
          <button type="button" className="btn btn-ghost" onClick={onSkip}>
            Пропустить
          </button>
          <div className="demo-tour-nav">
            {stepIndex > 0 && (
              <button type="button" className="btn btn-secondary" onClick={onBack}>
                Назад
              </button>
            )}
            <button type="button" className="btn btn-primary" data-tour-primary onClick={onNext}>
              {step.nextLabel ?? (stepIndex === stepCount - 1 ? 'Готово' : 'Далее')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
