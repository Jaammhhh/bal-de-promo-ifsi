# 🎓 Bal de Promo 2026 — billetterie avec paiement

Site de billetterie recodé, avec un **vrai paiement** : le billet n'est délivré
**qu'après confirmation du paiement** (plus de billet gratuit comme sur la maquette).

```
index.html              → page d'accueil
reservation.html        → formulaire + bouton de paiement
merci.html              → page de confirmation après paiement
css/style.css           → tout le style
js/reservation.js       → calcul du prix + lancement du paiement
api/create-checkout-session.js  → crée le paiement Stripe (obligatoire)
api/webhook.js          → envoie le billet QR par email (optionnel)
package.json            → dépendances
.env.example            → modèle des clés à configurer
```

---

## Comment l'argent arrive sur le compte bancaire

On **ne relie jamais** un compte bancaire directement à un site. C'est **Stripe**
(le prestataire de paiement) qui encaisse les cartes, puis **vire automatiquement
l'argent sur le compte bancaire** que tu lui indiques. Le site ne voit jamais les
numéros de carte → c'est sûr et légal.

```
Visiteur paie  →  Stripe encaisse  →  Stripe vire l'argent sur le compte bancaire
```

> Conseil : pour une asso/promo, ouvre le compte Stripe au nom de l'association
> (ou de la personne qui gère la trésorerie), avec l'IBAN du compte qui recevra
> les fonds. Évite d'utiliser un compte perso si l'argent appartient au groupe.

---

## Étape 1 — Créer le compte Stripe et y mettre l'IBAN

1. Va sur **https://stripe.com** → « Démarrer ».
2. Renseigne les infos demandées (nom, adresse, type d'activité = événementiel/asso).
3. Dans **Réglages → Virements (Payouts)**, ajoute **l'IBAN** du compte bancaire
   qui doit recevoir l'argent. Stripe y versera les recettes automatiquement
   (généralement sous quelques jours).
4. Récupère ta **clé secrète** dans **Développeurs → Clés API** :
   - commence par `sk_test_...` en mode test,
   - puis `sk_live_...` quand tu passes en réel.

---

## Étape 2 — Mettre le site en ligne sur Vercel

Le site original est déjà sur Vercel, on reste donc dessus.

**Option simple (sans Git) :**
1. Installe Node.js, puis dans un terminal : `npm i -g vercel`
2. Place-toi dans ce dossier et lance : `vercel`
3. Suis les questions (login, nom du projet…). Vercel installe les dépendances
   et met le site en ligne.

**Option via GitHub (recommandée pour les mises à jour) :**
1. Crée un dépôt GitHub et pousse ce dossier dedans.
2. Sur **vercel.com** → « Add New Project » → importe le dépôt → « Deploy ».

---

## Étape 3 — Configurer les clés sur Vercel

Sur Vercel : **Settings → Environment Variables**, ajoute :

| Nom | Valeur |
|-----|--------|
| `STRIPE_SECRET_KEY` | ta clé `sk_test_...` (puis `sk_live_...`) |

Puis **redeploie** (onglet Deployments → Redeploy). À ce stade, le **paiement
fonctionne déjà** : le visiteur paie sur la page sécurisée Stripe, puis revient
sur `merci.html`. Tu vois chaque paiement dans le tableau de bord Stripe.

> Pour tester sans dépenser : en mode test, utilise la carte **4242 4242 4242 4242**,
> n'importe quelle date future et n'importe quel CVC.

---

## Étape 4 (optionnelle) — Envoyer le billet QR par email automatiquement

Cette étape active `api/webhook.js`, qui envoie le billet **uniquement après
paiement confirmé**.

1. Crée un compte sur **https://resend.com**, vérifie un domaine d'envoi,
   récupère la clé `RESEND_API_KEY` (`re_...`).
2. Dans Stripe : **Développeurs → Webhooks → Ajouter un endpoint**
   - URL : `https://TON-SITE.vercel.app/api/webhook`
   - Événement à écouter : `checkout.session.completed`
   - Copie le **secret de signature** (`whsec_...`).
3. Ajoute sur Vercel les variables : `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
   `MAIL_FROM` (voir `.env.example`), puis redeploie.

Sans cette étape, tout marche aussi : Stripe envoie automatiquement un reçu par
email, et tu retrouves la liste des participants dans le tableau de bord Stripe
(à exporter / cocher à l'entrée).

---

## Passer en réel

Quand les tests sont concluants : dans Stripe, bascule en **mode Live**,
remplace `sk_test_...` par `sk_live_...` (et le `whsec_...` par celui du
webhook live) dans Vercel, puis redeploie. Fait un vrai achat de test à 15 €
pour vérifier que l'argent arrive bien.

---

## Points juridiques à ne pas oublier (vente de billets)

- Encaisser de l'argent au nom d'un groupe : mieux vaut passer par une
  **association** (ou la MDE/BDE de l'école) plutôt qu'un compte perso.
- Prévois de **vraies mentions légales** et une **politique de confidentialité**
  (le pied de page renvoie vers `#` pour l'instant).
- Respecte la règle de **remboursement** annoncée sur le site.
- Pour une asso française, l'alternative **HelloAsso** (gratuite, billetterie
  intégrée) peut t'éviter toute cette config si tu préfères ne pas coder le
  paiement toi-même.
```
