// ─── Rituels quotidiens — Anissa Lalahoum ───────────────────────────────────
// Réinitialisés automatiquement chaque jour à minuit.

export const RITUALS = [
  {
    id: "r1",
    title: "Check inbox team support",
    desc: "Vérifier la boîte mail support chaque jour.",
    steps: [
      "Ouvrir Gmail support Anissa",
      "Scanner les nouveaux messages du jour",
      "Trier : auto-traité / à traiter humain / urgent",
      "Répondre aux urgents immédiatement",
    ],
  },
  {
    id: "r2",
    title: "Check notifications clients",
    desc: "Regarder toutes les notifications des plateformes clientes.",
    steps: [
      "Ouvrir GHL et vérifier les alertes",
      "Ouvrir Stripe et vérifier les paiements",
      "Regarder les DM Instagram pros",
      "Prendre action si besoin",
    ],
  },
  {
    id: "r3",
    title: "Validation leads prioritaires",
    desc: "Valider les leads chauds du jour pour qu'Anissa les traite en priorité.",
    steps: [
      "Ouvrir GHL → tag 'Lead chaud'",
      "Regarder les nouveaux leads de la veille / du jour",
      "Prioriser ceux à fort potentiel",
      "Transmettre à Anissa via WhatsApp si besoin de closing",
    ],
  },
  {
    id: "r4",
    title: "Check paiements échoués Stripe",
    desc: "Vérifier les paiements échoués pour éviter toute perte de revenu.",
    steps: [
      "Ouvrir Stripe → section 'Failed payments'",
      "Lister les échecs du jour",
      "Vérifier que les workflows de relance se sont déclenchés",
      "Alerter Anissa si montant important",
    ],
  },
  {
    id: "r5",
    title: "Review ManyChat AI",
    desc: "Vérifier que les conversations ManyChat se passent bien et corriger si besoin.",
    steps: [
      "Ouvrir ManyChat",
      "Regarder les 20 dernières conversations",
      "Identifier les cas où l'IA a mal répondu",
      "Corriger les flux ou transférer à un humain",
    ],
  },
];
