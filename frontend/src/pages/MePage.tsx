import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatPrice, roomsLabel } from '../lib/format';
import type { BuyerProfile, PropertyCard } from '../types';

export function MePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getMe>> | null>(null);

  useEffect(() => {
    void api.getMe().then(setData);
  }, []);

  if (!data) return <div className="page loading">Загрузка…</div>;

  const profile = data.profile as BuyerProfile | null;
  const matches = (data.matches || []) as Array<{ score: number; property: PropertyCard }>;

  return (
    <div className="page">
      <p className="eyebrow">Клиентский кабинет</p>
      <h1>Мой подбор</h1>
      {profile ? (
        <section className="card">
          <h2>Пожелания</h2>
          <p>
            {roomsLabel(profile.rooms)}, {formatPrice(profile.budgetMin)} – {formatPrice(profile.budgetMax)}
          </p>
          <p className="muted">
            {profile.purchaseTiming} · {profile.payment}
          </p>
          <Link to="/qualify">Изменить параметры</Link>
        </section>
      ) : (
        <Link className="btn btn-primary" to="/qualify">
          Пройти подбор
        </Link>
      )}
      <section>
        <h2>Рекомендации</h2>
        {matches.slice(0, 3).map((item) => (
          <Link key={item.property.id} className="row-link" to={`/properties/${item.property.id}`}>
            {item.score}% · {item.property.project.name} {item.property.unitNumber}
          </Link>
        ))}
      </section>
      <section>
        <h2>Избранное</h2>
        {data.favorites.map((item) => (
          <Link key={item.propertyId} className="row-link" to={`/properties/${item.propertyId}`}>
            {item.property.project.name} · {item.property.unitNumber}
          </Link>
        ))}
      </section>
      <section>
        <h2>Просмотры</h2>
        {data.viewings.map((item) => (
          <p key={item.id}>
            {item.scheduledAt.replace('T', ' ').slice(0, 16)} · {item.status}
          </p>
        ))}
      </section>
      <button className="btn btn-ghost" onClick={() => void api.resetMe().then(() => location.reload())}>
        Удалить мои демо-данные
      </button>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="page">
      <h1>Какие данные хранятся</h1>
      <ul className="reasons">
        <li>Telegram id и имя — чтобы узнать вас при следующем входе</li>
        <li>Параметры поиска и согласие на подбор</li>
        <li>Избранное, просмотры, события в приложении</li>
        <li>UTM-метки источника, если вы пришли из рекламы</li>
        <li>Телефон — только если вы его сами оставите</li>
      </ul>
      <p>Сторонних трекеров нет. Демо-профиль можно сбросить в разделе «Мой подбор».</p>
    </div>
  );
}
