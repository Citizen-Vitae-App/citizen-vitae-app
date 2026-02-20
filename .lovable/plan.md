

# Logs de certification de presence - Super Admin

## Objectif
Remplacer le placeholder actuel de l'onglet "Logs" par une interface complete de suivi des certifications de presence, avec tableau paginable, filtres, et detection d'anomalies.

## 1. Nouvelle table `certification_logs`

Creer une table dediee pour enregistrer chaque tentative de certification (reussie ou echouee), independamment de `event_registrations`.

**Colonnes :**
- `id` (uuid, PK)
- `user_id` (uuid, ref profiles)
- `event_id` (uuid, ref events)
- `registration_id` (uuid, ref event_registrations, nullable)
- `action` (text) : `qr_scan_arrival`, `qr_scan_departure`, `self_certification`, `face_match_attempt`, `face_match_success`, `face_match_failure`
- `status` (text) : `success`, `failure`, `suspicious`
- `method` (text) : `qr_code`, `self_certification`, `face_match`
- `ip_address` (text, nullable)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)
- `metadata` (jsonb, nullable) : details supplementaires (score face match, raison echec, etc.)
- `created_at` (timestamptz, default now())

**RLS :** Lecture uniquement pour les super_admins. Insertion via service_role (depuis les edge functions et RPC existants).

## 2. Nouveau hook `useCertificationLogs`

Hook React Query qui :
- Interroge `certification_logs` avec jointures sur `profiles` (nom, email) et `events` (nom)
- Supporte la pagination serveur (range-based via Supabase)
- Supporte les filtres : statut, plage de dates, recherche texte (nom ou email)
- Retourne le total pour la pagination

## 3. Nouveau composant `LogsTab` (refonte complete)

Remplace le placeholder existant avec :

**En-tete :**
- Titre "Logs de certification"
- Compteur de logs total

**Barre de filtres :**
- Recherche par nom d'utilisateur ou email
- Filtre par statut (Tous / Succes / Echec / Suspect) via boutons ou select
- Filtre par plage de dates (date debut / date fin)

**Tableau :**
| Horodatage | Utilisateur | Evenement | Methode | Statut | Localisation |
|---|---|---|---|---|---|
| Date/heure formatee | Nom + email | Nom evenement | Icone + label (QR Code, Self-certif, Face Match) | Badge colore | Coordonnees GPS ou "-" |

- Badge vert pour "Succes", rouge pour "Echec", orange/rouge clignotant pour "Suspect"
- Icones : `QrCode` pour QR, `MapPin` pour self-certif, `ScanFace` pour face match

**Pagination :**
- 20 lignes par page
- Navigation precedent/suivant

**Design :** Memes couleurs HSL que le reste du dashboard super admin (fond sombre, bordures, texte gris clair).

## 4. Integration des logs dans les flux existants

Modifier les fonctions existantes pour creer des entrees dans `certification_logs` :
- `update_registration_certification` (RPC) : ajouter un INSERT dans `certification_logs` a chaque appel
- Edge function `didit-verification` (actions `face-match`, `verify-qr-code`) : ajouter un INSERT dans `certification_logs`

Cela sera fait via un trigger PostgreSQL sur `event_registrations` qui detecte les changements de colonnes de certification et cree automatiquement un log.

## 5. Detection d'anomalies

Un trigger ou une logique dans le hook qui marque comme `suspicious` :
- Plus de 3 echecs face match en 24h pour un meme utilisateur
- Certification depuis des coordonnees GPS eloignees du lieu de l'evenement

Pour la V1, on se concentre sur la mise en evidence visuelle (badge rouge) des statuts `failure` et `suspicious` sans detection automatique complexe. La detection automatique sera une evolution future.

## Fichiers concernes

**Nouveaux fichiers :**
- Migration SQL : table `certification_logs` + trigger sur `event_registrations` + RLS
- `src/hooks/useCertificationLogs.tsx` : hook de recuperation paginee
- `src/components/super-admin/LogsTab.tsx` : refonte complete

**Fichiers modifies :**
- Aucun fichier existant modifie en dehors du LogsTab.tsx (remplacement du placeholder)

## Details techniques

```text
certification_logs
+----------------+-------------+----------+
| id (uuid PK)   | user_id     | event_id |
| registration_id | action     | status   |
| method         | ip_address  | latitude |
| longitude      | metadata   | created_at|
+----------------+-------------+----------+

Trigger: after UPDATE on event_registrations
  -> INSERT INTO certification_logs when certification columns change
```

Le trigger detecte les changements sur `certification_start_at`, `certification_end_at`, `face_match_passed`, et `status` (passage a `self_certified`) pour creer automatiquement les entrees de log.

