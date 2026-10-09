# Nurvan — App Review notes (English)

This file is the English text for App Store Connect › App Review Information › Notes, plus the facts behind it.
It answers the "Information Needed" request (Guideline 2.1). It contains **no passwords**: the demo accounts are created
with `tools/seed_review_accounts.mjs` and their passwords are typed into App Store Connect by the developer
(see `docs/REVIEW-DEMO-ACCOUNT.md`). Placeholders below are written `<…>`.

## 1. Purpose and audience

Nurvan is a training, nutrition and coaching app for people who work out (gym or at home), and for coaches who follow their own clients.

- **Athletes**: workout programs, a log of sets and loads, statistics by muscle group, a food diary, supplements, optional
  health records the user types in (weight, measurements, sleep, resting heart rate, exams, therapy reminders) and an
  optional AI assistant ("Coach AI").
- **Coaches**: an area (Menu › Coach mode) to invite and follow clients, assign programs, read check-ins, chat with them, keep a
  ledger of what clients pay them, and put their own name and logo on the web app their clients use.
- Audience: adults. Minimum age **16** (confirmed at first launch, also in the terms).
- Languages: Italian (source) and English, Spanish, French, German, Portuguese, Russian, Chinese, Arabic, Hindi.
  Features are the same in every country; the only difference is that food-database results are localized for Italian, English, Spanish, French and German (other languages fall back to the Italian names, translated automatically).

## 2. How to access (copy into the "Notes" field)

```
Nurvan is a training app: programs, a log of sets and loads, statistics, a food diary and an optional AI assistant. It also has a coach area for personal trainers who follow their own clients.

SIGN IN
On first launch the Account screen appears. Enter the email and password of the demo account in "Nome utente" and "Password" and tap ACCEDI ("Continua con Google" and "Accedi con Apple" are also available). Tick "Ho almeno 16 anni", accept the privacy notice and terms, and accept the health-data processing (needed for the app to keep workouts, meals and checks). The AI consent is separate and optional: it is asked the first time an AI feature is used.

DEMO ACCOUNTS (credentials are in the fields above)
- <review-free account>: Free plan. Use it to see the plans screen (Menu › Piani & Pro), the purchase buttons, RESTORE PURCHASES and MANAGE SUBSCRIPTION.
- <review-coach account>: Coach Pro assigned by hand. Use it for the whole app and for Coach mode (Menu › Modalità coach).
- <review-athlete account>: a normal personal account with the same sample data.
- <review-client account>: the athlete side, linked to the coach account. It signs in with the USERNAME (not an email) and its password: username "revisorecliente". It has no Coach AI and no plans screen (a coach's athletes do not have them): use the free account for those.
All of them contain made-up sample data (an active program, workouts, a day of meals, a supplement, a therapy reminder, two exams, three body checks). Nothing in them is a real person.

WHERE TO LOOK
1. Registration / login: Account screen; email + code verification for new accounts; Sign in with Apple; Google.
2. Account deletion: Settings › Privacy and data › ELIMINA ACCOUNT (type ELIMINA). It works for every account, including a coach's client. If a subscription is active the screen says that deleting the account does not cancel it and links to Settings › your name › Subscriptions. Deletion removes the account and its data on our server, the history of purchase events kept for it, and the person on RevenueCat.
3. User-generated content: the only communication between users is the chat between a coach and the clients they invited (no search for strangers, no public feed). To try it: sign in as the athlete (username "revisorecliente") › COACH tab › chat with the coach, or as the coach › Menu › Modalità coach › HUB › the client › CHAT. In the chat, "Segnala · Blocca" reports a message (reason, free text, optional attached messages) and blocks the other person in both directions. Reports go to a moderation panel; target response time 24 hours. Admins can suspend the reported account from the same panel. Abuse contact: info@nurvan.app. The terms (section 7) forbid objectionable content.
4. Paid content: Menu › Piani & Pro. Subscriptions Standard / Coach / Coach Pro are bought ONLY with Apple in-app purchase (RevenueCat). Prices, period and renewal are shown by the store. The app does not mention or link to any other way to pay.
5. Coach AI: the chat is part of the paid plans. With the free account, open Menu › Piani & Pro and tap "ATTIVA 14 GIORNI DI COACH" (free, once per account, no charge, no renewal), then open the "Coach AI" tab and accept the separate AI consent when asked. Athletes linked to a coach do not have the Coach AI.

SANDBOX PURCHASE
Use <review-free account> and a sandbox tester: plans screen › choose a plan › confirm. The account's plan becomes the purchased one (the state comes from RevenueCat). RESTORE PURCHASES is on the same screen.

The app is a web interface packaged with Capacitor. Native features: in-app purchase, local notifications, camera and microphone (only when used), speech recognition (only when the microphone button is tapped), Sign in with Apple.
Technical contact: info@nurvan.app
```

