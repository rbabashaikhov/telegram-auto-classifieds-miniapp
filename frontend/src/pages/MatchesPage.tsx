import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { DEMO_QUALIFICATION_DRAFT } from '../demo-tour/DemoTourProvider';
import { formatPrice, roomsLabel } from '../lib/format';
import type { PropertyCard } from '../types';

interface MatchItem {
  score: number;
  reasons: NonNullable<PropertyCard['match']>['reasons'];
  property: PropertyCard;
}

export function MatchesPage() {
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const [items, setItems] = useState<MatchItem[]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = preview ? api.previewMatches(DEMO_QUALIFICATION_DRAFT) : api.getMatches();
    void load.then((data) => {
      if (cancelled) return;
      const mapped = (data as MatchItem[]).map((item) =>
        'property' in item ? item : ({ score: 0, reasons: [], property: item } as unknown as MatchItem),
      );
      setItems(mapped);
      setEmpty(mapped.length === 0);
    });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  if (empty) {
    return (
      <div className="page">
        <h1>Сначала расскажите, что ищете</h1>
        <Link className="btn btn-primary" to="/qualify">
          Подобрать квартиру
        </Link>
      </div>
    );
  }

  return (
    <div className="page" data-demo-tour="matches-list">
      <p className="eyebrow">{preview ? 'Предпросмотр без сохранения' : 'Ваш подбор'}</p>
      <h1>Объекты под запрос</h1>
      <div className="match-list">
        {items.map((item) => (
          <Link key={item.property.id} to={`/properties/${item.property.id}${preview ? '?preview=1' : ''}`} className="match-card">
            <div className="match-photo" style={{ backgroundImage: `url(${item.property.gallery[0] || item.property.project.imageUrl})` }}>
              <span className="score-badge">{item.score}%</span>
            </div>
            <div className="match-body">
              <p className="muted">{item.property.project.name}</p>
              <h2>
                {roomsLabel(item.property.rooms)} · {item.property.area} м²
              </h2>
              <strong>{formatPrice(item.property.price)}</strong>
              <ul className="reason-mini">
                {item.reasons
                  .filter((reason) => reason.kind === 'match')
                  .slice(0, 3)
                  .map((reason) => (
                    <li key={reason.code}>✓ {reason.label}</li>
                  ))}
              </ul>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
