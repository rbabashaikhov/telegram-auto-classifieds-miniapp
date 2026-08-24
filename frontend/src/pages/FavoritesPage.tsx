import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ListingCard } from '../components/ListingCard';
import type { Listing } from '../types';

export function FavoritesPage() {
  const [items, setItems] = useState<Listing[]>([]);
  useEffect(() => { api.getListingFavorites().then(setItems); }, []);
  const remove = async (id: number) => { await api.removeListingFavorite(id); setItems((current) => current.filter((x) => x.id !== id)); };
  return <main className="page simple-page"><p className="eyebrow">Личный раздел</p><h1>Избранное</h1>{items.length ? <div className="listing-grid">{items.map((item) => <ListingCard key={item.id} listing={item} favorite onFavorite={remove} />)}</div> : <div className="empty-state">Добавляйте объявления сердечком — они появятся здесь.</div>}</main>;
}
