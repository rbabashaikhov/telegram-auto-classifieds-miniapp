import type { ListingInput } from '../types';

export function validateListingStep(step: number, form: ListingInput, currentYear = new Date().getFullYear()): string {
  if (step === 0 && (!form.brandId || !form.modelId || form.year < 1900 || form.year > currentYear + 1)) return 'Выберите марку, модель и корректный год.';
  if (step === 1 && (form.mileage < 0 || !form.bodyType || !form.transmission || !form.driveType || !form.engineType || form.engineVolume <= 0 || form.engineVolume > 10 || form.color.trim().length < 2)) return 'Заполните все характеристики автомобиля.';
  if (step === 2 && (form.price <= 0 || form.city.trim().length < 2 || form.description.trim().length < 20)) return 'Укажите цену, город и описание не короче 20 символов.';
  return '';
}
