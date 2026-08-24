import { useState } from 'react';
import { api } from '../api/client';

export function SellPage() {
  const [form, setForm] = useState({
    location: 'primorsky',
    propertyType: 'secondary',
    rooms: '2',
    area: 64,
    condition: 'good',
    desiredPrice: 18_000_000,
    saleTiming: '1_3_months',
    comment: '',
    contact: '',
    consent: false,
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!form.consent) {
      setError('Нужно согласие на обработку заявки.');
      return;
    }
    try {
      await api.createSellerLead(form);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  if (done) {
    return (
      <div className="page">
        <h1>Заявка принята</h1>
        <p>Это отдельный поток собственников. Оценку квартиры автоматически не считаем — менеджер свяжется.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="eyebrow">Собственникам</p>
      <h1>Продать квартиру</h1>
      <label>
        Район
        <select value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}>
          <option value="primorsky">Приморский</option>
          <option value="moskovsky">Московский</option>
          <option value="central">Центральный</option>
          <option value="vyborgsky">Выборгский</option>
          <option value="vasileostrovsky">Василеостровский</option>
        </select>
      </label>
      <label>
        Тип
        <select value={form.propertyType} onChange={(event) => setForm({ ...form, propertyType: event.target.value })}>
          <option value="new_build">Новостройка</option>
          <option value="secondary">Вторичка</option>
          <option value="apartments">Апартаменты</option>
        </select>
      </label>
      <label>
        Комнаты
        <select value={form.rooms} onChange={(event) => setForm({ ...form, rooms: event.target.value })}>
          <option value="studio">Студия</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3plus">3+</option>
        </select>
      </label>
      <label>
        Площадь
        <input type="number" value={form.area} onChange={(event) => setForm({ ...form, area: Number(event.target.value) })} />
      </label>
      <label>
        Состояние
        <select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
          <option value="excellent">Отличное</option>
          <option value="good">Хорошее</option>
          <option value="needs_renovation">Нужен ремонт</option>
          <option value="unfinished">Без отделки</option>
        </select>
      </label>
      <label>
        Желаемая цена
        <input
          type="number"
          value={form.desiredPrice}
          onChange={(event) => setForm({ ...form, desiredPrice: Number(event.target.value) })}
        />
      </label>
      <label>
        Когда продавать
        <select value={form.saleTiming} onChange={(event) => setForm({ ...form, saleTiming: event.target.value })}>
          <option value="now">Сейчас</option>
          <option value="1_3_months">1–3 месяца</option>
          <option value="3_6_months">3–6 месяцев</option>
          <option value="exploring">Пока думаю</option>
        </select>
      </label>
      <label>
        Комментарий
        <textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
      </label>
      <label>
        Контакт
        <input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
      </label>
      <label className="consent">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(event) => setForm({ ...form, consent: event.target.checked })}
        />
        Согласен передать заявку менеджеру
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-block" onClick={() => void submit()}>
        Отправить
      </button>
    </div>
  );
}
