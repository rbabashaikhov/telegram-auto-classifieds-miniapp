import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, ApiError, setAdminToken } from '../api/client';
import { formatPrice } from '../lib/format';
import type { AdminListing, Listing } from '../types';
import { STATUS_LABELS } from './MyListingsPage';

const filters = [['','Все'],['pending_moderation','На модерации'],['published','Опубликованные'],['rejected','Отклонённые'],['archived','Архив']] as const;

export function ListingsAdminPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const [items, setItems] = useState<Listing[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const load = useCallback(() => api.getAdminListings(demo, status).then((data) => { setItems(data); setError(''); }).catch(() => setError('Для рабочего раздела нужен ADMIN_TOKEN.')), [demo, status]);
  useEffect(() => { void load(); }, [load]);
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">{demo ? 'Read-only demo' : 'Admin'}</p><h1>Объявления</h1></div><Link to="/">Открыть каталог</Link></header>
    {error && !demo && <form className="token-form" onSubmit={(event) => { event.preventDefault(); setAdminToken(token); void load(); }}><input type="password" placeholder="ADMIN_TOKEN" value={token} onChange={(event) => setToken(event.target.value)} /><button className="primary-button">Войти</button></form>}
    <div className="admin-filters">{filters.map(([value,label]) => <button className={status === value ? 'is-active' : ''} type="button" key={value} onClick={() => setStatus(value)}>{label}</button>)}</div>
    <div className="admin-table-wrap"><table><thead><tr><th>ID</th><th>Автомобиль</th><th>Статус</th><th>Цена</th><th>Город</th><th>Создано</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td><Link to={`${demo ? '/demo' : ''}/admin/listings/${item.id}`}>{item.brand.name} {item.model.name}</Link></td><td><span className={`status status-${item.status}`}>{STATUS_LABELS[item.status]}</span></td><td>{formatPrice(item.price)}</td><td>{item.city}</td><td>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td></tr>)}</tbody></table></div>
  </main>;
}

export function ListingAdminDetailsPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const id = Number(useParams().id);
  const [item, setItem] = useState<AdminListing | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => api.getAdminListing(id, demo).then(setItem), [id, demo]);
  useEffect(() => { void load(); }, [load]);
  const approve = async () => { try { await api.approveAdminListing(id); await load(); } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Ошибка модерации.'); } };
  const reject = async () => { try { await api.rejectAdminListing(id, reason); setReason(''); await load(); } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Укажите причину отклонения.'); } };
  if (!item) return <main className="admin-page"><div className="loading">Загрузка…</div></main>;
  return <main className="admin-page"><Link className="back-link" to={`${demo ? '/demo' : ''}/admin`}>← К объявлениям</Link>
    <div className="admin-gallery">{item.photos.map((photo) => <img key={photo.id} src={photo.url} alt="" />)}</div>
    <div className="admin-detail admin-detail-wide"><div><span className={`status status-${item.status}`}>{STATUS_LABELS[item.status]}</span><h1>{item.brand.name} {item.model.name}, {item.year}</h1><p className="details-price">{formatPrice(item.price)}</p><p>{item.city} · {item.mileage.toLocaleString('ru-RU')} км</p><dl className="admin-specs"><div><dt>Кузов</dt><dd>{item.bodyType}</dd></div><div><dt>Коробка</dt><dd>{item.transmission}</dd></div><div><dt>Привод</dt><dd>{item.driveType}</dd></div><div><dt>Двигатель</dt><dd>{item.engineVolume} л · {item.engineType}</dd></div><div><dt>Цвет</dt><dd>{item.color}</dd></div><div><dt>Обновлено</dt><dd>{new Date(item.updatedAt).toLocaleString('ru-RU')}</dd></div></dl><h2>Описание</h2><p>{item.description}</p></div>
      <aside className="moderation-panel"><h2>Владелец</h2><p>{item.owner?.name ?? 'Demo catalog'}</p>{item.owner?.username && <small>@{item.owner.username}</small>}<h2>История</h2>{item.moderationHistory.length ? item.moderationHistory.map((event) => <div className="history-event" key={event.id}><strong>{event.action}</strong><span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span>{event.reason && <p>{event.reason}</p>}</div>) : <p className="muted">Событий пока нет.</p>}
      {demo && <p className="demo-notice">Демонстрационный кабинет доступен только для чтения.</p>}
      {!demo && item.status === 'pending_moderation' && <div className="moderation-actions">{error && <p className="form-error">{error}</p>}<button className="primary-button approve-button" type="button" onClick={() => void approve()}>Опубликовать</button><label><span>Причина отклонения</span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="reject-button" type="button" onClick={() => void reject()}>Отклонить</button></div>}</aside>
    </div>
  </main>;
}
