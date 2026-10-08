# server/billing — plugin da usare

- **Stripe** (skill: stripe-best-practices, stripe-docs, upgrade-stripe; comando test-cards, explain-error): per i pagamenti web lato coach/admin.
Gli acquisti in-app (iOS/Android) NON usano Stripe: restano su RevenueCat. Usare solo chiavi e carte di test; mai chiavi live in chat o nei file.
