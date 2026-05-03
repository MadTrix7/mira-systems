# TODO

## En cours — Calendrier : panneau jour cliquable
Permettre de cliquer sur un jour dans la vue Calendrier pour voir toutes ses tâches, et cliquer sur une tâche pour la modifier (titre, date, notes, etc.).

### Étapes
- [ ] Ajouter état `selectedCalDay` (string ISO ou null)
- [ ] Stop propagation sur bouton `+` (sinon clic ouvre aussi le panneau)
- [ ] Cell `onClick` → `setSelectedCalDay(cellStr)`
- [ ] `TaskChip` accepte `onClick` prop, stopPropagation, ouvre panneau + expand cette tâche
- [ ] Panneau sous le calendrier (quand `selectedCalDay` set) : liste `TaskCard` pour ce jour avec édition complète
- [ ] Bouton fermer + ESC → reset `selectedCalDay`
- [ ] Test browser : clic jour → panneau, clic chip → expand, drag&drop intact
