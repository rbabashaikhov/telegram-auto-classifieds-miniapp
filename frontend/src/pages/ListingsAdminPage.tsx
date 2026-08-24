import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, setAdminToken } from '../api/client';
import { formatPrice } from '../lib/format';
import { LISTING_STATUS_LABELS, moderationLabel, vehicleLabel } from '../lib/automotiveLabels';
import { userError } from '../lib/userError';
import type { AdminListing, Listing } from '../types';

const filters = [['','Все'],['pending_moderation','На модерации'],['published','Опубликованные'],['rejected','Отклонённые'],['archived','Архив']] as const;

export function ListingsAdminPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const [items, setItems] = useState<Listing[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); return api.getAdminListings(demo, status).then((data) => { setItems(data); setError(''); }).catch((cause) => setError(userError(cause, demo ? 'Не удалось загрузить демо-кабинет.' : 'Введите токен администратора для доступа.'))).finally(() => setLoading(false)); }, [demo, status]);
  useEffect(() => { void load(); }, [load]);
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">{demo ? 'Демо-кабинет · только просмотр' : 'Кабинет администратора'}</p><h1>Объявления</h1></div><nav className="admin-nav"><Link to={`${demo ? '/demo' : ''}/admin/payments`}>Платежи</Link><Link to="/">Открыть каталог</Link></nav></header>
    {error && !demo && <form className="token-form" onSubmit={(event) => { event.preventDefault(); setAdminToken(token); void load(); }}><label><span>Токен администратора</span><input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} /></label><button className="primary-button">Войти</button></form>}
    {error && demo && <div className="empty-state error-state" role="alert">{error}</div>}
    <div className="admin-filters">{filters.map(([value,label]) => <button className={status === value ? 'is-active' : ''} type="button" key={value} onClick={() => setStatus(value)}>{label}</button>)}</div>
    {loading ? <div className="loading">Загрузка…</div> : !error && !items.length ? <div className="empty-state">Объявлений с таким статусом пока нет.</div> : error ? null : <div className="admin-table-wrap"><table><thead><tr><th>ID</th><th>Автомобиль</th><th>Статус</th><th>Цена</th><th>Город</th><th>Создано</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td><Link to={`${demo ? '/demo' : ''}/admin/listings/${item.id}`}>{item.brand.name} {item.model.name}</Link></td><td><span className={`status status-${item.status}`}>{LISTING_STATUS_LABELS[item.status]}</span></td><td>{formatPrice(item.price)}</td><td>{item.city}</td><td>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td></tr>)}</tbody></table></div>}
  </main>;
}

export function ListingAdminDetailsPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const id = Number(useParams().id);
  const [item, setItem] = useState<AdminListing | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => api.getAdminListing(id, demo).then((data) => { setItem(data); setError(''); }).catch((cause) => setError(userError(cause, 'Не удалось загрузить объявление.'))), [id, demo]);
  useEffect(() => { void load(); }, [load]);
  const approve = async () => { try { await api.approveAdminListing(id); await load(); } catch (cause) { setError(userError(cause, 'Не удалось опубликовать объявление.')); } };
  const reject = async () => { if (!reason.trim()) { setError('Укажите причину отклонения.'); return; } try { await api.rejectAdminListing(id, reason); setReason(''); await load(); } catch (cause) { setError(userError(cause, 'Не удалось отклонить объявление.')); } };
  if (!item) return <main className="admin-page"><div className="loading">{error || 'Загрузка…'}</div></main>;
  return <main className="admin-page"><Link className="back-link" to={`${demo ? '/demo' : ''}/admin`}>← К объявлениям</Link>
    <div className="admin-gallery">{item.photos.map((photo, index) => <img key={photo.id} src={photo.url} alt={`${item.brand.name} ${item.model.name}, фото ${index + 1}`} />)}</div>
    <div className="admin-detail admin-detail-wide"><div><span className={`status status-${item.status}`}>{LISTING_STATUS_LABELS[item.status]}</span><h1>{item.brand.name} {item.model.name}, {item.year}</h1><p className="details-price">{formatPrice(item.price)}</p><p>{item.city} · {item.mileage.toLocaleString('ru-RU')} км</p><dl className="admin-specs"><div><dt>Кузов</dt><dd>{vehicleLabel(item.bodyType)}</dd></div><div><dt>Коробка</dt><dd>{vehicleLabel(item.transmission)}</dd></div><div><dt>Привод</dt><dd>{vehicleLabel(item.driveType)}</dd></div><div><dt>Двигатель</dt><dd>{item.engineVolume} л · {vehicleLabel(item.engineType)}</dd></div><div><dt>Цвет</dt><dd>{item.color}</dd></div><div><dt>Обновлено</dt><dd>{new Date(item.updatedAt).toLocaleString('ru-RU')}</dd></div></dl><h2>Описание</h2><p>{item.description}</p></div>
      <aside className="moderation-panel"><h2>Владелец</h2><p>{item.owner?.name ?? 'Каталожное объявление'}</p>{item.owner?.username && <small>@{item.owner.username}</small>}<h2>История</h2>{item.moderationHistory.length ? item.moderationHistory.map((event) => <div className="history-event" key={event.id}><strong>{moderationLabel(event.action)}</strong><span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span>{event.reason && <p>{event.reason}</p>}</div>) : <p className="muted">Событий пока нет.</p>}
      {demo && <p className="demo-notice">Демонстрационный кабинет доступен только для чтения.</p>}
      {!demo && item.status === 'pending_moderation' && <div className="moderation-actions">{error && <p className="form-error">{error}</p>}<button className="primary-button approve-button" type="button" onClick={() => void approve()}>Опубликовать</button><label><span>Причина отклонения</span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="reject-button" type="button" onClick={() => void reject()}>Отклонить</button></div>}</aside>
    </div>
  </main>;
}
