import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ListingCard } from '../components/ListingCard';
import type { Listing } from '../types';

export function FavoritesPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.getListingFavorites().then(setItems).catch(() => setError('Не удалось загрузить избранное.')).finally(() => setLoading(false)); }, []);
  const remove = async (id: number) => { try { await api.removeListingFavorite(id); setItems((current) => current.filter((x) => x.id !== id)); } catch { setError('Не удалось удалить объявление из избранного.'); } };
  return <main className="page simple-page"><p className="eyebrow">Личный раздел</p><h1>Избранное</h1>{loading ? <div className="loading">Загрузка…</div> : error ? <div className="empty-state error-state" role="alert">{error}</div> : items.length ? <div className="listing-grid">{items.map((item) => <ListingCard key={item.id} listing={item} favorite onFavorite={remove} />)}</div> : <div className="empty-state"><p>Здесь появятся объявления, которые вы добавите в избранное.</p><Link className="primary-button button-link" to="/">Перейти в каталог</Link></div>}</main>;
}
