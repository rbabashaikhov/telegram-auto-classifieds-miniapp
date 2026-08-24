import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { formatMoneyMinor } from '../lib/payment';
import { userError } from '../lib/userError';
import type { Payment, SellerListing } from '../types';

export function DemoPaymentPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getMyPayment(id).then((item) => { setPayment(item); return api.getMyListing(item.listingId); }).then(setListing).catch((cause) => setError(userError(cause, 'Платёж не найден.'))); }, [id]);
  const act = async (action: 'succeed' | 'fail' | 'cancel') => { setBusy(true); setError(''); try { setPayment(await api.demoPaymentAction(id, action)); } catch (cause) { setError(userError(cause, 'Не удалось изменить результат оплаты.')); } finally { setBusy(false); } };
  const submit = async () => { if (!payment) return; setBusy(true); try { await api.submitMyListing(payment.listingId); navigate('/my/listings'); } catch (cause) { setError(userError(cause, 'Не удалось отправить объявление.')); } finally { setBusy(false); } };
  if (!payment || !listing) return <main className="page editor-page"><div className="loading">{error || 'Загрузка…'}</div></main>;
  return <main className="page editor-page demo-checkout"><Link className="back-link" to={`/my/listings/${listing.id}/edit`}>← К объявлению</Link><section className="checkout-card"><p className="eyebrow">Демонстрация оплаты</p><h1>{payment.tariff.name}</h1><p className="checkout-amount">{formatMoneyMinor(payment.amountMinor, payment.currency)}</p><div className="checkout-summary"><strong>{listing.brand.name} {listing.model.name}, {listing.year}</strong><span>{listing.city}</span></div><div className="demo-notice">Демонстрационная оплата. Реальное списание не производится.</div>{error && <p className="form-error" role="alert">{error}</p>}
    {payment.status === 'pending' && <><p className="muted">Выберите результат, который нужно показать в демонстрации.</p><div className="checkout-actions"><button className="primary-button" disabled={busy} type="button" onClick={() => void act('succeed')}>Успешная оплата</button><button disabled={busy} type="button" onClick={() => void act('fail')}>Ошибка оплаты</button><button disabled={busy} type="button" onClick={() => void act('cancel')}>Отмена оплаты</button></div></>}
    {payment.status === 'paid' && <div className="payment-success"><strong>Оплата подтверждена</strong><button className="primary-button" disabled={busy} type="button" onClick={() => void submit()}>Отправить на модерацию</button></div>}
    {payment.status === 'failed' && <div className="payment-result payment-failed"><strong>Оплата не прошла</strong><Link className="primary-button button-link" to={`/my/listings/${listing.id}/edit`}>Повторить оплату</Link></div>}
    {payment.status === 'cancelled' && <div className="payment-result payment-cancelled"><strong>Оплата отменена</strong><Link className="primary-button button-link" to={`/my/listings/${listing.id}/edit`}>Вернуться к тарифам</Link></div>}
  </section></main>;
}
