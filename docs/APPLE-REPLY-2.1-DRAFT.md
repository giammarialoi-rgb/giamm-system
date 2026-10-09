# Apple 2.1 "Information Needed" - reply draft (English)

DRAFT. Not committed. Items in [BRACKETS] must be filled in or checked by hand before sending.
Reply in App Store Connect AND paste the same text in App Review Information > Notes.

---

Hello App Review team,

Thank you for your message. Here is the information requested for **Nurvan** (bundle ID com.nurvan.app, build 1.5.34 (1070)).

## 1. Screen recording

Recorded on a physical iPhone running the latest iOS: [LINK / attached file]. It starts with the app launch and shows: account registration (email, plus Google and Apple sign-in), login, the paid plans screen with Restore Purchases and Manage Subscription, reporting and blocking in the coach-athlete chat, and account deletion (Settings > Privacy and data > DELETE ACCOUNT).

## 2. Purpose and target audience

Nurvan is a training and nutrition companion for people who lift weights or train at home, and for the personal trainers who coach them. The user builds or imports a training program, logs workouts (sets, loads, reps, rest timer), tracks meals and targets, and sees progress. Personal trainers can use a coach mode to manage athletes, share programs, and chat with them. The app solves the problem of keeping programs, logs, nutrition and coach communication in one place instead of spreadsheets and chat apps. Users must be at least 16 years old (confirmed at registration). Nurvan is not a medical device and gives no diagnosis or treatment; fixed disclaimers are shown in the Exams, Supplements, Therapy and AI Coach areas.

## 3. How to access the main features

Demo accounts (all verified, no email confirmation needed):

- Free user: review-free@nurvan.app / [PASSWORD]
- Coach (Coach Pro plan): review-coach@nurvan.app / [PASSWORD]
- Athlete linked to the coach: opens at its personal link https://app.nurvan.app/c/review-client-demo (the coach's clients use the same web app through the link their coach sends) with username "revisorecliente" (not an email) / [PASSWORD]. It has no AI Coach and no plans screen, as for any coach athlete.
- Personal account with sample data: review-athlete@nurvan.app / [PASSWORD]

On first login the app shows a privacy and consent sheet: please tick the age (16+), privacy/terms and health-data consents.

- **Training:** open the TRAIN tab; the demo accounts already contain a program and workout history.
- **AI Coach (review-free):** the AI Coach chat is part of the paid plans. With review-free, open MENU > Plans and tap "ACTIVATE 14 DAYS OF COACH". It is a free trial managed by the app, with no charge and no automatic renewal, and it unlocks the AI Coach chat. The first AI use asks for a separate AI consent (tap ACTIVATE).
- **Paid content / purchases:** MENU > Plans and Pro. Subscriptions are In-App Purchases (auto-renewing), with price and duration shown from the App Store, links to Terms and Privacy, RESTORE PURCHASES and MANAGE SUBSCRIPTION at the bottom of the screen. The app does not link to any external payment. review-free is the account to use for testing a sandbox purchase.
- **Chat, report and block:** log in as review-coach > MENU > Coach mode > HUB > "Revisore Cliente" > CHAT tab. The client side of the chat opens at https://app.nurvan.app/c/review-client-demo (username "revisorecliente"), COACH tab > chat. The "REPORT / BLOCK" button is in the chat bar.
- **Account deletion:** MENU > Settings > Privacy and data > DELETE ACCOUNT (type DELETE to confirm). It deletes the account and data, revokes the Sign in with Apple token and removes the purchase history. An active subscription is not cancelled automatically: the app warns and offers MANAGE SUBSCRIPTION.

## 4. External services

- Hosting and database: Render (Node web service and PostgreSQL), behind Cloudflare.
- Authentication: email and password (verification emails sent through Resend), Google Sign-In and Sign in with Apple (both through the system browser).
- Payments: RevenueCat for In-App Purchases (it receives only the Nurvan account ID, product and expiry; no card data). Stripe is used only on the website, never inside the iOS app.
- AI: Google Gemini (gemini-2.5-flash) for the AI Coach, file and photo analysis, label OCR and barcode lookup. It runs only after the user gives a separate, revocable AI consent, and the request content (text, files or photos, and the training context needed to answer) is sent to Google. Athletes linked to a coach do not use the AI Coach.
- Food data: USDA FoodData Central, Open Food Facts and FatSecret (search text and barcodes, through our server), plus local catalogues bundled in the app.
- Video calls in coach chat: WebRTC with PeerJS cloud signalling and Google STUN servers; chat is end-to-end encrypted.
- Libraries loaded at runtime from CDN: jsDelivr (OCR and PDF libraries; the OCR runs on the device) and Google Fonts.
- Scientific search ("Evidenze" box): PubMed (NCBI E-utilities), called by our server with only the words typed in the search box; nothing is stored.
- YouTube: outgoing links only (exercise technique); no embedded player or API.
- Apple frameworks: speech recognition for dictation to the AI Coach (Apple-handled), local notifications and badge.
- No third-party analytics, advertising or crash-reporting SDKs. We only count a once-a-day anonymous app ping (platform and a daily hash) on our own server.

## 5. Regional differences

The app works the same in all regions and has no geographic restrictions. It is available in 10 languages (Italian, English, Spanish, French, German, Portuguese, Russian, Chinese, Arabic, Hindi). Subscription prices are shown by the App Store in local currency. The only regional nuance: food-database search results are localized for Italian, English, Spanish, French and German; other languages fall back to the Italian default and food names are translated automatically.

## 6. Regulated industry

Nurvan is a fitness and wellness tool, not a medical device. It does not diagnose, treat or prescribe, and it contains fixed, non-dismissible disclaimers saying so in the Exams, Supplements, Therapy and AI Coach areas. No licenses or protected third-party material are required. [CHECK: confirm this statement is accurate for your situation.]

## Content moderation (UGC)

User content is limited to coach-athlete chat. Users can report and block from the chat; reports are reviewed within 24 hours, and an administrator can suspend the reported account. The Terms (section 7) prohibit offensive content.

Thank you,
[NAME]
