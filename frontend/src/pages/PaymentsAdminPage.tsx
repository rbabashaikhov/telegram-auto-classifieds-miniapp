import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, setAdminToken } from '../api/client';
import { formatMoneyMinor } from '../lib/payment';
import type { AdminPayment, PaymentStatus } from '../types';

const filters: Array<['' | PaymentStatus, string]> = [['','Все'],['pending','Ожидают'],['paid','Оплачены'],['failed','Ошибки'],['cancelled','Отменены']];
const labels: Record<PaymentStatus,string> = { pending:'Ожидает оплаты', paid:'Оплачено', failed:'Ошибка', cancelled:'Отменено' };

export function PaymentsAdminPage() {
  const demo = useLocation().pathname.startsWith('/demo/');
  const [items, setItems] = useState<AdminPayment[]>([]); const [status, setStatus] = useState<'' | PaymentStatus>(''); const [error, setError] = useState(''); const [token, setToken] = useState('');
  const load = useCallback(() => api.getAdminPayments(demo, status).then((data) => { setItems(data); setError(''); }).catch(() => setError('Для рабочего раздела нужен ADMIN_TOKEN.')), [demo,status]);
  useEffect(() => { void load(); }, [load]);
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">{demo ? 'Read-only demo' : 'Admin'}</p><h1>Платежи</h1></div><nav className="admin-nav"><Link to={`${demo ? '/demo' : ''}/admin`}>Объявления</Link><Link to="/">Каталог</Link></nav></header>{error && !demo && <form className="token-form" onSubmit={(event) => { event.preventDefault(); setAdminToken(token); void load(); }}><input type="password" placeholder="ADMIN_TOKEN" value={token} onChange={(event) => setToken(event.target.value)} /><button className="primary-button">Войти</button></form>}<div className="admin-filters">{filters.map(([value,label]) => <button className={status === value ? 'is-active' : ''} type="button" key={value} onClick={() => setStatus(value)}>{label}</button>)}</div><div className="admin-table-wrap"><table><thead><tr><th>ID</th><th>Объявление</th><th>Пользователь</th><th>Тариф</th><th>Сумма</th><th>Статус</th><th>Провайдер</th><th>Создан</th><th>Оплачен</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><Link to={`${demo ? '/demo' : ''}/admin/payments/${item.id}`}>{item.id}</Link></td><td>{item.listing?.title ?? `#${item.listingId}`}</td><td>{item.customer?.name ?? `#${item.customerId}`}</td><td>{item.tariff.name}</td><td>{formatMoneyMinor(item.amountMinor,item.currency)}</td><td><span className={`payment-state payment-${item.status}`}>{labels[item.status]}</span></td><td>{item.provider}</td><td>{new Date(item.createdAt).toLocaleString('ru-RU')}</td><td>{item.paidAt ? new Date(item.paidAt).toLocaleString('ru-RU') : '—'}</td></tr>)}</tbody></table></div></main>;
}

export function PaymentAdminDetailsPage() {
  const demo = useLocation().pathname.startsWith('/demo/'); const id = Number(useParams().id); const [item,setItem] = useState<AdminPayment | null>(null);
  useEffect(() => { api.getAdminPayment(id,demo).then(setItem); }, [id,demo]);
  if (!item) return <main className="admin-page"><div className="loading">Загрузка…</div></main>;
  return <main className="admin-page"><Link className="back-link" to={`${demo ? '/demo' : ''}/admin/payments`}>← К платежам</Link><section className="admin-detail payment-admin-detail"><div><p className="eyebrow">Payment #{item.id}</p><h1>{item.listing?.title}</h1><p className="details-price">{formatMoneyMinor(item.amountMinor,item.currency)}</p><dl className="admin-specs"><div><dt>Статус</dt><dd>{labels[item.status]}</dd></div><div><dt>Тариф</dt><dd>{item.tariff.name} · {item.tariff.durationDays} дней</dd></div><div><dt>Провайдер</dt><dd>{item.provider}</dd></div><div><dt>Provider payment ID</dt><dd>{item.providerPaymentId ?? '—'}</dd></div><div><dt>Idempotency key</dt><dd className="wrap-value">{item.idempotencyKey}</dd></div><div><dt>Пользователь</dt><dd>{item.customer?.name ?? item.customerId}</dd></div></dl></div><aside className="moderation-panel"><h2>События</h2>{item.events.length ? item.events.map((event) => <div className="history-event" key={event.id}><strong>{event.status}</strong><span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span><small>{event.providerEventId}</small></div>) : <p className="muted">Событий пока нет.</p>}{demo && <p className="demo-notice">Только для чтения.</p>}</aside></section></main>;
}
