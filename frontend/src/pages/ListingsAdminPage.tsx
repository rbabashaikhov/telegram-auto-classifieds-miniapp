import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, setAdminToken } from '../api/client';
import { formatPrice } from '../lib/format';
import type { Listing } from '../types';

const statusLabels: Record<string, string> = { draft: 'Черновик', pending_moderation: 'На проверке', published: 'Опубликовано', rejected: 'Отклонено', archived: 'В архиве' };

export function ListingsAdminPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const load = () => api.getAdminListings(demo).then(setItems).catch(() => setError('Для рабочего раздела нужен ADMIN_TOKEN.'));
  useEffect(() => { void load(); }, [demo]);
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">{demo ? 'Read-only demo' : 'Admin'}</p><h1>Объявления</h1></div><Link to="/">Открыть каталог</Link></header>{error && !demo && <form className="token-form" onSubmit={(e) => { e.preventDefault(); setAdminToken(token); setError(''); load(); }}><input type="password" placeholder="ADMIN_TOKEN" value={token} onChange={(e) => setToken(e.target.value)} /><button className="primary-button">Войти</button></form>}<div className="admin-table-wrap"><table><thead><tr><th>ID</th><th>Автомобиль</th><th>Статус</th><th>Цена</th><th>Город</th><th>Создано</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td><Link to={`${demo ? '/demo' : ''}/admin/listings/${item.id}`}>{item.brand.name} {item.model.name}</Link></td><td><span className={`status status-${item.status}`}>{statusLabels[item.status]}</span></td><td>{formatPrice(item.price)}</td><td>{item.city}</td><td>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td></tr>)}</tbody></table></div></main>;
}

export function ListingAdminDetailsPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const id = Number(useParams().id);
  const [item, setItem] = useState<Listing | null>(null);
  useEffect(() => { api.getAdminListing(id, demo).then(setItem); }, [id, demo]);
  if (!item) return <main className="admin-page"><div className="loading">Загрузка…</div></main>;
  return <main className="admin-page"><Link className="back-link" to={`${demo ? '/demo' : ''}/admin`}>← К объявлениям</Link><div className="admin-detail"><img src={item.photos[0]?.url} alt="" /><div><span className={`status status-${item.status}`}>{statusLabels[item.status]}</span><h1>{item.brand.name} {item.model.name}, {item.year}</h1><p className="details-price">{formatPrice(item.price)}</p><p>{item.city} · {item.mileage.toLocaleString('ru-RU')} км</p><p>{item.description}</p>{demo && <p className="demo-notice">Демонстрационный кабинет доступен только для чтения.</p>}</div></div></main>;
}
