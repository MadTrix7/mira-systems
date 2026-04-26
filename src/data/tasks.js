// ─── Missions initiales Mira Systems ────────────────────────────────────────
// status : "active" | "review" | "upcoming" | "done"
// priority : "urgent" | null

export const INITIAL_TASKS = [
  // ── Vitamine S ──────────────────────────────────────────────────────────
  {
    id: "vs-1",
    client: "vitamine-s",
    status: "active",
    due: "2026-04-28",
    project: "Newsletters",
    priority: null,
    title: "Newsletter mensuelle #4 — Vitamine S",
    description:
      "Rédiger et intégrer la newsletter d'avril. Thème : témoignage client et promo printemps.",
    steps: [
      "Brief avec Stéphanie sur le thème du mois",
      "Rédiger le texte (300–400 mots)",
      "Créer le visuel header sur Canva",
      "Intégrer dans MailerLite",
      "Envoyer le test à Stéphanie pour validation",
      "Programmer l'envoi final",
    ],
  },
  {
    id: "vs-2",
    client: "vitamine-s",
    status: "done",
    due: "2026-04-20",
    project: "Social Media",
    priority: null,
    title: "Post Instagram — Projet Daxen Stand",
    description:
      "Caption et visuel pour le post de présentation du stand Daxen.",
    steps: [
      "Récupérer les photos du stand",
      "Rédiger la caption storytelling client",
      "Créer le carrousel Canva",
      "Envoyer pour validation Stéphanie",
    ],
  },

  // ── Anissa Lalahoum ─────────────────────────────────────────────────────
  {
    id: "an-1",
    client: "anissa",
    status: "active",
    due: "2026-04-15",
    project: "Retraites",
    priority: "urgent",
    title: "Infos retraite digitale — Mai 2026",
    description:
      "Demander à Anissa toutes les informations pour lancer la campagne de la retraite digitale de mai.",
    steps: [
      "Créer un mail à Anissa — objet : 'Infos retraite digitale mai'",
      "Demander : dates exactes, prix, lien Zoom, programme, places dispo, deadline d'inscription",
      "Demander les photos et visuels à utiliser pour les créations",
      "Envoyer le mail et créer une relance J+2 si pas de réponse",
      "Ranger toutes les infos reçues dans Notion 'Retraite digitale mai'",
    ],
  },
  {
    id: "an-2",
    client: "anissa",
    status: "active",
    due: "2026-04-15",
    project: "Retraites",
    priority: "urgent",
    title: "Infos retraite physique — Juillet 2026",
    description:
      "Récupérer toutes les informations pour la retraite physique de juillet avec hébergement.",
    steps: [
      "Même démarche que pour la retraite de mai",
      "Demander en plus : lieu exact, adresse complète, photos du lieu, conditions d'annulation",
      "Demander le prix avec et sans hébergement",
      "Ranger dans Notion 'Retraite physique juillet'",
    ],
  },
  {
    id: "an-3",
    client: "anissa",
    status: "upcoming",
    due: "2026-04-25",
    project: "Retraites",
    priority: null,
    title: "Campagne email — Retraite digitale mai",
    description:
      "Créer la séquence email de vente pour la retraite digitale de mai dans GoHighLevel.",
    steps: [
      "Créer le funnel dans GHL",
      "Rédiger les 3 emails de la séquence de vente",
      "Créer les visuels Canva pour les emails",
      "Tester l'automation complète",
      "Valider avec Anissa avant activation",
    ],
  },
];
