import { AppError } from '../errors.js';
import type { PaymentProvider, PaymentStatus } from '../payments.js';

export class DemoPaymentProvider implements PaymentProvider {
  readonly name = 'demo';
  async createPayment(input: { paymentId: number }) {
    return {
      providerPaymentId: `demo-${input.paymentId}`,
      confirmationUrl: `/payments/${input.paymentId}/demo`,
      payload: { demo: true },
    };
  }
  async getPaymentStatus(_providerPaymentId: string): Promise<PaymentStatus> { return 'pending'; }
  async handleWebhook(): Promise<never> {
    throw new AppError('Demo payments use controlled authenticated actions', 405, 'DEMO_WEBHOOK_DISABLED');
  }
}

export class ExternalPaymentProvider implements PaymentProvider {
  readonly name = 'external';
  private unavailable(): never {
    throw new AppError('External payment provider is not configured', 501, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  async createPayment(): Promise<never> { return this.unavailable(); }
  async getPaymentStatus(): Promise<never> { return this.unavailable(); }
  async handleWebhook(): Promise<never> { return this.unavailable(); }
}

export function createPaymentProvider(name: 'demo' | 'external'): PaymentProvider {
  return name === 'demo' ? new DemoPaymentProvider() : new ExternalPaymentProvider();
}
