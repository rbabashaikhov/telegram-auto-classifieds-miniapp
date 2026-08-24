import { NavLink } from 'react-router-dom';

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end>Каталог</NavLink>
      <NavLink to="/favorites">Избранное</NavLink>
    </nav>
  );
}
