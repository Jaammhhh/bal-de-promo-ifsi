// ============================================================
//  /api/create-checkout-session
//  Crée une session de paiement Stripe et renvoie l'URL de la
//  page de paiement sécurisée. Le client est ensuite redirigé.
//  AUCUNE donnée de carte ne passe par ce serveur : c'est Stripe
//  qui l'encaisse, puis reverse l'argent sur ton compte bancaire.
// ============================================================

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRIX_PLACE = 1500; // 15,00 € en centimes
const PRIX_POTE  = 1000; // 10,00 € en centimes
const POTES_MAX  = 10;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    const { prenom, nom, email, potes } = req.body || {};
    const nbPotes = Math.max(0, Math.min(POTES_MAX, parseInt(potes, 10) || 0));

    if (!prenom || !nom || !email) {
      res.status(400).json({ error: "Informations manquantes." });
      return;
    }

    // URL de base du site (https://ton-site.vercel.app)
    const proto = req.headers["x-forwarded-proto"] || "https";
    const base = `${proto}://${req.headers.host}`;

    const line_items = [
      {
        price_data: {
          currency: "eur",
          unit_amount: PRIX_PLACE,
          product_data: { name: "Bal de Promo 2026 — Entrée" },
        },
        quantity: 1,
      },
    ];
    if (nbPotes > 0) {
      line_items.push({
        price_data: {
          currency: "eur",
          unit_amount: PRIX_POTE,
          product_data: { name: "Bal de Promo 2026 — Accompagnant·e" },
        },
        quantity: nbPotes,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: email,
      // On garde les infos pour générer le billet APRÈS confirmation du paiement
      metadata: {
        prenom,
        nom,
        nb_places: String(1 + nbPotes),
      },
      success_url: `${base}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/reservation.html`,
      locale: "fr",
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Impossible de créer le paiement." });
  }
};
