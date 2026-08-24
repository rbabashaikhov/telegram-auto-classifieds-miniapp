export function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

export function roomsLabel(rooms: string): string {
  if (rooms === 'studio') return 'Студия';
  if (rooms === '1') return '1-комн.';
  if (rooms === '2') return '2-комн.';
  return '3+ комн.';
}

export function temperatureLabel(value: string): string {
  if (value === 'HOT') return 'HOT';
  if (value === 'WARM') return 'WARM';
  return 'COLD';
}

export function eventLabel(type: string): string {
  const map: Record<string, string> = {
    app_opened: 'Открыл приложение',
    qualification_started: 'Начал квалификацию',
    qualification_completed: 'Завершил квалификацию',
    matches_opened: 'Открыл подбор',
    property_viewed: 'Смотрел объект',
    property_revisited: 'Вернулся к объекту',
    property_favorited: 'Добавил в избранное',
    property_unfavorited: 'Убрал из избранного',
    payment_calculated: 'Рассчитал платёж',
    viewing_started: 'Начал запись на просмотр',
    viewing_requested: 'Запросил просмотр',
    manager_contact_requested: 'Запросил менеджера',
  };
  return map[type] || type;
}