## 3. External services that the app really uses

| Service | What for | What is sent | Consent / notes |
|---|---|---|---|
| **Own server** (Render, Oregon USA; Cloudflare in front) | accounts, sync of the user's data, coach↔client features | the data of the account | needed to use the app; terms and privacy accepted at first launch |
| **Google Gemini API** (model `gemini-2.5-flash`, called by our server, never from the phone) | Coach AI chat; reading a workout/meal-plan file; recognising a meal photo, a nutrition label or a barcode result; matching food names | the text of the request, the file or photo, and the context needed to answer (e.g. active program, goals, training data; exams or health data only if used in the question) | **Explicit, separate, revocable consent** before the first AI request (Settings › Privacy and data). The server **refuses AI requests without a recorded consent** (`AI_CONSENT_REQUIRED`). Nurvan does not use the content to train models or for advertising and does not sell it; Google processes it under the Gemini API terms. Food *names* from public databases may be translated with Gemini without personal data. |
| **RevenueCat** | verifies App Store purchases and tells our server which plan is active | Nurvan account id, product, store, dates | the account id is its app user id; removed on account deletion |
| **Apple** | Sign in with Apple; in-app purchase | identity returned by Apple | the Apple link is revoked on account deletion |
| **Google Sign-In** | optional login | Google identity | optional |
| **Resend** | account emails (code, password reset) | email address, one-time code/link | |
| **PubMed (NCBI E-utilities)** | "Evidenze" box: look up scientific studies | only the words typed in the search box, sent by our server (the reader's address never reaches NCBI); no account or training data | optional; nothing is stored, a question is kept in memory for 10 minutes |
| **Open Food Facts, FatSecret, USDA FoodData Central** | food search and barcode lookup | only the searched text or barcode, never account data | |
| **PeerJS PeerServer and Google STUN servers** | set up coach↔client video calls (WebRTC) | IP address and a temporary call id; audio and video go device-to-device | only when a call is started or received |
| **Usage count** (own server) | counts opens per platform | once a day: platform and "first open" flag; a daily hash forgotten after 2 days; no identifier, no account | not tracking; declared as "Product Interaction, not linked" |
| **YouTube** | links to technique videos of exercises | none from the app: the link opens YouTube in the system browser / YouTube app; no SDK or embedded player | |
| **Images and exercise media** | exercise pictures and animations | none | made for Nurvan, served from our own server and bundled in the app |
| **Stripe** | card payments **only on the website**, never in the iOS app | — | the legal pages and screens shown in the app (`?app=1`) leave out everything about website purchases and the website's free first period |

No advertising, no third-party analytics SDK, no data broker, no App Tracking Transparency prompt (`NSPrivacyTracking` is false).
The app does not use HealthKit and does not read data from other apps.

## 4. Payments and coaches

- Subscriptions that unlock features in the app are sold **only** with Apple in-app purchase.
- Payments between a coach and their own clients (personal training services) happen **outside the app**, one to one
  (Guideline 3.1.3(d) person-to-person services). The app only has a private ledger where the coach notes what a client has paid;
  money never passes through Nurvan.
- The "Activate 14 days of Coach" button gives access to the Coach plan once per account, with **no charge and no renewal**
  (it says so under the button). It is not a store free trial.

## 5. Regional differences

None in features or content, except that food-database search results are localized for Italian, English, Spanish, French and German (other languages use the Italian default, names translated automatically). Prices are the store's, in each storefront's currency. The legal pages exist in 10 languages
(the Italian text prevails). Italy is the controller's country (GDPR).

## 6. Regulated industries

Nurvan is a fitness and nutrition app. It is **not a medical device** and does not diagnose, treat or prescribe: stated in the
terms (section 3), in the privacy notice, in Settings, and in fixed notices at the top of the Exams, Supplements, Therapy and
Coach AI screens. Therapy is only a reminder list written by the user. There is no gambling, crypto, loans, or other
regulated financial service in the app.
