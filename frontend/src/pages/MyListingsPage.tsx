import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { formatPrice } from '../lib/format';
import type { SellerListing } from '../types';
import { paymentState } from '../lib/payment';

export const STATUS_LABELS: Record<string, string> = { draft: 'Черновик', pending_moderation: 'На модерации', published: 'Опубликовано', rejected: 'Отклонено', archived: 'В архиве' };

export function MyListingsPage() {
  const [items, setItems] = useState<SellerListing[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.getMyListings().then(setItems); }, []);
  const submit = async (id: number) => { try { const item = await api.submitMyListing(id); setItems((all) => all.map((x) => x.id === id ? { ...x, ...item } : x)); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось отправить объявление.'); } };
  const archive = async (id: number) => { const item = await api.archiveMyListing(id); setItems((all) => all.map((x) => x.id === id ? { ...x, ...item } : x)); };
  return (
    <main className="page simple-page seller-cabinet">
      <div className="page-title-row"><div><p className="eyebrow">Личный кабинет</p><h1>Мои объявления</h1></div><Link className="primary-button button-link" to="/my/listings/new">Разместить автомобиль</Link></div>
      {error && <div className="form-error cabinet-error">{error}</div>}<div className="my-listings">{items.map((item) => { const payment = paymentState(item.payment); return <article className="my-listing" key={item.id}>
        <img src={item.photos[0]?.url || '/images/cars/car-1.svg'} alt="" />
        <div className="my-listing-main"><span className={`status status-${item.status}`}>{STATUS_LABELS[item.status]}</span><span className={`payment-state payment-${item.payment?.status ?? 'none'}`}>{payment.label}</span><h2>{item.brand.name} {item.model.name}, {item.year}</h2><strong>{formatPrice(item.price)}</strong><p>Создано {new Date(item.createdAt).toLocaleDateString('ru-RU')} · обновлено {new Date(item.updatedAt).toLocaleDateString('ru-RU')}</p></div>
        <div className="my-listing-actions"><Link to={`/my/listings/${item.id}`}>Просмотреть</Link>{['draft', 'rejected', 'published'].includes(item.status) && <Link to={`/my/listings/${item.id}/edit`}>{payment.action === 'retry' ? 'Повторить оплату' : item.status === 'draft' ? 'Продолжить' : 'Редактировать'}</Link>}{['draft','rejected'].includes(item.status) && payment.action === 'checkout' && item.payment && <Link to={item.payment.confirmationUrl || `/payments/${item.payment.id}/demo`}>Продолжить оплату</Link>}{['draft', 'rejected'].includes(item.status) && payment.action === 'submit' && <button type="button" onClick={() => void submit(item.id)}>{item.status === 'rejected' ? 'Повторно отправить' : 'Отправить на модерацию'}</button>}{['draft', 'rejected', 'published'].includes(item.status) && <button type="button" onClick={() => void archive(item.id)}>{item.status === 'published' ? 'Снять с публикации' : 'Архивировать'}</button>}</div>
      </article>; })}</div>
      {!items.length && <div className="empty-state">У вас пока нет объявлений.</div>}
    </main>
  );
}

export function MyListingDetailsPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [item, setItem] = useState<SellerListing | null>(null);
  useEffect(() => { api.getMyListing(id).then(setItem); }, [id]);
  if (!item) return <main className="page"><div className="loading">Загрузка…</div></main>;
  const rejection = item.moderationHistory.find((event) => event.action === 'rejected');
  return <main className="page details-page"><Link className="back-link" to="/my/listings">← Мои объявления</Link><div className="gallery">{item.photos.map((photo, index) => <img key={photo.id} className={index === 0 ? 'gallery-main' : ''} src={photo.url} alt="" />)}</div><section className="details-layout"><div><span className={`status status-${item.status}`}>{STATUS_LABELS[item.status]}</span><span className={`payment-state payment-${item.payment?.status ?? 'none'}`}>{paymentState(item.payment).label}</span><h1>{item.brand.name} {item.model.name}, {item.year}</h1><p className="details-price">{formatPrice(item.price)}</p></div>{['draft', 'rejected', 'published'].includes(item.status) && <Link className="favorite-detail button-link" to={`/my/listings/${id}/edit`}>Редактировать</Link>}</section>{rejection && item.status === 'rejected' && <div className="rejection-box"><strong>Причина отклонения</strong><p>{rejection.reason}</p></div>}<dl className="spec-grid"><div><dt>Пробег</dt><dd>{item.mileage.toLocaleString('ru-RU')} км</dd></div><div><dt>Двигатель</dt><dd>{item.engineVolume} л · {item.engineType}</dd></div><div><dt>Коробка</dt><dd>{item.transmission}</dd></div><div><dt>Город</dt><dd>{item.city}</dd></div></dl><section className="description"><h2>Описание</h2><p>{item.description}</p></section><section className="moderation-history"><h2>История статусов</h2>{item.moderationHistory?.length ? item.moderationHistory.map((event) => <div key={event.id}><strong>{event.action}</strong><span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span>{event.reason && <p>{event.reason}</p>}</div>) : <p>Объявление ещё не отправлялось на модерацию.</p>}</section><button className="text-button" type="button" onClick={() => navigate('/my/listings')}>Назад</button></main>;
}
