import { SaaSPlan } from '../types';

export interface StripeConfigResponse {
  configured: boolean;
  publishableKey: string | null;
  mode: 'live_or_test' | 'unconfigured';
  plans: Record<string, { name: string; price: string; priceCents: number }>;
}

export interface StripeCheckoutSessionResponse {
  configured: boolean;
  id?: string;
  url?: string;
  error?: string;
  message?: string;
  mockSession?: {
    id: string;
    url: string;
    planId: string;
    businessId: string;
  };
}

export interface StripeVerifySessionResponse {
  success: boolean;
  status: string;
  sessionStatus?: string;
  planId?: SaaSPlan;
  businessId?: string;
  customerEmail?: string;
  subscriptionId?: string;
  isMock?: boolean;
  message?: string;
  error?: string;
}

export class StripeService {
  /**
   * Check if Stripe secret key is active on backend
   */
  static async getConfigAsync(): Promise<StripeConfigResponse> {
    try {
      const res = await fetch('/api/stripe/config');
      if (!res.ok) throw new Error('Falha ao verificar configuração do Stripe');
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch Stripe config:', err);
      return {
        configured: false,
        publishableKey: null,
        mode: 'unconfigured',
        plans: {},
      };
    }
  }

  /**
   * Create a Stripe Checkout session for a barbershop subscription
   */
  static async createCheckoutSessionAsync(params: {
    planId: SaaSPlan;
    businessId: string;
    businessName?: string;
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<StripeCheckoutSessionResponse> {
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Error initiating Stripe checkout session:', err);
      return {
        configured: false,
        error: 'NETWORK_ERROR',
        message: err.message || 'Erro de conexão ao criar checkout no Stripe.',
      };
    }
  }

  /**
   * Verify completed Stripe checkout session
   */
  static async verifySessionAsync(
    sessionId: string,
    businessId?: string,
    planId?: string
  ): Promise<StripeVerifySessionResponse> {
    try {
      const url = new URL('/api/stripe/verify-session', window.location.origin);
      url.searchParams.set('session_id', sessionId);
      if (businessId) url.searchParams.set('business_id', businessId);
      if (planId) url.searchParams.set('plan_id', planId);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Falha ao verificar sessão de pagamento');
      return await res.json();
    } catch (err: any) {
      console.error('Error verifying Stripe session:', err);
      return {
        success: false,
        status: 'error',
        error: err.message,
      };
    }
  }
}
