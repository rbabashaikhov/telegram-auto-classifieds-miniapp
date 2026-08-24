import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LEGACY_DEMO_QUALIFICATION_DRAFT as DEMO_QUALIFICATION_DRAFT, LEGACY_TOUR_DRAFT_KEY as TOUR_DRAFT_KEY } from '../demo-tour/legacyQualificationDemo';
import type { QualificationDraft } from '../types';

const STEPS = [
  'goal',
  'type',
  'locations',
  'budget',
  'rooms',
  'timing',
  'payment',
  'preferences',
  'consent',
] as const;

const DISTRICTS = [
  { id: 'primorsky', label: 'Приморский' },
  { id: 'moskovsky', label: 'Московский' },
  { id: 'central', label: 'Центральный' },
  { id: 'vyborgsky', label: 'Выборгский' },
  { id: 'vasileostrovsky', label: 'Василеостровский' },
];

function emptyDraft(): QualificationDraft {
  return {
    goal: 'own_use',
    propertyType: 'new_build',
    locations: ['primorsky'],
    budgetMin: 12_000_000,
    budgetMax: 22_000_000,
    rooms: '2',
    purchaseTiming: '1_3_months',
    payment: 'mortgage',
    mortgageStatus: 'application_in_progress',
    preferences: ['finished', 'parking'],
    areaMin: 45,
    areaMax: 90,
  };
}

function readTourDraft(): QualificationDraft | null {
  try {
    const raw = sessionStorage.getItem(TOUR_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as QualificationDraft) : null;
  } catch {
    return null;
  }
}

export function QualifyPage() {
  const navigate = useNavigate();
  const tourDraft = useMemo(() => readTourDraft(), []);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<QualificationDraft>(tourDraft ?? emptyDraft());
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const current = STEPS[step];

  function toggleLocation(id: string) {
    setDraft((prev) => ({
      ...prev,
      locations: prev.locations.includes(id)
        ? prev.locations.filter((item) => item !== id)
        : [...prev.locations, id],
    }));
  }

  function togglePref(id: string) {
    setDraft((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(id)
        ? prev.preferences.filter((item) => item !== id)
        : [...prev.preferences, id],
    }));
  }

  async function submit() {
    if (!consent) {
      setError('Нужно согласие на обработку данных для подбора.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.qualify({ ...draft, consent: true });
      sessionStorage.removeItem(TOUR_DRAFT_KEY);
      navigate('/matches');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page qualify-page" data-demo-tour="qualify-step">
      <p className="eyebrow">
        Шаг {step + 1} из {STEPS.length}
      </p>
      <div className="progress">
        <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {current === 'goal' && (
        <>
          <h1>Зачем ищете квартиру?</h1>
          <div className="choice-grid">
            {[
              ['own_use', 'Для себя'],
              ['investment', 'Инвестиция'],
              ['relocation', 'Переезд'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={draft.goal === id ? 'choice active' : 'choice'}
                onClick={() => setDraft({ ...draft, goal: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'type' && (
        <>
          <h1>Какой тип жилья?</h1>
          <div className="choice-grid">
            {[
              ['new_build', 'Новостройка'],
              ['secondary', 'Вторичка'],
              ['apartments', 'Апартаменты'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={draft.propertyType === id ? 'choice active' : 'choice'}
                onClick={() => setDraft({ ...draft, propertyType: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'locations' && (
        <>
          <h1>Какие районы рассматриваете?</h1>
          <div className="choice-grid">
            {DISTRICTS.map((item) => (
              <button
                key={item.id}
                className={draft.locations.includes(item.id) ? 'choice active' : 'choice'}
                onClick={() => toggleLocation(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'budget' && (
        <>
          <h1>Бюджет</h1>
          <label>
            От, ₽
            <input
              type="number"
              value={draft.budgetMin}
              onChange={(event) => setDraft({ ...draft, budgetMin: Number(event.target.value) })}
            />
          </label>
          <label>
            До, ₽
            <input
              type="number"
              value={draft.budgetMax}
              onChange={(event) => setDraft({ ...draft, budgetMax: Number(event.target.value) })}
            />
          </label>
        </>
      )}

      {current === 'rooms' && (
        <>
          <h1>Комнаты</h1>
          <div className="choice-grid">
            {[
              ['studio', 'Студия'],
              ['1', '1'],
              ['2', '2'],
              ['3plus', '3+'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={draft.rooms === id ? 'choice active' : 'choice'}
                onClick={() => setDraft({ ...draft, rooms: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'timing' && (
        <>
          <h1>Когда хотите купить?</h1>
          <div className="choice-grid">
            {[
              ['now', 'Сейчас'],
              ['1_3_months', '1–3 месяца'],
              ['3_6_months', '3–6 месяцев'],
              ['exploring', 'Пока смотрю'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={draft.purchaseTiming === id ? 'choice active' : 'choice'}
                onClick={() => setDraft({ ...draft, purchaseTiming: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'payment' && (
        <>
          <h1>Как планируете оплатить?</h1>
          <div className="choice-grid">
            {[
              ['cash', 'Наличные'],
              ['mortgage', 'Ипотека'],
              ['sell_and_buy', 'Продажа своей'],
              ['undecided', 'Пока не решил'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={draft.payment === id ? 'choice active' : 'choice'}
                onClick={() => setDraft({ ...draft, payment: id, mortgageStatus: id === 'mortgage' ? draft.mortgageStatus : null })}
              >
                {label}
              </button>
            ))}
          </div>
          {draft.payment === 'mortgage' && (
            <div className="choice-grid" style={{ marginTop: 12 }}>
              {[
                ['approved', 'Одобрена'],
                ['application_in_progress', 'Подаёмся'],
                ['not_applied', 'Ещё не подавали'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={draft.mortgageStatus === id ? 'choice active' : 'choice'}
                  onClick={() => setDraft({ ...draft, mortgageStatus: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {current === 'preferences' && (
        <>
          <h1>Что важно?</h1>
          <div className="choice-grid">
            {[
              ['finished', 'Отделка'],
              ['parking', 'Паркинг'],
              ['balcony', 'Балкон'],
              ['near_metro', 'Метро'],
              ['school_nearby', 'Школа'],
              ['high_floor', 'Высокий этаж'],
              ['quiet_area', 'Тихий район'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={draft.preferences.includes(id) ? 'choice active' : 'choice'}
                onClick={() => togglePref(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'consent' && (
        <>
          <h1>Сохранить подбор</h1>
          <p className="muted">
            Мы сохраним параметры поиска, избранное и запросы на просмотр. Телефон не обязателен. Сторонних трекеров нет.{' '}
            <a href="/privacy">Что именно хранится</a>
          </p>
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            Согласен на обработку данных для подбора объектов
          </label>
          {error && <p className="error">{error}</p>}
        </>
      )}

      <div className="qualify-nav">
        {step > 0 && (
          <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            Назад
          </button>
        )}
        {current !== 'consent' ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Далее
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Сохраняем…' : 'Показать объекты'}
          </button>
        )}
      </div>
      {tourDraft && (
        <p className="muted">Черновик тура заполнен на клиенте. Запись появится только после согласия.</p>
      )}
      <button
        type="button"
        className="text-link"
        onClick={() => setDraft(DEMO_QUALIFICATION_DRAFT)}
      >
        Заполнить пример
      </button>
    </div>
  );
}
