import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';

export function HomePage() {
  const business = useBusiness();
  return (
    <div className="page">
      <section className="hero" data-demo-tour="home-hero">
        <p className="eyebrow">{business.businessName}</p>
        <h1>Квартира под ваш сценарий, не под баннер</h1>
        <p className="hero-lead">
          Восемь вопросов — и вы видите объекты с объяснением, почему они подходят. Без звонка «просто посмотреть каталог».
        </p>
        <Link to="/qualify" className="btn btn-primary btn-block" data-demo-tour="home-cta">
          Подобрать квартиру
        </Link>
        <Link to="/sell" className="btn btn-ghost btn-block">
          Продать квартиру
        </Link>
      </section>
      <section className="home-grid">
        <article>
          <span>01</span>
          <h2>Квалификация</h2>
          <p>Цель, район, бюджет, срок, оплата.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Подбор</h2>
          <p>Score 0–100 и понятные причины.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Намерение</h2>
          <p>Избранное, расчёт, просмотр — сигналы для менеджера.</p>
        </article>
      </section>
    </div>
  );
}
