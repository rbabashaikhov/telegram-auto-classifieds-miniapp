import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { formatPrice } from '../lib/format';
import type { Listing, ListingInput, ListingStatus, VehicleBrand, VehicleModel } from '../types';
import { validateListingStep } from '../lib/listingForm';

const STEPS = ['Автомобиль', 'Характеристики', 'Продажа', 'Фото', 'Предпросмотр', 'Готово'];
const empty: ListingInput = { brandId: 0, modelId: 0, year: new Date().getFullYear(), price: 0, mileage: 0, bodyType: 'sedan', transmission: 'automatic', driveType: 'front', engineType: 'petrol', engineVolume: 2, color: '', city: '', description: '' };
const choices = { bodyType: [['sedan','Седан'],['suv','Кроссовер'],['hatchback','Хэтчбек'],['liftback','Лифтбек'],['wagon','Универсал'],['coupe','Купе'],['minivan','Минивэн'],['pickup','Пикап']], transmission: [['automatic','Автомат'],['manual','Механика'],['robot','Робот'],['variator','Вариатор']], driveType: [['front','Передний'],['rear','Задний'],['all','Полный']], engineType: [['petrol','Бензин'],['diesel','Дизель'],['hybrid','Гибрид'],['electric','Электро']] } as const;

export function ListingEditorPage() {
  const routeId = Number(useParams().id) || null;
  const navigate = useNavigate();
  const [id, setId] = useState<number | null>(routeId);
  const [form, setForm] = useState<ListingInput>(empty);
  const [status, setStatus] = useState<ListingStatus>('draft');
  const [photos, setPhotos] = useState<Listing['photos']>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const brand = brands.find((x) => x.id === form.brandId);
  const model = models.find((x) => x.id === form.modelId);
  const set = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => { api.getVehicleBrands().then(setBrands); if (routeId) api.getMyListing(routeId).then((item) => { setForm({ brandId: item.brand.id, modelId: item.model.id, year: item.year, price: item.price, mileage: item.mileage, bodyType: item.bodyType, transmission: item.transmission, driveType: item.driveType, engineType: item.engineType, engineVolume: item.engineVolume, color: item.color, city: item.city, description: item.description }); setPhotos(item.photos); setStatus(item.status); }); }, [routeId]);
  useEffect(() => { if (form.brandId) api.getVehicleModels(brands.find((x) => x.id === form.brandId)?.slug).then(setModels); else setModels([]); }, [form.brandId, brands]);
  const progress = useMemo(() => `${((step + 1) / STEPS.length) * 100}%`, [step]);

  const save = async () => {
    const listing = id ? await api.updateMyListing(id, form) : await api.createMyListing(form);
    if (!id) { setId(listing.id); window.history.replaceState(null, '', `/my/listings/${listing.id}/edit`); }
    setStatus(listing.status); setPhotos(listing.photos);
    return listing;
  };
  const next = async () => {
    const message = validateListingStep(step, form); if (message) { setError(message); return; } setError('');
    try { if (step === 2) await save(); setStep((x) => Math.min(x + 1, STEPS.length - 1)); } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Не удалось сохранить объявление.'); }
  };
  const upload = async (files: FileList | null) => {
    if (!id || !files?.length) return;
    const selected = Array.from(files);
    if (selected.some((file) => !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError('Допустимы JPG, PNG, WebP или GIF до 5 МБ.'); return; }
    if (photos.length + selected.length > 10) { setError('Можно загрузить не более 10 фотографий.'); return; }
    setBusy(true); try { const added = await api.uploadListingPhotos(id, selected); setPhotos((all) => [...all, ...added]); setError(''); } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Ошибка загрузки.'); } finally { setBusy(false); }
  };
  const removePhoto = async (photoId: number) => { if (!id) return; await api.removeListingPhoto(id, photoId); setPhotos((all) => all.filter((x) => x.id !== photoId)); };
  const submit = async () => { if (!id) return; setBusy(true); try { await api.submitMyListing(id); navigate('/my/listings'); } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Не удалось отправить объявление.'); } finally { setBusy(false); } };

  return <main className="page editor-page"><button className="back-link button-reset" type="button" onClick={() => step ? setStep(step - 1) : navigate('/my/listings')}>← {step ? 'Назад' : 'Мои объявления'}</button><div className="editor-shell"><div className="step-header"><span>Шаг {step + 1} из {STEPS.length}</span><strong>{STEPS[step]}</strong><div><i style={{ width: progress }} /></div></div>{error && <div className="form-error">{error}</div>}
    {step === 0 && <section className="form-step"><h1>Какой автомобиль продаёте?</h1><label><span>Марка</span><select value={form.brandId || ''} onChange={(e) => { set('brandId', Number(e.target.value)); set('modelId', 0); }}><option value="">Выберите марку</option>{brands.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label><span>Модель</span><select value={form.modelId || ''} onChange={(e) => set('modelId', Number(e.target.value))}><option value="">Выберите модель</option>{models.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label><span>Год выпуска</span><input type="number" value={form.year} onChange={(e) => set('year', Number(e.target.value))} /></label></section>}
    {step === 1 && <section className="form-step"><h1>Характеристики</h1><div className="form-grid"><label><span>Пробег, км</span><input type="number" min="0" value={form.mileage} onChange={(e) => set('mileage', Number(e.target.value))} /></label>{(['bodyType','transmission','driveType','engineType'] as const).map((key) => <label key={key}><span>{{ bodyType:'Кузов', transmission:'Коробка', driveType:'Привод', engineType:'Двигатель' }[key]}</span><select value={form[key]} onChange={(e) => set(key, e.target.value)}>{choices[key].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>)}<label><span>Объём двигателя, л</span><input type="number" min="0.1" max="10" step="0.1" value={form.engineVolume} onChange={(e) => set('engineVolume', Number(e.target.value))} /></label><label><span>Цвет</span><input value={form.color} onChange={(e) => set('color', e.target.value)} /></label></div></section>}
    {step === 2 && <section className="form-step"><h1>Условия продажи</h1><label><span>Цена, ₽</span><input type="number" min="1" value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} /></label><label><span>Город</span><input value={form.city} onChange={(e) => set('city', e.target.value)} /></label><label><span>Описание</span><textarea rows={7} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} /><small>{form.description.length}/5000</small></label></section>}
    {step === 3 && <section className="form-step"><h1>Фотографии</h1><p>До 10 изображений JPG, PNG, WebP или GIF, каждое до 5 МБ.</p>{!['draft','rejected'].includes(status) ? <div className="demo-notice">После изменения опубликованное объявление отправлено на повторную модерацию. Текущие фотографии сохранены без изменений.</div> : <label className="photo-uploader"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => void upload(e.target.files)} disabled={busy} /><strong>{busy ? 'Загрузка…' : 'Выбрать фотографии'}</strong><span>или перетащите файлы сюда</span></label>}<div className="photo-editor-grid">{photos.map((photo) => <div key={photo.id}><img src={photo.url} alt="" />{['draft','rejected'].includes(status) && <button type="button" onClick={() => void removePhoto(photo.id)}>Удалить</button>}</div>)}</div></section>}
    {step === 4 && <section className="form-step"><h1>Предпросмотр</h1><div className="listing-preview"><img src={photos[0]?.url || '/images/cars/car-1.svg'} alt="" /><div><p className="eyebrow">{form.city}</p><h2>{brand?.name} {model?.name}, {form.year}</h2><strong>{formatPrice(form.price)}</strong><div className="chips"><span>{form.mileage.toLocaleString('ru-RU')} км</span><span>{form.engineVolume} л</span><span>{form.transmission}</span></div><p>{form.description}</p></div></div><button className="text-button" type="button" onClick={() => setStep(0)}>Вернуться к редактированию</button></section>}
    {step === 5 && <section className="form-step final-step"><h1>{status === 'pending_moderation' ? 'Изменения отправлены на модерацию' : 'Объявление готово'}</h1><p>{status === 'pending_moderation' ? 'После проверки оно снова появится в публичном каталоге.' : 'Сохраните черновик или отправьте объявление администратору на проверку.'}</p>{status !== 'pending_moderation' && <button className="primary-button" disabled={busy || !photos.length} type="button" onClick={() => void submit()}>Отправить на модерацию</button>}<button className="favorite-detail" type="button" onClick={() => navigate('/my/listings')}>{status === 'pending_moderation' ? 'В мои объявления' : 'Сохранить черновик'}</button>{!photos.length && status !== 'pending_moderation' && <small>Для отправки добавьте хотя бы одну фотографию.</small>}</section>}
    {step < 5 && <div className="editor-footer"><button className="primary-button" type="button" onClick={() => void next()}>{step === 4 ? 'Всё верно' : 'Продолжить'}</button></div>}
  </div></main>;
}
