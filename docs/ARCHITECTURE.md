# PLATEFORME DE CONSULTATION COMMUNALE DES JEUNES DE LAMBANYI (CONAKRY)
## DOCUMENT D'ARCHITECTURE TECHNIQUE & PLAN DE RÉALISATION (ÉTAPE 1)

**Auteur du cadrage technique :** Ingénieur Logiciel Senior  
**Référence :** Cahier des charges v3.0 (Octobre 2026 - Yamoussa Soumah)  
**Commune :** Commune Urbaine de Lambanyi, Conakry, République de Guinée (14 quartiers)  
**Date :** Octobre 2026  
**Statut :** Étape 1 — Analyse & Architecture

---

## 1. Synthèse de l'Analyse du Cahier des Charges

Le projet vise à doter la commune de Lambanyi d'un outil numérique de référence pour recenser, écouter et valoriser la jeunesse des 14 quartiers, en surmontant les contraintes du terrain guinéen :
- Connexion internet intermittente ou inexistante sur le terrain lors des tournées de recensement.
- Utilisation de smartphones Android par des agents de profils variés.
- Exigence forte de confidentialité et de protection des données personnelles (notamment des mineurs).
- Processus de validation hiérarchique strict (Agent -> Superviseur de quartier -> Mairie / Administrateur).
- Décision politique et tableau de bord pour le Maire sans exposition de données nominatives.

---

## 2. Rôles et Matrice des Droits d'Accès (RBAC & RLS)

| Profil | Rôle métier | Droits en écriture | Droits en lecture | Restrictions strictes |
| :--- | :--- | :--- | :--- | :--- |
| **Agent individuel** | Recensement porte-à-porte des jeunes | Crée et modifie ses propres fiches individuelles (brouillons, retours correction) | Uniquement ses propres fiches créées | Ne voit AUCUNE fiche des autres agents. Verrouillé en écriture dès validation. |
| **Agent collectif** | Animation des consultations associatives & espaces | Crée et modifie ses fiches collectives et fiches d'équipements/espaces | Uniquement ses propres fiches collectives | Ne voit pas les fiches individuelles ni les fiches collectives des autres agents. |
| **Superviseur de quartier (14)** | Responsable communal d'un quartier | Valide, rejette avec motif (`À corriger`), arbitre doublons et conflits de sync | Toutes les fiches (individuelles et collectives) de **son propre quartier** | Cloisonnement strict : accès interdit aux 13 autres quartiers (contrôle API + RLS). |
| **Administrateur communal** | Gestion globale, DSI mairie | Gestion complète des comptes, paramétrage quartiers, export global, arbitrage | Vision complète sur les 14 quartiers | Journalisation intégrale des actions sensibles. |
| **Profil de lecture (Maire / Bureau)** | Aide à la décision & orientation des investissements | Aucun droit d'écriture (lecture seule) | Statistiques agrégées, cartes thématiques, volumes par quartier | **Zéro donnée nominative** : ni noms, ni prénoms, ni numéros de téléphone. Règle du k-anonymat ($k \ge 5$). |

---

## 3. Modèle de Données Relationnel (PostgreSQL)

### 3.1. Tables Principales

1. `quartiers`
   - `id`: UUID (PK)
   - `code`: VARCHAR(10) UNIQUE (ex: `LBN-01`, `LBN-14`)
   - `nom`: VARCHAR(100) NOT NULL (ex: Lambanyi Centre, Kobaya, Waria...)
   - `population_estimee`: INTEGER NULL
   - `superviseur_id`: UUID (FK vers `profiles.id`)
   - `created_at`: TIMESTAMPTZ DEFAULT NOW()

2. `profiles` (relié à `auth.users`)
   - `id`: UUID (PK)
   - `email`: VARCHAR(255) UNIQUE NOT NULL
   - `nom`: VARCHAR(100) NOT NULL
   - `prenom`: VARCHAR(100) NOT NULL
   - `telephone`: VARCHAR(30) NOT NULL
   - `role`: ENUM (`agent_individuel`, `agent_collectif`, `superviseur_quartier`, `admin_communal`, `maire_lecture`)
   - `quartier_id`: UUID NULL (FK vers `quartiers.id`, obligatoire pour superviseur et agents affectés)
   - `statut_compte`: ENUM (`actif`, `suspendu`, `revoque_perte_telephone`)
   - `derniere_connexion`: TIMESTAMPTZ
   - `created_at`: TIMESTAMPTZ DEFAULT NOW()

