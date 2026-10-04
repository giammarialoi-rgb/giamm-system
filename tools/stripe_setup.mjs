// Prepares a Stripe account for the website's subscriptions. Safe to run again: what exists is left alone.
//
//   STRIPE_SECRET_KEY=sk_test_... node tools/stripe_setup.mjs            (test mode first, then the live key)
//   STRIPE_SECRET_KEY=sk_live_... node tools/stripe_setup.mjs --webhook https://app.nurvan.app/api/billing/stripe/webhook
//
// It makes: one Stripe product per paid plan, one price per product id of web/features.json (lookup key = the
// product id, amount and period from the plans' prices), the customer portal configuration (change plan, cancel at
// the end of the period, invoices, card), and with --webhook the webhook endpoint. The signing secret of the
// webhook (whsec_...) is shown ONCE: put it in Render as STRIPE_WEBHOOK_SECRET. Nothing is written to a file.
import fs from 'node:fs';
import path from 'node:path';
import { formBody } from '../server/billing/stripe.mjs';

const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
if (!/^sk_(test|live)_/.test(key) && !/^rk_(test|live)_/.test(key)) { console.log('STRIPE_SECRET_KEY mancante o non valida (sk_test_... / sk_live_...).'); process.exit(1); }
const live = /_live_/.test(key);
const webhookIdx = process.argv.indexOf('--webhook');
const webhookUrl = webhookIdx > 0 ? process.argv[webhookIdx + 1] : '';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const features = JSON.parse(fs.readFileSync(path.join(here, '../web/features.json'), 'utf8'));

async function stripe(method, p, body) {
  const r = await fetch('https://api.stripe.com/v1' + p, { method, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2025-09-30.clover' }, body: body ? formBody(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(p + ': ' + ((j.error && j.error.message) || r.status));
  return j;
}

console.log('Modalità Stripe: ' + (live ? 'LIVE (soldi veri)' : 'test') + '\n');
const portalProducts = [];
for (const plan of features.plans.filter((p) => p.id !== 'free')) {
  const ids = (features.billing.products[plan.id] || []);
  const find = await stripe('GET', '/products/search?' + formBody({ query: "metadata['nurvan_plan']:'" + plan.id + "' AND active:'true'", limit: 1 }));
  let product = find.data && find.data[0];
  if (!product) product = await stripe('POST', '/products', { name: 'Nurvan ' + plan.name, description: plan.tagline || undefined, metadata: { nurvan_plan: plan.id } });
  console.log('Prodotto ' + plan.name + ': ' + product.id);
  const priceIds = [];
  for (const id of ids) {
    const period = id.endsWith('.year') ? 'year' : 'month';
    const amount = ((plan.prices || []).find((x) => x.period === period) || {}).amount;
    if (!amount) { console.log('  ' + id + ': nessun prezzo in features.json, salto'); continue; }
    const have = await stripe('GET', '/prices?' + formBody({ lookup_keys: [id], limit: 1 }));
    let price = have.data && have.data[0];
    if (price && (price.unit_amount !== amount * 100 || !price.active)) {
      console.log('  ' + id + ': esiste con un altro importo (' + (price.unit_amount / 100) + ' €): lo sposto sul nuovo prezzo');
      price = await stripe('POST', '/prices', { product: product.id, currency: 'eur', unit_amount: amount * 100, recurring: { interval: period }, lookup_key: id, transfer_lookup_key: 'true', metadata: { nurvan_product: id } });
    } else if (!price) {
      price = await stripe('POST', '/prices', { product: product.id, currency: 'eur', unit_amount: amount * 100, recurring: { interval: period }, lookup_key: id, metadata: { nurvan_product: id } });
    }
    priceIds.push(price.id);
    console.log('  ' + id + ' → ' + price.id + ' (' + amount + ' € / ' + (period === 'year' ? 'anno' : 'mese') + ')');
  }
  if (priceIds.length) portalProducts.push({ product: product.id, prices: priceIds });
}

// The customer portal: change plan, cancel at the end of the period, invoices, card.
const portal = await stripe('POST', '/billing_portal/configurations', {
  business_profile: { headline: 'Gestisci il tuo abbonamento Nurvan' },
  features: {
    customer_update: { enabled: 'true', allowed_updates: ['email', 'name', 'address', 'tax_id'] },
    invoice_history: { enabled: 'true' },
    payment_method_update: { enabled: 'true' },
    subscription_cancel: { enabled: 'true', mode: 'at_period_end', cancellation_reason: { enabled: 'true', options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'] } },
    subscription_update: { enabled: 'true', default_allowed_updates: ['price'], proration_behavior: 'create_prorations', products: portalProducts }
  },
  metadata: { nurvan: 'true' }
});
console.log('\nPortale clienti: ' + portal.id + (portal.is_default ? ' (predefinito)' : ''));

if (webhookUrl) {
  const hook = await stripe('POST', '/webhook_endpoints', { url: webhookUrl, enabled_events: ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'], description: 'Nurvan abbonamenti' });
  console.log('\nWebhook creato: ' + hook.id + '\nSTRIPE_WEBHOOK_SECRET (si vede solo ora, copialo su Render): ' + hook.secret);
} else {
  console.log('\nWebhook non creato (aggiungi --webhook <url> per farlo da qui, oppure crealo dalla dashboard con gli eventi customer.subscription.created / updated / deleted).');
}
console.log('\nFatto. Ricorda: STRIPE_SECRET_KEY su Render, e le stesse operazioni di nuovo con la chiave live quando sei pronto a incassare.');
