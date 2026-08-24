import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

function isoDate(offset = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function ViewingPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const tour = params.get('tour') === '1';
  const navigate = useNavigate();
  const [step, setStep] = useState<'date' | 'time' | 'type' | 'confirm'>('date');
  const [date, setDate] = useState(isoDate(2));
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [type, setType] = useState<'on_site' | 'office' | 'online'>('on_site');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dates = useMemo(() => Array.from({ length: 10 }, (_, index) => isoDate(index + 1)), []);

  useEffect(() => {
    if (!id) return;
    void api.track({ eventType: 'viewing_started', entityType: 'property', entityId: Number(id) }).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void api.getSlots(Number(id), date).then((data) => {
      setSlots(data);
      setTime(data[0] ?? '');
    });
  }, [id, date]);

  async function confirm() {
    if (tour) {
      setError('Тур не создаёт просмотр. Нажмите подтверждение уже как клиент — вне демо-подсказки.');
      return;
    }
    setBusy(true);
    try {
      await api.createViewing({ propertyId: Number(id), date, time, type });
      navigate('/me');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записаться');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <p className="eyebrow">Просмотр</p>
      <h1>Выберите слот</h1>
      {step === 'date' && (
        <div className="choice-grid">
          {dates.map((item) => (
            <button key={item} className={date === item ? 'choice active' : 'choice'} onClick={() => setDate(item)}>
              {item.slice(5)}
            </button>
          ))}
          <button className="btn btn-primary" onClick={() => setStep('time')}>
            Далее
          </button>
        </div>
      )}
      {step === 'time' && (
        <div className="choice-grid">
          {slots.map((item) => (
            <button key={item} className={time === item ? 'choice active' : 'choice'} onClick={() => setTime(item)}>
              {item}
            </button>
          ))}
          <button className="btn btn-primary" onClick={() => setStep('type')}>
            Далее
          </button>
        </div>
      )}
      {step === 'type' && (
        <div className="choice-grid">
          {[
            ['on_site', 'На объекте'],
            ['office', 'В офисе'],
            ['online', 'Онлайн'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={type === value ? 'choice active' : 'choice'}
              onClick={() => setType(value as typeof type)}
            >
              {label}
            </button>
          ))}
          <button className="btn btn-primary" onClick={() => setStep('confirm')}>
            Далее
          </button>
        </div>
      )}
      {step === 'confirm' && (
        <div data-demo-tour="viewing-confirm">
          <p>
            {date} в {time},{' '}
            {type === 'on_site' ? 'на объекте' : type === 'office' ? 'в офисе' : 'онлайн'}
          </p>
          <p className="muted">Запись создаётся только после подтверждения.</p>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => void confirm()}>
            Подтвердить просмотр
          </button>
        </div>
      )}
    </div>
  );
}
