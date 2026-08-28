import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Stripe from 'stripe';

// Lazy initialized Stripe client to avoid startup crashes if key is not yet set
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

// Plan Prices in BRL Centavos
const PLAN_PRICES: Record<string, { name: string; amountCents: number; description: string }> = {
  basic: {
    name: 'Básico',
    amountCents: 3990, // R$ 39,90
    description: 'Até 2 profissionais, 50 clientes e Agendamento Online PWA',
  },
  professional: {
    name: 'Profissional',
    amountCents: 6999, // R$ 69,99
    description: 'Até 10 profissionais, 1.000 clientes, Caixa, Financeiro, Comissões e CRM',
  },
  premium: {
    name: 'Premium Studio',
    amountCents: 9990, // R$ 99,90
    description: 'Profissionais e clientes ilimitados, Fichas de Anamnese e Suporte Prioritário VIP',
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'StudioFlow V1.0 SaaS', version: '1.0.0' });
  });

  // Stripe Status Check endpoint
  app.get('/api/stripe/config', (req, res) => {
    const isConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
    res.json({
      configured: isConfigured,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      mode: isConfigured ? 'live_or_test' : 'unconfigured',
      plans: {
        basic: { name: 'Básico', price: 'R$ 39,90', priceCents: 3990 },
        professional: { name: 'Profissional', price: 'R$ 69,99', priceCents: 6999 },
        premium: { name: 'Premium Studio', price: 'R$ 99,90', priceCents: 9990 },
      },
    });
  });

  // Sync/Register Catalog Products directly into Stripe Dashboard
  app.post('/api/stripe/sync-products', async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(400).json({
          success: false,
          error: 'STRIPE_NOT_CONFIGURED',
          message: 'STRIPE_SECRET_KEY não está configurada no servidor.',
        });
      }

      const createdProducts: any[] = [];

      for (const [planKey, plan] of Object.entries(PLAN_PRICES)) {
        // Search if product already exists
        const search = await stripe.products.search({
          query: `metadata['planKey']:'${planKey}'`,
        }).catch(() => ({ data: [] }));

        let product = search.data?.[0];

        if (!product) {
          // Create product in Stripe Catalog
          product = await stripe.products.create({
            name: `StudioFlow - Plano ${plan.name}`,
            description: plan.description,
            metadata: {
              planKey,
              app: 'StudioFlow SaaS',
            },
          });
        }

        // Create recurring monthly price if not existing
        const existingPrices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        let price = existingPrices.data?.[0];
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: plan.amountCents,
            currency: 'brl',
            recurring: {
              interval: 'month',
            },
            metadata: {
              planKey,
            },
          });
        }

        createdProducts.push({
          planKey,
          productId: product.id,
          productName: product.name,
          priceId: price.id,
          amountFormatted: `R$ ${(plan.amountCents / 100).toFixed(2).replace('.', ',')}`,
        });
      }

      return res.json({
        success: true,
        message: 'Todos os 3 planos do StudioFlow foram sincronizados e cadastrados com sucesso no seu catálogo de Produtos do Stripe!',
        products: createdProducts,
      });
    } catch (err: any) {
      console.error('Error syncing products to Stripe:', err);
      return res.status(500).json({
        success: false,
        error: 'STRIPE_SYNC_ERROR',
        message: err.message || 'Erro ao cadastrar produtos no Stripe.',
      });
    }
  });

  // Create Stripe Checkout Session endpoint
  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      const { planId, businessId, businessName, customerEmail, successUrl, cancelUrl } = req.body;

      if (!planId || !businessId) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          message: 'Parâmetros "planId" e "businessId" são obrigatórios.',
        });
      }

      const planInfo = PLAN_PRICES[planId] || PLAN_PRICES.professional;
      const stripe = getStripe();

      // Base URL from request or environment
      const origin =
        req.headers.origin ||
        (req.headers.host ? `${req.protocol}://${req.headers.host}` : 'http://localhost:3000');

      const defaultSuccessUrl =
        successUrl ||
        `${origin}/assinatura?stripe_session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&business_id=${businessId}&stripe_success=true`;
      const defaultCancelUrl = cancelUrl || `${origin}/assinatura?stripe_cancelled=true`;

      if (!stripe) {
        // Stripe secret key is not set in environment
        return res.status(200).json({
          configured: false,
          error: 'STRIPE_NOT_CONFIGURED',
          message:
            'A chave STRIPE_SECRET_KEY não está configurada no arquivo .env. Configure sua chave no painel de configurações para processar pagamentos reais no Stripe.',
          mockSession: {
            id: `mock_cs_${Date.now()}`,
            url: `${origin}/assinatura?stripe_session_id=mock_cs_${Date.now()}&plan_id=${planId}&business_id=${businessId}&stripe_success=true&mock=true`,
            planId,
            businessId,
          },
        });
      }

      // Create live/test Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: `Plano ${planInfo.name} - StudioFlow`,
                description: `Assinatura mensal para ${businessName || 'Barbearia'} (ID: ${businessId})`,
              },
              unit_amount: planInfo.amountCents,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        customer_email: customerEmail || undefined,
        metadata: {
          businessId: String(businessId),
          planId: String(planId),
          businessName: String(businessName || ''),
        },
        subscription_data: {
          metadata: {
            businessId: String(businessId),
            planId: String(planId),
          },
        },
        success_url: defaultSuccessUrl,
        cancel_url: defaultCancelUrl,
      });

      return res.json({
        configured: true,
        id: session.id,
        url: session.url,
      });
    } catch (err: any) {
      console.error('Error creating Stripe checkout session:', err);
      return res.status(500).json({
        error: 'STRIPE_SESSION_ERROR',
        message: err.message || 'Erro ao criar sessão de checkout no Stripe.',
      });
    }
  });

  // Verify Stripe Checkout Session endpoint
  app.get('/api/stripe/verify-session', async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      const businessId = req.query.business_id as string;

      if (!sessionId) {
        return res.status(400).json({ error: 'MISSING_SESSION_ID' });
      }

      // Handle mock/demo session
      if (sessionId.startsWith('mock_cs_')) {
        return res.json({
          success: true,
          status: 'paid',
          isMock: true,
          businessId: businessId || 'demo',
          planId: req.query.plan_id || 'professional',
        });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.json({
          success: true,
          status: 'paid',
          isMock: true,
          message: 'Stripe não configurado, ativando em modo de teste.',
        });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const isPaid = session.payment_status === 'paid' || session.status === 'complete';
      return res.json({
        success: isPaid,
        status: session.payment_status,
        sessionStatus: session.status,
        planId: session.metadata?.planId || req.query.plan_id || 'professional',
        businessId: session.metadata?.businessId || businessId,
        customerEmail: session.customer_details?.email,
        subscriptionId: session.subscription,
      });
    } catch (err: any) {
      console.error('Error verifying Stripe session:', err);
      return res.status(500).json({
        error: 'VERIFICATION_ERROR',
        message: err.message || 'Erro ao validar sessão do Stripe.',
      });
    }
  });

  // Dynamic Web App Manifest API endpoint for white-label Barbershop PWA installs
  app.get('/api/manifest.json', (req, res) => {
    const name = (req.query.name as string) || 'StudioFlow';
    const logo = (req.query.logo as string) || '/icon-512.png';
    const slug = (req.query.slug as string) || '';

    const shortName = name.length > 12 ? name.substring(0, 12) : name;

    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      name: name,
      short_name: shortName,
      description: `Aplicativo oficial de Agendamento Online e Gestão para ${name}`,
      start_url: slug ? `/agendar/${slug}` : '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0f172a',
      theme_color: '#7e22ce',
      icons: [
        {
          src: logo,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: logo,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudioFlow Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
