import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import type { Listing } from '../types';

const labels: Record<string, string> = { automatic: 'Автомат', manual: 'Механика', robot: 'Робот', variator: 'Вариатор', petrol: 'Бензин', diesel: 'Дизель' };

export function ListingCard({ listing, favorite, onFavorite }: { listing: Listing; favorite: boolean; onFavorite: (id: number) => void }) {
  return (
    <article className="listing-card">
      <Link to={`/listings/${listing.id}`} className="listing-image-wrap">
        <img className="listing-image" src={listing.photos[0]?.url} alt={`${listing.brand.name} ${listing.model.name}`} />
      </Link>
      <button className={`favorite-button ${favorite ? 'is-active' : ''}`} type="button" aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'} onClick={() => onFavorite(listing.id)}>
        {favorite ? '♥' : '♡'}
      </button>
      <Link to={`/listings/${listing.id}`} className="listing-content">
        <h3>{listing.brand.name} {listing.model.name}</h3>
        <strong className="listing-price">{formatPrice(listing.price)}</strong>
        <div className="chips">
          <span>{listing.year}</span><span>{listing.mileage.toLocaleString('ru-RU')} км</span>
          <span>{listing.engineVolume} л · {labels[listing.engineType] ?? listing.engineType}</span>
          <span>{labels[listing.transmission] ?? listing.transmission}</span>
        </div>
        <p className="listing-city">{listing.city}</p>
      </Link>
    </article>
  );
}
