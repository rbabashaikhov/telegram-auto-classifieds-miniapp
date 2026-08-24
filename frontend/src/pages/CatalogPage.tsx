import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ListingCard } from '../components/ListingCard';
import type { Listing, ListingFilters, VehicleBrand, VehicleModel } from '../types';

const initial: ListingFilters = { sort: 'newest' };
const Select = ({ label, value, onChange, children }: { label: string; value?: string; onChange: (value: string) => void; children: React.ReactNode }) => (
  <label><span>{label}</span><select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>{children}</select></label>
);

export function CatalogPage() {
  const [draft, setDraft] = useState<ListingFilters>(initial);
  const [filters, setFilters] = useState<ListingFilters>(initial);
  const [listings, setListings] = useState<Listing[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const set = (key: keyof ListingFilters, value: string) => setDraft((current) => ({ ...current, [key]: value || undefined }));

  useEffect(() => { api.getVehicleBrands().then(setBrands); api.getListingFavorites().then((items) => setFavorites(new Set(items.map((x) => x.id)))).catch(() => undefined); }, []);
  useEffect(() => { api.getVehicleModels(draft.brand).then(setModels); }, [draft.brand]);
  useEffect(() => { setLoading(true); setError(''); api.getListings(filters).then(setListings).catch(() => { setListings([]); setError('Не удалось загрузить каталог. Обновите страницу и попробуйте снова.'); }).finally(() => setLoading(false)); }, [filters]);

  const toggleFavorite = async (id: number) => {
    const active = favorites.has(id);
    setFavorites((current) => { const next = new Set(current); active ? next.delete(id) : next.add(id); return next; });
    try { active ? await api.removeListingFavorite(id) : await api.addListingFavorite(id); }
    catch { setFavorites((current) => { const next = new Set(current); active ? next.add(id) : next.delete(id); return next; }); }
  };

  return (
    <main className="page catalog-page">
      <section className="hero" data-tour="home-cta">
        <p className="eyebrow">Каталог автомобилей</p>
        <h1>Автомобили с понятными характеристиками</h1>
        <p>Найдите подходящий вариант в каталоге демонстрационных объявлений.</p>
      </section>
      <div className="catalog-toolbar">
        <button className="filter-toggle" type="button" onClick={() => setFiltersOpen(!filtersOpen)}>Фильтры</button>
        <Select label="Сортировка" value={draft.sort} onChange={(value) => { set('sort', value); setFilters((current) => ({ ...current, sort: value as ListingFilters['sort'] })); }}>
          <option value="newest">Сначала новые</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option><option value="year_desc">Сначала новее по году</option><option value="mileage_asc">Сначала с меньшим пробегом</option>
        </Select>
      </div>
      <div className="catalog-layout">
        <aside className={`filters ${filtersOpen ? 'is-open' : ''}`}>
          <div className="filters-head"><h2>Фильтры</h2><button type="button" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)}>×</button></div>
          <Select label="Марка" value={draft.brand} onChange={(value) => { setDraft((x) => ({ ...x, brand: value || undefined, model: undefined })); }}><option value="">Все марки</option>{brands.map((x) => <option key={x.id} value={x.slug}>{x.name}</option>)}</Select>
          <Select label="Модель" value={draft.model} onChange={(value) => set('model', value)}><option value="">Все модели</option>{models.map((x) => <option key={x.id} value={x.slug}>{x.name}</option>)}</Select>
          <div className="field-pair"><label><span>Цена от</span><input inputMode="numeric" value={draft.priceMin ?? ''} onChange={(e) => set('priceMin', e.target.value)} /></label><label><span>до</span><input inputMode="numeric" value={draft.priceMax ?? ''} onChange={(e) => set('priceMax', e.target.value)} /></label></div>
          <div className="field-pair"><label><span>Год от</span><input inputMode="numeric" value={draft.yearMin ?? ''} onChange={(e) => set('yearMin', e.target.value)} /></label><label><span>до</span><input inputMode="numeric" value={draft.yearMax ?? ''} onChange={(e) => set('yearMax', e.target.value)} /></label></div>
          <label><span>Пробег до, км</span><input inputMode="numeric" value={draft.mileageMax ?? ''} onChange={(e) => set('mileageMax', e.target.value)} /></label>
          <Select label="Кузов" value={draft.bodyType} onChange={(v) => set('bodyType', v)}><option value="">Любой</option><option value="sedan">Седан</option><option value="suv">Кроссовер</option><option value="hatchback">Хэтчбек</option><option value="liftback">Лифтбек</option><option value="wagon">Универсал</option></Select>
          <Select label="Коробка" value={draft.transmission} onChange={(v) => set('transmission', v)}><option value="">Любая</option><option value="automatic">Автомат</option><option value="manual">Механика</option><option value="robot">Робот</option><option value="variator">Вариатор</option></Select>
          <Select label="Привод" value={draft.driveType} onChange={(v) => set('driveType', v)}><option value="">Любой</option><option value="front">Передний</option><option value="rear">Задний</option><option value="all">Полный</option></Select>
          <Select label="Двигатель" value={draft.engineType} onChange={(v) => set('engineType', v)}><option value="">Любой</option><option value="petrol">Бензин</option><option value="diesel">Дизель</option></Select>
          <label><span>Город</span><input value={draft.city ?? ''} onChange={(e) => set('city', e.target.value)} /></label>
          <button className="primary-button" type="button" onClick={() => { setFilters(draft); setFiltersOpen(false); }}>Показать</button>
          <button className="text-button" type="button" onClick={() => { setDraft(initial); setFilters(initial); }}>Сбросить</button>
        </aside>
        {filtersOpen && <button className="drawer-backdrop" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)} />}
        <section className="catalog-results">
          <h2>{loading ? 'Загрузка…' : `Найдено: ${listings.length}`}</h2>
          {error && <div className="empty-state error-state" role="alert">{error}</div>}
          <div className="listing-grid">{listings.map((item) => <ListingCard key={item.id} listing={item} favorite={favorites.has(item.id)} onFavorite={toggleFavorite} />)}</div>
          {!loading && !error && listings.length === 0 && <div className="empty-state">По этим параметрам ничего не найдено. Измените фильтры или сбросьте их.</div>}
        </section>
      </div>
    </main>
  );
}
