import { NavLink } from 'react-router-dom';

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end>
        Главная
      </NavLink>
      <NavLink to="/matches">Подбор</NavLink>
      <NavLink to="/me">Мой подбор</NavLink>
      <NavLink to="/sell">Продать</NavLink>
    </nav>
  );
}
