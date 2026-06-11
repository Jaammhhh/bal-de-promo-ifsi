// ============================================================
//  /api/webhook  (OPTIONNEL — pour l'envoi automatique du billet)
//
//  C'est ICI que se joue la correction du bug de la maquette :
//  le billet n'est généré et envoyé QUE lorsque Stripe confirme
//  que le paiement a réellement abouti (événement
//  "checkout.session.completed"). Impossible d'obtenir un billet
//  sans avoir payé.
//
//  Pré-requis : variables STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//  RESEND_API_KEY, et MAIL_FROM (voir le README).
// ============================================================

const Stripe = require("stripe");
const QRCode = require("qrcode");
const { Resend } = require("resend");
const crypto = require("crypto");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Vercel : ne pas parser le corps, Stripe a besoin du brut pour la signature
module.exports.config = { api: { bodyParser: false } };

function lireBrut(req) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    req.on("data", (c) => morceaux.push(c));
    req.on("end", () => resolve(Buffer.concat(morceaux)));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).end(); return; }

  let event;
  try {
    const brut = await lireBrut(req);
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(brut, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature webhook invalide:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { prenom, nom, nb_places } = session.metadata || {};
    const email = session.customer_email || session.customer_details?.email;

    // Code de billet unique (sert au QR code)
    const code = "BAL2026-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const qrPng = await QRCode.toBuffer(code, { width: 480, margin: 2 });

    try {
      await resend.emails.send({
        from: process.env.MAIL_FROM,           // ex: "Bal de Promo <billet@ton-domaine.fr>"
        to: email,
        subject: "🎟️ Ton billet pour le Bal de Promo 2026",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
            <h1 style="color:#241139">Ton billet est confirmé 🎉</h1>
            <p>Salut ${prenom || ""},</p>
            <p>Merci ! Ta réservation pour le <b>Bal de Promo 2026</b> est validée
               (${nb_places} place${Number(nb_places) > 1 ? "s" : ""}).</p>
            <p><b>Samedi 4 juillet 2026</b> · 19h30 · Salle Arc-en-ciel, Fleury-les-Aubrais</p>
            <p>Présente le QR code ci-joint à l'entrée. Code : <b>${code}</b></p>
            <p style="color:#888;font-size:13px">À bientôt sur le dancefloor !</p>
          </div>`,
        attachments: [
          { filename: "billet-qr.png", content: qrPng.toString("base64") },
        ],
      });
      console.log("Billet envoyé à", email, "—", code);
    } catch (err) {
      console.error("Échec envoi email:", err);
      // On répond quand même 200 pour ne pas que Stripe ré-essaie en boucle ;
      // l'erreur est loggée pour traitement manuel.
    }
  }

  res.status(200).json({ received: true });
};
