// ============================================================
//  /api/places
//  Compte le nombre de places réservées en interrogeant Stripe
//  (paiements réussis, hors paiements remboursés) et renvoie
//  le total + le nombre de places restantes.
//  Pour changer la capacité de la salle, modifie CAPACITE ci-dessous.
// ============================================================

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CAPACITE = 200; // nombre total de places

module.exports = async (req, res) => {
  try {
    let places = 0;
    let starting_after;

    // On parcourt les sessions de paiement (max ~1000, large pour un bal)
    for (let i = 0; i < 10; i++) {
      const params = {
        limit: 100,
        status: "complete",
        expand: ["data.payment_intent.latest_charge"],
      };
      if (starting_after) params.starting_after = starting_after;

      const batch = await stripe.checkout.sessions.list(params);

      for (const s of batch.data) {
        if (s.payment_status !== "paid") continue;

        // On ne compte pas les paiements remboursés
        const ch = s.payment_intent && s.payment_intent.latest_charge;
        const rembourse = ch && (ch.refunded || (ch.amount_refunded && ch.amount_refunded >= ch.amount));
        if (rembourse) continue;

        const n = parseInt((s.metadata && s.metadata.nb_places) || "1", 10) || 1;
        places += n;
      }

      if (!batch.has_more) break;
      starting_after = batch.data[batch.data.length - 1].id;
    }

    // Cache court côté CDN pour ne pas appeler Stripe à chaque visite
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json({
      places,
      capacite: CAPACITE,
      restantes: Math.max(0, CAPACITE - places),
    });
  } catch (err) {
    console.error("places error:", err);
    res.status(500).json({ error: "indisponible" });
  }
};
