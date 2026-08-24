import type { ListingStatus, PaymentStatus } from '../types';

const vehicleLabels: Record<string, string> = {
  sedan: 'Седан',
  suv: 'Кроссовер',
  hatchback: 'Хэтчбек',
  liftback: 'Лифтбек',
  wagon: 'Универсал',
  coupe: 'Купе',
  minivan: 'Минивэн',
  pickup: 'Пикап',
  automatic: 'Автомат',
  manual: 'Механика',
  robot: 'Робот',
  variator: 'Вариатор',
  front: 'Передний',
  rear: 'Задний',
  all: 'Полный',
  petrol: 'Бензин',
  diesel: 'Дизель',
  hybrid: 'Гибрид',
  electric: 'Электро',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Черновик',
  pending_moderation: 'На модерации',
  published: 'Опубликовано',
  rejected: 'Отклонено',
  archived: 'Архив',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  failed: 'Ошибка оплаты',
  cancelled: 'Оплата отменена',
};

const moderationLabels: Record<string, string> = {
  submitted: 'Отправлено на модерацию',
  approved: 'Опубликовано',
  rejected: 'Отклонено',
  archived: 'Перенесено в архив',
  reopened: 'Возвращено к редактированию',
};

export function vehicleLabel(value: string): string {
  return vehicleLabels[value] ?? 'Не указано';
}

export function moderationLabel(value: string): string {
  return moderationLabels[value] ?? 'Статус обновлён';
}
