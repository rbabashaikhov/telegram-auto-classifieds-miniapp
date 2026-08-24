import { ApiError } from '../api/client';

const errorMessages: Record<string, string> = {
  ADMIN_UNAUTHORIZED: 'Введите токен администратора для доступа.',
  UNAUTHORIZED: 'Не удалось подтвердить пользователя. Откройте приложение через Telegram или включите browser demo mode.',
  NOT_FOUND: 'Запрошенные данные не найдены.',
  PHOTO_REQUIRED: 'Добавьте хотя бы одну фотографию.',
  PAYMENT_REQUIRED: 'Сначала оплатите тариф размещения.',
  INVALID_LISTING_STATUS: 'Действие недоступно для текущего статуса объявления.',
  INVALID_PAYMENT_TRANSITION: 'Этот результат оплаты уже нельзя изменить.',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'Оплата временно недоступна.',
};

export function userError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) return errorMessages[cause.code] ?? fallback;
  return fallback;
}
