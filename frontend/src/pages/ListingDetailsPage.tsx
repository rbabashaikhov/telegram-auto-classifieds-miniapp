import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { formatPrice } from '../lib/format';
import { vehicleLabel } from '../lib/automotiveLabels';
import { userError } from '../lib/userError';
import type { Listing } from '../types';

export function ListingDetailsPage() {
  const id = Number(useParams().id);
  const [listing, setListing] = useState<Listing | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [contactShown, setContactShown] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api.getListing(id).then(setListing).catch((cause) => setError(userError(cause, 'Не удалось загрузить объявление.'))); api.getListingFavorites().then((items) => setFavorite(items.some((x) => x.id === id))).catch(() => undefined); }, [id]);
  if (!listing) return <main className="page"><div className="loading">{error || 'Загрузка…'}</div></main>;
  const toggle = async () => { favorite ? await api.removeListingFavorite(id) : await api.addListingFavorite(id); setFavorite(!favorite); };
  const specs = [['Год', listing.year], ['Пробег', `${listing.mileage.toLocaleString('ru-RU')} км`], ['Кузов', vehicleLabel(listing.bodyType)], ['Двигатель', `${listing.engineVolume} л · ${vehicleLabel(listing.engineType)}`], ['Коробка', vehicleLabel(listing.transmission)], ['Привод', vehicleLabel(listing.driveType)], ['Цвет', listing.color]];
  return (
    <main className="page details-page">
      <Link className="back-link" to="/">← К каталогу</Link>
      <div className="gallery">{listing.photos.map((photo, index) => <img key={photo.id} className={index === 0 ? 'gallery-main' : ''} src={photo.url} alt={`${listing.brand.name} ${listing.model.name}, фото ${index + 1}`} />)}</div>
      <section className="details-layout">
        <div><p className="eyebrow">{listing.city}</p><h1>{listing.brand.name} {listing.model.name}, {listing.year}</h1><p className="details-price">{formatPrice(listing.price)}</p></div>
        <button className={`favorite-detail ${favorite ? 'is-active' : ''}`} type="button" onClick={toggle}>{favorite ? '♥ В избранном' : '♡ В избранное'}</button>
      </section>
      <dl className="spec-grid">{specs.map(([name, value]) => <div key={String(name)}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <section className="description"><h2>Описание</h2><p>{listing.description}</p><p className="published-date">Опубликовано {new Date(listing.createdAt).toLocaleDateString('ru-RU')}</p></section>
      <section className="contact-card"><div><h2>Связаться с продавцом</h2><p>Демонстрационный режим: персональные данные не передаются.</p></div><button className="primary-button" type="button" onClick={() => setContactShown(true)}>Показать контакт</button>{contactShown && <p className="demo-notice">В рабочей версии здесь будет безопасный способ связи с продавцом.</p>}</section>
    </main>
  );
}
