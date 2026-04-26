// ─── Clients Mira Systems ────────────────────────────────────────────────────
// Pour ajouter un client : copier un objet et modifier les champs.

export const CLIENTS = [
  {
    id: "vitamine-s",
    name: "Vitamine S",
    short: "VS",
    type: "Agence graphique",
    color: "#C0533A",
    contact: "Stéphanie",
    location: "Portes-lès-Valence, Drôme",
  },
  {
    id: "anissa",
    name: "Anissa Lalahoum",
    short: "AL",
    type: "Coaching business",
    color: "#9B5FC0",
    contact: "Anissa",
    rate: "1 700€/mois",
    programs: ["Le Cercle", "Vortex", "Leader", "Alkia Agency"],
  },
];

export const clientById = Object.fromEntries(CLIENTS.map((c) => [c.id, c]));
