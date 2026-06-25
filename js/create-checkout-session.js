// ============================================================
//  /api/create-checkout-session
//  Deux formules :
//   • type "place"   : Entrée 15 € (+ une ligne nominative par pote à 10 €)
//   • type "externe" : Place externe solo à 10 €
//  Chaque participant apparaît par son nom sur le paiement / le reçu.
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
    const { type, prenom, nom, email, potes, potesNoms } = req.body || {};
    const estExterne = type === "externe";

    if (!prenom || !nom || !email) {
      res.status(400).json({ error: "Informations manquantes." });
      return;
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const base = `${proto}://${req.headers.host}`;

    let line_items = [];
    let nbPlaces = 1;
    let noms = [];

    if (estExterne) {
      // Formule externe solo : une seule ligne à 10 €
      line_items.push({
        price_data: {
          currency: "eur",
          unit_amount: PRIX_POTE,
          product_data: { name: `Bal de Promo 2026 — Place externe · ${prenom} ${nom}` },
        },
        quantity: 1,
      });
    } else {
      // Formule classique : entrée 15 € + une ligne nominative par pote
      const nbPotes = Math.max(0, Math.min(POTES_MAX, parseInt(potes, 10) || 0));
      noms = Array.isArray(potesNoms)
        ? potesNoms.map((n) => String(n).trim()).filter(Boolean).slice(0, nbPotes)
        : [];
      if (noms.length < nbPotes) {
        res.status(400).json({ error: "Le nom de chaque pote est requis." });
        return;
      }
      nbPlaces = 1 + nbPotes;

      line_items.push({
        price_data: {
          currency: "eur",
          unit_amount: PRIX_PLACE,
          product_data: { name: `Bal de Promo 2026 — Entrée · ${prenom} ${nom}` },
        },
        quantity: 1,
      });
      for (const poteNom of noms) {
        line_items.push({
          price_data: {
            currency: "eur",
            unit_amount: PRIX_POTE,
            product_data: { name: `Bal de Promo 2026 — Accompagnant·e · ${poteNom}` },
          },
          quantity: 1,
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: email,
      metadata: {
        type: estExterne ? "externe" : "place",
        prenom,
        nom,
        nb_places: String(nbPlaces),
        potes_noms: noms.join(", ") || "—",
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