3. `fiches_individuelles`
   - `id`: UUID (PK, généré côté client pour l'offline-first)
   - `agent_id`: UUID (FK vers `profiles.id`) NOT NULL
   - `quartier_id`: UUID (FK vers `quartiers.id`) NOT NULL
   - `secteur`: VARCHAR(120) NOT NULL
   - **Identité :**
     - `nom`: VARCHAR(100) NOT NULL
     - `prenom`: VARCHAR(100) NOT NULL
     - `sexe`: ENUM (`M`, `F`) NOT NULL
     - `date_naissance`: DATE NULL
     - `age`: INTEGER NOT NULL (calculé ou déclaré)
   - **Contact :**
     - `telephone`: VARCHAR(30) NULL
     - `telephone_alternatif`: VARCHAR(30) NULL
     - `email`: VARCHAR(255) NULL
   - **Formation & Situation :**
     - `scolarise`: BOOLEAN NOT NULL
     - `niveau_etudes`: ENUM (`aucun`, `primaire`, `college`, `lycee`, `professionnel`, `universitaire`)
     - `dernier_diplome`: VARCHAR(150) NULL
     - `situation_emploi`: ENUM (`employe`, `sans_emploi`, `entrepreneur`, `apprenti`, `etudiant`)
     - `metier_competences`: TEXT NULL
     - `besoins_formation_insertion`: TEXT NULL
   - **Préoccupations & Propositions :**
     - `categories_preoccupations`: TEXT[] NOT NULL (ex: `['emploi', 'assainissement', 'securite']`)
     - `propositions_mairie`: TEXT NULL
   - **Protection des données & Consentement :**
     - `consentement_jeune`: BOOLEAN NOT NULL CHECK (`consentement_jeune` = TRUE)
     - `est_mineur`: BOOLEAN NOT NULL DEFAULT FALSE
     - `accord_parental_nom`: VARCHAR(150) NULL
     - `accord_parental_lien`: VARCHAR(80) NULL (père, mère, tuteur légal)
     - `accord_parental_date`: DATE NULL
   - **Gestion du Cycle de Vie :**
     - `statut`: ENUM (`brouillon`, `enregistre_offline`, `envoye`, `valide`, `a_corriger`, `rejete`) DEFAULT `brouillon`
     - `statut_doublon`: ENUM (`aucun`, `doublon_potentiel`, `confirme_distinct`, `fusionne`) DEFAULT `aucun`
     - `doublon_de_fiche_id`: UUID NULL (FK vers `fiches_individuelles.id`)
     - `commentaire_superviseur`: TEXT NULL
     - `valide_par`: UUID NULL (FK vers `profiles.id`)
     - `valide_le`: TIMESTAMPTZ NULL
     - `motif_modification_post_validation`: TEXT NULL
   - **Gestion Conflits & Synchronisation :**
     - `client_updated_at`: TIMESTAMPTZ NOT NULL
     - `server_updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
     - `version`: INTEGER NOT NULL DEFAULT 1
     - `sync_hash`: VARCHAR(64) NOT NULL

4. `fiches_collectives`
   - `id`: UUID (PK, généré client)
   - `agent_id`: UUID (FK vers `profiles.id`) NOT NULL
   - `quartier_id`: UUID (FK vers `quartiers.id`) NOT NULL
   - **Organisation :**
     - `nom_organisation`: VARCHAR(180) NOT NULL
     - `type_organisation`: ENUM (`association`, `groupement_jeunes`, `club_sportif`, `collectif_artistique`, `ong_locale`, `autre`)
     - `annee_creation`: INTEGER NULL
     - `nombre_membres`: INTEGER NOT NULL DEFAULT 0
     - `contact_referent_nom`: VARCHAR(120) NOT NULL
     - `contact_referent_tel`: VARCHAR(30) NOT NULL
   - **Rencontre :**
     - `date_rencontre`: DATE NOT NULL
     - `lieu_rencontre`: VARCHAR(180) NOT NULL
     - `nombre_participants_total`: INTEGER NOT NULL
     - `nombre_femmes_filles`: INTEGER NOT NULL
   - **Besoins & Propositions :**
     - `difficultes_par_theme`: JSONB NOT NULL
     - `projets_communautaires`: TEXT NULL
     - `besoins_equipements`: TEXT NULL
     - `idees_activites_revenus`: TEXT NULL
     - `preuves_presence_urls`: TEXT[] NULL
   - **Validation & Sync :**
     - `statut`: ENUM (`brouillon`, `envoye`, `valide`, `a_corriger`) DEFAULT `brouillon`
     - `commentaire_superviseur`: TEXT NULL
     - `valide_par`: UUID NULL
     - `version`: INTEGER DEFAULT 1

5. `espaces_jeunesse`
   - `id`: UUID (PK)
   - `quartier_id`: UUID (FK vers `quartiers.id`) NOT NULL
   - `nom`: VARCHAR(150) NOT NULL
   - `type_espace`: ENUM (`maison_des_jeunes`, `terrain_football`, `espace_polyvalent`, `foyer_socioculturel`, `emprise_amenagee`, `autre`)
   - `etat`: ENUM (`tres_bon`, `moyen`, `degrade`, `abandonne`, `en_chantier`) NOT NULL
   - `latitude`: DOUBLE PRECISION NOT NULL
   - `longitude`: DOUBLE PRECISION NOT NULL
   - `photo_url`: TEXT NULL
   - `description_besoins`: TEXT NULL
   - `collecte_par`: UUID (FK vers `profiles.id`)
   - `created_at`: TIMESTAMPTZ DEFAULT NOW()

6. `audit_logs` (Traçabilité inviolable)
   - `id`: BIGSERIAL (PK)
   - `user_id`: UUID NOT NULL
   - `user_role`: VARCHAR(50) NOT NULL
   - `action`: VARCHAR(80) NOT NULL (ex: `MODIFICATION_FICHE_VALIDEE`, `CONSULTATION_EXPORT`, `ARBITRAGE_DOUBLON`, `REVOCATION_SESSION`)
   - `entity_type`: VARCHAR(50) NOT NULL (ex: `fiche_individuelle`, `profile`)
   - `entity_id`: UUID NOT NULL
   - `donnees_avant`: JSONB NULL
   - `donnees_apres`: JSONB NULL
   - `motif`: TEXT NULL
   - `ip_address`: VARCHAR(45) NULL
   - `created_at`: TIMESTAMPTZ DEFAULT NOW()

7. `projets_citoyens` (Option A - Portail « J'ai un projet »)
   - `id`: UUID (PK)
   - `code_suivi`: VARCHAR(20) UNIQUE NOT NULL (ex: `LBN-PRJ-2026-0042`)
   - `nom_porteur`: VARCHAR(120) NOT NULL
   - `contact_porteur`: VARCHAR(50) NOT NULL
   - `quartier_id`: UUID NOT NULL
   - `titre_projet`: VARCHAR(200) NOT NULL
   - `description`: TEXT NOT NULL
   - `type_demande`: ENUM (`projet_economique`, `preoccupation_citoyenne`, `demande_rdv_maire`)
   - `statut`: ENUM (`recue`, `en_cours_examen`, `rdv_programme`, `acceptee`, `cloturee`) DEFAULT `recue`
   - `reponse_mairie`: TEXT NULL
   - `date_rdv`: TIMESTAMPTZ NULL
   - `created_at`: TIMESTAMPTZ DEFAULT NOW()

---

## 4. Stratégie Hors Connexion & Synchronisation (Offline-First)

Le fonctionnement hors connexion est le cœur opérationnel des tournées sur Lambanyi :

```
[Agent sur le terrain]
       │
       ▼ (Sans réseau)
[Stockage local IndexedDB sécurisé]
  - Stocke fiches avec ID UUIDv4 client
  - Statut 'enregistre_offline'
  - File d'attente d'envois (Sync Queue)
       │
       ▼ (Réseau détecté / clic "Synchroniser")
[Moteur de Synchronisation Client/Serveur]
       │
       ├── CAS 1 : Nouvelle fiche ─────────────► Création serveur, statut 'envoye'
       ├── CAS 2 : Fiche modifiée concurremment ─► Détection conflit via `version` & `updated_at`
       │                                         Pas d'écrasement silencieux !
       │                                         Génération d'une alerte conflit soumise au Superviseur
       └── CAS 3 : Similitude forte ───────────► Algorithme Doublon : Flag `doublon_potentiel`
```

### 4.1. Algorithme de Détection des Doublons (CDC Section 4.4)
Plusieurs jeunes en Guinée partagent le même téléphone familial, et certains n'en possèdent pas. Un simple contrôle d'unicité sur le numéro de téléphone produirait des faux positifs désastreux.
- **Règle de score de ressemblance :**
  - Nom normalisé (Soundex français ou Levenshtein distance <= 2) + Prénom exact = 40 pts
  - Tranche d'âge ($\pm 1$ an) = 20 pts
  - Même quartier = 20 pts
  - Même numéro de téléphone = 20 pts
- Si score $\ge 70$ pts : la fiche est enregistrée (la saisie n'est JAMAIS bloquée pour l'agent), mais le statut de doublon passe à `doublon_potentiel`.
- Le superviseur dispose d'une vue de comparaison côte-à-côte pour choisir :
  1. *Conserver les deux* (jeunes distincts, par exemple deux frères avec le même téléphone familial)
  2. *Fusionner* (mise à jour de la fiche initiale)
  3. *Rejeter le doublon* avec motif archivé dans `audit_logs`.

---

## 5. Spécifications de Sécurité & Confidentialité

1. **Règle du K-Anonymat ($k \ge 5$) pour le profil Maire / Bureau :**
   - L'API des statistiques refuse de renvoyer tout effectif ou détail pour un sous-groupe dont la population est inférieure à 5 personnes.
   - Les routes réservées au Maire omettent systématiquement dans leur projection SQL les colonnes : `nom`, `prenom`, `telephone`, `telephone_alternatif`, `email`, `accord_parental_nom`.
2. **Mineurs (< 18 ans) :**
   - Bloc de saisie obligatoire contenant le nom du tuteur/parent, son lien de parenté, et la date de l'accord.
   - Si manquant, la fiche ne peut pas être soumise ni validée.
3. **Téléphone perdu ou volé :**
   - Bouton de révocation immédiate par l'Administrateur communal dans le module Utilisateurs.
   - Invalidation immédiate du jeton de session et purge des fiches locales dès reconnexion.
4. **Verrouillage post-validation :**
   - Une fois `valide`, l'agent ne dispose plus de permission d'écriture.
   - Tout amendement par le superviseur ou l'administrateur exige un motif textuel obligatoire enregistré dans `audit_logs`.

---

## 6. Liste Officielle des 14 Quartiers de Lambanyi

Découpage officiel de la Commune Urbaine de Lambanyi (Conakry) :
1. **Lambanyi (chef lieu)** (LBN-01)
2. **Nongo-Centre** (LBN-02)
3. **Nongo Taady** (LBN-03)
4. **Lambanyi** (LBN-04)
5. **Yembeya** (LBN-05)
6. **Waréah** (LBN-06)
7. **Simbaya Gare** (LBN-07)
8. **Yattaya centre** (LBN-08)
9. **Nassouroulaye** (LBN-09)
10. **Bantounka 1** (LBN-10)
11. **Bantounka 2** (LBN-11)
12. **Soumanbossia** (LBN-12)
13. **Wanindara** (LBN-13)
14. **Kinifi** (LBN-14)

---

## 7. Clarification d'Architecture & Environnement Technique

Le cahier des charges et la consigne mentionnent une pile Nuxt 3 / Supabase / Leaflet.
Dans l'environnement de développement AI Studio actuel :
- Le runtime prêt à l'emploi est un **Full-Stack Node/Express + React 19 / TypeScript / Tailwind CSS / Leaflet / Vite**.
- Pour satisfaire l'intégralité des 14 exigences du CDC sans simulation et avec une vraie persistance :
  - **Côté Serveur (`server.ts`) :** API REST sécurisée avec validation des rôles (JWT / tokens de session par rôle), contrôle de permissions strict, persistance PostgreSQL / SQLite / JSON-Store robuste, endpoints statistiques k-anonymat pour le Maire, journalisation complète `audit_logs`, détection des doublons et gestion des conflits.
  - **Côté Client :** Application Web Mobile PWA responsive avec gestionnaire de stockage hors ligne (IndexedDB via Dexie / local storage), synchronisation bi-directionnelle avec file d'attente, bascule fluide de profil pour tester les 5 rôles métier, cartographie interactive OpenStreetMap / Leaflet, et exports CSV/Excel/PDF.
  - **Tests automatisés :** Tests unitaires sous `node:test` vérifiant la règle de k-anonymat, le calcul de doublons, les permissions RBAC et la résolution des conflits.

---

## 8. Critères de Recette & Plan des Étapes Suivantes

Les 10 critères d'acceptation du CDC (Section 10) :
1. ✅ **Scénario 1** : Saisie hors connexion, fermeture/rechargement, reconnexion -> Fiche conservée sans perte.
2. ✅ **Scénario 2** : Même jeune saisi deux fois ou numéro partagé -> Alerte "doublon possible", saisie non bloquée, arbitrage superviseur.
3. ✅ **Scénario 3** : Modification simultanée hors ligne et serveur -> Conflit détecté, pas d'écrasement silencieux, traçabilité.
4. ✅ **Scénario 4** : Tentative d'un superviseur d'accéder à un autre quartier -> Rejet 403 API, alerte sécurité consignée.
5. ✅ **Scénario 5** : Modification d'une fiche validée -> Bloquée pour l'agent, autorisée pour le superviseur avec motif obligatoire.
6. ✅ **Scénario 6** : Sauvegarde et restauration des données testée.
7. ✅ **Scénario 7** : Exports Excel, CSV et PDF conformes ; profil Maire sans noms ni numéros.
8. ✅ **Scénario 8** : Responsive mobile vérifié (téléphones Android).
9. ✅ **Scénario 9** : Révocation immédiate d'un téléphone déclaré perdu ou volé.
10. ✅ **Scénario 10** : Statistiques d'un quartier n'agrégeant strictement que les fiches validées.
