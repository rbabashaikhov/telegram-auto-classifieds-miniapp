import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api, getAdminToken, setAdminToken } from '../api/client';
import { eventLabel, formatPrice } from '../lib/format';
import type { DashboardKpis, FunnelAnalytics, LeadSummary, PropertyCard } from '../types';

function AdminShell({
  readOnly,
  children,
}: {
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const prefix = readOnly ? '/demo/admin' : '/admin';
  return (
    <div className="admin-shell">
      <aside>
        <p className="eyebrow">{readOnly ? 'Кабинет менеджера · только чтение' : 'Норд Эстейт'}</p>
        <h1>Менеджер</h1>
        {readOnly && (
          <Link className="demo-chrome-cta" to="/" style={{ margin: '12px 0' }}>
            Открыть клиентское приложение
          </Link>
        )}
        <nav>
          <NavLink to={prefix}>Dashboard</NavLink>
          <NavLink to={`${prefix}/leads`}>Лиды</NavLink>
          <NavLink to={`${prefix}/properties`}>Объекты</NavLink>
          <NavLink to={`${prefix}/viewings`}>Просмотры</NavLink>
          <NavLink to={`${prefix}/sellers`}>Собственники</NavLink>
          <NavLink to={`${prefix}/analytics`}>Аналитика</NavLink>
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(getAdminToken());
  const [value, setValue] = useState('');
  if (token) return <>{children}</>;
  return (
    <div className="admin-login">
      <h1>Кабинет менеджера</h1>
      <p>Нужен ADMIN_TOKEN. Demo mode не открывает админку.</p>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Токен" />
      <button
        className="btn btn-primary"
        onClick={() => {
          setAdminToken(value);
          setToken(value);
        }}
      >
        Войти
      </button>
    </div>
  );
}

export function AdminPage({ readOnly }: { readOnly?: boolean }) {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  useEffect(() => {
    void (readOnly ? api.getDemoDashboard() : api.getAdminDashboard()).then(setKpis);
  }, [readOnly]);
  const inner = (
    <AdminShell readOnly={readOnly}>
      <div className="kpi-grid" data-demo-tour="admin-value">
        <article>
          <span>New leads</span>
          <strong>{kpis?.newLeads ?? '—'}</strong>
        </article>
        <article>
          <span>HOT leads</span>
          <strong>{kpis?.hotLeads ?? '—'}</strong>
        </article>
        <article>
          <span>Qualifications</span>
          <strong>{kpis?.qualificationsCompleted ?? '—'}</strong>
        </article>
        <article>
          <span>Viewings</span>
          <strong>{kpis?.viewingRequests ?? '—'}</strong>
        </article>
      </div>
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}

export function AdminLeadsPage({ readOnly }: { readOnly?: boolean }) {
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [temperature, setTemperature] = useState('');
  const prefix = readOnly ? '/demo/admin' : '/admin';
  useEffect(() => {
    const query = temperature ? `?temperature=${temperature}` : '';
    void (readOnly ? api.getDemoLeads() : api.getAdminLeads(query)).then(setLeads);
  }, [readOnly, temperature]);
  const inner = (
    <AdminShell readOnly={readOnly}>
      <div className="filters">
        {['', 'HOT', 'WARM', 'COLD'].map((item) => (
          <button key={item || 'all'} className={temperature === item ? 'choice active' : 'choice'} onClick={() => setTemperature(item)}>
            {item || 'Все'}
          </button>
        ))}
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Клиент</th>
            <th>Temp</th>
            <th>Score</th>
            <th>Бюджет</th>
            <th>Срок</th>
            <th>Оплата</th>
            <th>Matches</th>
            <th>Fav</th>
            <th>Активность</th>
            <th>Агент</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <Link to={`${prefix}/leads/${lead.id}`}>{lead.customer?.name}</Link>
              </td>
              <td>
                <span className={`temp ${lead.temperature}`}>{lead.temperature}</span>
              </td>
              <td>{lead.score}</td>
              <td>{lead.budgetMin ? `${formatPrice(lead.budgetMin)}–${formatPrice(lead.budgetMax || 0)}` : '—'}</td>
              <td>{lead.purchaseTiming}</td>
              <td>{lead.payment}</td>
              <td>{lead.matches}</td>
              <td>{lead.favorites}</td>
              <td>{lead.latestActivity ? eventLabel(lead.latestActivity.eventType) : '—'}</td>
              <td>{lead.agent?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}

export function AdminLeadPage({ readOnly }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!id) return;
    void (readOnly ? api.getDemoLead(Number(id)) : api.getAdminLead(Number(id))).then(setPayload);
  }, [id, readOnly]);
  if (!payload) return <div className="page loading">Загрузка…</div>;
  const lead = payload.lead as LeadSummary;
  const timeline = (payload.timeline as Array<{ eventType: string; timestamp: string; entityId?: number }>) || [];
  const matches = (payload.matches as Array<{ score: number; property: PropertyCard }>) || [];
  const inner = (
    <AdminShell readOnly={readOnly}>
      <div className="lead-detail">
        <header data-demo-tour="lead-score">
          <p className="eyebrow">Lead score</p>
          <h1>
            {lead.score} / {lead.temperature}
          </h1>
          <p>
            Профиль {lead.scoreBreakdown?.profileScore} · Поведение {lead.scoreBreakdown?.behaviorScore}
          </p>
        </header>
        <section>
          <h2>Почему score изменился</h2>
          <ul>
            {(lead.scoreBreakdown?.events || []).map((event, index) => (
              <li key={index}>
                {event.reason} ({event.delta > 0 ? '+' : ''}
                {event.delta}) → {event.scoreAfter}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Matches</h2>
          {matches.slice(0, 5).map((item) => (
            <p key={item.property.id}>
              {item.score}% · {item.property.project.name} {item.property.unitNumber}
            </p>
          ))}
        </section>
        <section data-demo-tour="lead-timeline">
          <h2>Timeline</h2>
          <ul className="timeline">
            {timeline.map((item, index) => (
              <li key={index}>
                <time>{item.timestamp.slice(11, 16)}</time>
                {eventLabel(item.eventType)}
              </li>
            ))}
          </ul>
        </section>
        <section data-demo-tour="crm-ready">
          <h2>CRM-ready payload</h2>
          <p className="muted">
            Customer, BuyerProfile, Lead, LeadScore, TopMatches, Favorites, Viewing, UTM, RecentInteractionEvents.
            Application layer отдаёт порт, не Bitrix и не amoCRM.
          </p>
        </section>
      </div>
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}

export function AdminPropertiesPage({ readOnly }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<PropertyCard[]>([]);
  useEffect(() => {
    if (readOnly) return;
    void api.getAdminProperties().then((data) => setRows(data.properties));
  }, [readOnly]);
  const inner = (
    <AdminShell readOnly={readOnly}>
      {readOnly ? (
        <p>Каталог в demo-admin только для живого UI. CRUD — в /admin.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Объект</th>
              <th>Цена</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((property) => (
              <tr key={property.id}>
                <td>
                  {property.project.name} {property.unitNumber}
                </td>
                <td>
                  <input
                    defaultValue={property.price}
                    onBlur={(event) => void api.patchProperty(property.id, { price: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <select
                    defaultValue={property.status}
                    onChange={(event) => void api.patchProperty(property.id, { status: event.target.value })}
                  >
                    <option value="available">available</option>
                    <option value="reserved">reserved</option>
                    <option value="sold">sold</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}

export function AdminViewingsPage({ readOnly }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void (readOnly ? api.getDemoLeads().then(() => api.getAdminViewings().catch(() => [])) : api.getAdminViewings())
      .then((data) => setRows((data as Array<Record<string, unknown>>) || []))
      .catch(() => undefined);
    if (readOnly) {
      void fetch('/api/demo-admin/viewings')
        .then((response) => response.json())
        .then((payload) => setRows(payload.data || []));
    }
  }, [readOnly]);
  const inner = (
    <AdminShell readOnly={readOnly}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Когда</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)}>
              <td>{String(row.scheduledAt)}</td>
              <td>{String(row.status)}</td>
              <td>
                {!readOnly && (
                  <select
                    defaultValue={String(row.status)}
                    onChange={(event) => void api.patchViewingStatus(Number(row.id), event.target.value)}
                  >
                    {['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}

export function AdminSellersPage({ readOnly }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    if (readOnly) {
      void fetch('/api/demo-admin/seller-leads')
        .then((response) => response.json())
        .then((payload) => setRows(payload.data || []));
      return;
    }
    void api.getAdminSellers().then(setRows);
  }, [readOnly]);
  const inner = (
    <AdminShell readOnly={readOnly}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Район</th>
            <th>Цена</th>
            <th>Срок</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)}>
              <td>{String(row.locationLabel || row.location)}</td>
              <td>{formatPrice(Number(row.desiredPrice))}</td>
              <td>{String(row.saleTiming)}</td>
              <td>{String(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}

export function AdminAnalyticsPage({ readOnly }: { readOnly?: boolean }) {
  const [data, setData] = useState<FunnelAnalytics | null>(null);
  useEffect(() => {
    void (readOnly ? api.getDemoAnalytics() : api.getAdminAnalytics()).then(setData);
  }, [readOnly]);
  const inner = (
    <AdminShell readOnly={readOnly}>
      <section data-demo-tour="funnel-chart">
        <h2>Воронка</h2>
        <div className="funnel">
          {data?.funnel.map((stage) => (
            <article key={stage.key}>
              <span>{stage.event}</span>
              <strong>{stage.customers}</strong>
            </article>
          ))}
        </div>
        <p className="muted">
          Конверсии:{' '}
          {data?.conversions
            .filter((item) => item.from)
            .map((item) => `${item.from} → ${item.to}: ${item.rate}%`)
            .join(' · ')}
        </p>
      </section>
      <section>
        <h2>Температура</h2>
        <p>
          HOT {data?.temperature.HOT} · WARM {data?.temperature.WARM} · COLD {data?.temperature.COLD}
        </p>
      </section>
      <section>
        <h2>Топ просмотров</h2>
        {data?.mostViewed.map((item) => (
          <p key={item.propertyId}>
            {item.name} — {item.count}
          </p>
        ))}
      </section>
      <section>
        <h2>UTM</h2>
        <p>{JSON.stringify(data?.leadsByUtmSource)}</p>
        <p>{JSON.stringify(data?.leadsByUtmCampaign)}</p>
      </section>
      <p>Среднее matches на qualified lead: {data?.averageMatchesPerQualifiedLead}</p>
    </AdminShell>
  );
  return readOnly ? inner : <Gate>{inner}</Gate>;
}
