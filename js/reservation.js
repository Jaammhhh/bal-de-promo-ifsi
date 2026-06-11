// ============================================================
// Réservation — prix + noms des potes + lancement du paiement
// ============================================================

const PRIX_PLACE = 15; // €
const PRIX_POTE  = 10; // € par pote supplémentaire
const POTES_MAX  = 10;

const chk          = document.getElementById("avec-potes");
const qtyBox       = document.getElementById("potes-qty");
const nbEl         = document.getElementById("nb-potes");
const moins        = document.getElementById("moins");
const plus         = document.getElementById("plus");
const totalEl      = document.getElementById("total");
const btnTotal     = document.getElementById("btn-total");
const linePotes    = document.getElementById("line-potes");
const potesLbl     = document.getElementById("potes-label");
const potesSum     = document.getElementById("potes-sum");
const potesNomsBox = document.getElementById("potes-noms");
const errEl        = document.getElementById("error");
const payBtn       = document.getElementById("pay-btn");
const form         = document.getElementById("resa-form");

let potes = 0;

function nbPotes() { return chk.checked ? potes : 0; }
function total()   { return PRIX_PLACE + nbPotes() * PRIX_POTE; }

// Affiche un champ "Prénom & nom" par pote, en conservant ce qui est déjà tapé
function renderPotesNoms() {
  const n = nbPotes();
  const existing = Array.from(potesNomsBox.querySelectorAll("input")).map((i) => i.value);
  potesNomsBox.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.textContent = `Prénom & nom du pote n°${i + 1}`;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pote-nom";
    input.value = existing[i] || "";
    field.appendChild(label);
    field.appendChild(input);
    potesNomsBox.appendChild(field);
  }
}

function refresh() {
  const p = nbPotes();
  totalEl.textContent = total() + " €";
  btnTotal.textContent = total() + "€";
  nbEl.textContent = potes;
  if (p > 0) {
    linePotes.style.display = "flex";
    potesLbl.textContent = p + " pote" + (p > 1 ? "s" : "") + " × 10 €";
    potesSum.textContent = p * PRIX_POTE + " €";
  } else {
    linePotes.style.display = "none";
  }
  renderPotesNoms();
}

chk.addEventListener("change", () => {
  qtyBox.classList.toggle("show", chk.checked);
  if (chk.checked && potes === 0) potes = 1;
  if (!chk.checked) potes = 0;
  refresh();
});
plus.addEventListener("click", () => { if (potes < POTES_MAX) { potes++; refresh(); } });
moins.addEventListener("click", () => { if (potes > 1) { potes--; refresh(); } });

refresh();

// --- soumission ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.textContent = "";

  const prenom    = document.getElementById("prenom").value.trim();
  const nom       = document.getElementById("nom").value.trim();
  const email     = document.getElementById("email").value.trim();
  const email2    = document.getElementById("email2").value.trim();
  const consent   = document.getElementById("consent").checked;
  const potesNoms = Array.from(document.querySelectorAll(".pote-nom")).map((i) => i.value.trim());

  if (!prenom || !nom)            return fail("Indique ton prénom et ton nom.");
  if (!email)                     return fail("Indique ton email.");
  if (email !== email2)           return fail("Les deux emails ne correspondent pas.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Cet email n'a pas l'air valide.");
  if (nbPotes() > 0 && potesNoms.some((v) => !v)) return fail("Indique le prénom et le nom de chacun de tes potes.");
  if (!consent)                   return fail("Merci de cocher la case de consentement.");

  payBtn.disabled = true;
  payBtn.textContent = "Redirection vers le paiement…";

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom, nom, email, potes: nbPotes(), potesNoms }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "Erreur inattendue.");
    window.location.href = data.url; // → page de paiement sécurisée Stripe
  } catch (err) {
    fail("Le paiement n'a pas pu démarrer : " + err.message);
    payBtn.disabled = false;
    payBtn.innerHTML = 'Payer <span id="btn-total">' + total() + '€</span> et recevoir ma confirmation →';
  }
});

function fail(msg) {
  errEl.textContent = msg;
  return false;
}
