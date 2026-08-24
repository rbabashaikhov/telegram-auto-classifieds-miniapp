import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useBusiness } from '../context/BusinessContext';
import { formatPrice, roomsLabel } from '../lib/format';
import type { MortgageResult, PropertyCard } from '../types';

export function PropertyPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const business = useBusiness();
  const [property, setProperty] = useState<PropertyCard | null>(null);
  const [photo, setPhoto] = useState(0);
  const [fav, setFav] = useState(false);
  const [mortgage, setMortgage] = useState<MortgageResult | null>(null);
  const [down, setDown] = useState(0);
  const [rate, setRate] = useState(business.mortgage.defaultRate);
  const [term, setTerm] = useState(business.mortgage.defaultTermYears);

  useEffect(() => {
    if (!id) return;
    void api.getProperty(Number(id)).then((data) => {
      setProperty(data);
      setFav(Boolean(data.favorited));
      const initial = Math.round((data.price * business.mortgage.defaultDownPercent) / 100);
      setDown(initial);
    });
    if (!preview) void api.viewProperty(Number(id)).catch(() => undefined);
  }, [id, preview, business.mortgage.defaultDownPercent]);

  const reasons = property?.match?.reasons ?? [];

  async function toggleFav() {
    if (!property || preview) return;
    if (fav) {
      await api.removeFavorite(property.id);
      setFav(false);
    } else {
      await api.addFavorite(property.id);
      setFav(true);
    }
  }

  async function calc() {
    if (!property) return;
    const result = await api.mortgage({
      propertyId: preview ? undefined : property.id,
      price: property.price,
      downPayment: down,
      annualRatePercent: rate,
      termYears: term,
    });
    setMortgage(result);
  }

  const cover = useMemo(() => property?.gallery[photo] || property?.project.imageUrl, [property, photo]);

  if (!property) return <div className="page loading">Загрузка…</div>;

  return (
    <div className="page property-page">
      <Link className="back-link" to="/matches">
        ← Назад
      </Link>
      <div className="gallery" style={{ backgroundImage: `url(${cover})` }}>
        <div className="gallery-nav">
          {property.gallery.map((_, index) => (
            <button key={index} className={index === photo ? 'dot active' : 'dot'} onClick={() => setPhoto(index)} />
          ))}
        </div>
        {property.match && <span className="score-badge xl">{property.match.score}%</span>}
      </div>
      <p className="eyebrow">{property.project.name}</p>
      <h1>
        {roomsLabel(property.rooms)} · {property.area} м²
      </h1>
      <p className="price">{formatPrice(property.price)}</p>
      <ul className="specs">
        <li>{property.floor}/{property.floorsTotal} этаж</li>
        <li>{property.finish === 'finished' ? 'С отделкой' : property.finish === 'white_box' ? 'White box' : 'Без отделки'}</li>
        <li>Сдача {property.completionDate.slice(0, 7)}</li>
        <li>{property.project.districtLabel}</li>
      </ul>
      <p>{property.description}</p>
      <div className="chips">
        {property.features.map((feature) => (
          <span key={feature.code}>{feature.label}</span>
        ))}
      </div>
      {reasons.length > 0 && (
        <section data-demo-tour="match-reasons">
          <h2>Почему подходит</h2>
          <ul className="reasons">
            {reasons.map((reason) => (
              <li key={reason.code} className={reason.kind}>
                {reason.kind === 'match' ? '✓' : reason.kind === 'partial' ? '⚠' : '–'} {reason.label}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="calculator">
        <h2>Платёж по ипотеке</h2>
        <label>
          Первый взнос
          <input type="number" value={down} onChange={(event) => setDown(Number(event.target.value))} />
        </label>
        <label>
          Ставка, %
          <input type="number" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
        </label>
        <label>
          Срок, лет
          <input type="number" value={term} onChange={(event) => setTerm(Number(event.target.value))} />
        </label>
        <button className="btn btn-secondary" onClick={() => void calc()}>
          Рассчитать
        </button>
        {mortgage && (
          <p className="mortgage-result">
            ≈ {formatPrice(mortgage.monthlyPayment)} / мес · кредит {formatPrice(mortgage.loanAmount)}
          </p>
        )}
      </section>
      <div className="sticky-cta">
        <button className={fav ? 'btn btn-secondary' : 'btn btn-ghost'} data-demo-tour="favorite-btn" onClick={() => void toggleFav()}>
          {fav ? 'В избранном' : 'В избранное'}
        </button>
        <Link className="btn btn-primary" to={`/properties/${property.id}/viewing`}>
          Записаться на просмотр
        </Link>
      </div>
    </div>
  );
}
