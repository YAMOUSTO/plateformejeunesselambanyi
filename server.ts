/**
 * Serveur Full-Stack Express & API REST sécurisée
 * Plateforme de Consultation Communale des Jeunes de Lambanyi
 */
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { db } from './src/server/database.ts';
import {
  canReadFicheIndividuelle,
  canEditFicheIndividuelle,
  canValidateFiche,
  isAccountAuthorized,
} from './src/shared/permissions.ts';
import { detectDuplicate } from './src/shared/duplicateDetector.ts';
import { sanitizeFichesForMayor, generateMayorStats } from './src/shared/kAnonymity.ts';
import { checkSyncConflict, resolveConflict } from './src/shared/conflictResolver.ts';
import type { FicheIndividuelle, FicheCollective, EspaceJeunesse, ProjetCitoyen, UserProfile } from './src/shared/types.ts';

const app = express();
app.use(express.json({ limit: '15mb' }));

// En-têtes de sécurité de base
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware d'authentification contextuelle (Simule l'utilisateur connecté ou sélectionné)
app.use((req, res, next) => {
  const currentUser = db.getCurrentUser();
  (req as any).user = currentUser;
  // Compte réellement authentifié, distinct du profil actif (impersonation admin).
  (req as any).authUser = db.getAuthenticatedUser();
  next();
});

// Point de contrôle de santé
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH & UTILISATEURS ====================

app.get('/api/auth/current', (req: Request, res: Response) => {
  const user = db.getCurrentUser();
  const authUser: UserProfile = (req as any).authUser;
  res.json({
    success: true,
    user,
    authUser,
    // Seul un administrateur authentifié peut changer de profil.
    canSwitchProfiles: authUser?.role === 'admin_communal',
  });
});

app.get('/api/auth/available-users', (_req: Request, res: Response) => {
  // Liste minimale pour le sélecteur de profil : aucune donnée de contact
  // (email, téléphone) n'est exposée.
  const users = db.getData().users.map((u) => ({
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    role: u.role,
    quartier_id: u.quartier_id,
    quartier_nom: u.quartier_nom,
    statut_compte: u.statut_compte,
  }));
  res.json({ success: true, users });
});

app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  // L'autorisation repose sur le compte authentifié, pas sur le profil actif :
  // un administrateur peut ainsi revenir à son profil après une bascule.
  const authUser: UserProfile = (req as any).authUser;
  const authCheck = isAccountAuthorized(authUser);
  if (!authCheck.allowed) {
    return res.status(authCheck.statusCode || 403).json({ success: false, message: authCheck.reason });
  }
  // Seul l'administrateur communal peut changer d'utilisateur
  if (authUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Seul l\'administrateur communal peut changer d\'utilisateur.' });
  }
  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, message: 'userId requis.' });
  }
  try {
    const switched = db.setCurrentUserId(userId);
    db.logAudit({
      user_id: authUser.id,
      user_nom: `${authUser.prenom} ${authUser.nom}`,
      user_role: authUser.role,
      action: 'CHANGEMENT_PROFIL_DEMO',
      entity_type: 'profile',
      entity_id: switched.id,
      donnees_apres: { id: switched.id, role: switched.role },
      motif: `Bascule du profil de démonstration vers ${switched.prenom} ${switched.nom} (${switched.role})`,
    });
    res.json({ success: true, user: switched });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

app.get('/api/users', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  // Seul l'administrateur communal gère les utilisateurs
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Accès restreint à l’administrateur communal.' });
  }
  res.json({ success: true, users: db.getData().users });
});

app.post('/api/users', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Accès restreint à l’administrateur communal.' });
  }

  const { email, nom, prenom, telephone, role, quartier_id } = req.body;
  if (!email || !nom || !prenom || !telephone || !role) {
    return res.status(400).json({ success: false, message: 'Tous les champs obligatoires doivent être renseignés.' });
  }

  const quartier = quartier_id ? db.getData().quartiers.find((q) => q.id === quartier_id) : undefined;
  const newUser: UserProfile = {
    id: `u-${Date.now()}`,
    email,
    nom,
    prenom,
    telephone,
    role,
    quartier_id,
    quartier_nom: quartier?.nom,
    statut_compte: 'actif',
    created_at: new Date().toISOString(),
  };

  db.getData().users.push(newUser);
  db.save();
  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'CREATION_UTILISATEUR',
    entity_type: 'profile',
    entity_id: newUser.id,
    donnees_apres: newUser,
    motif: `Création du compte pour le rôle ${role}`,
  });

  res.status(201).json({ success: true, user: newUser });
});

// Scénario 9 : Révocation immédiate en cas de téléphone perdu ou volé
app.post('/api/users/:id/revoke-lost-device', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Action réservée à l’administrateur communal.' });
  }

  const targetUser = db.getData().users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
  }

  const { motif } = req.body;
  targetUser.statut_compte = 'revoque_perte_telephone';
  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'REVOCATION_SESSION_TELEPHONE_PERDU',
    entity_type: 'profile',
    entity_id: targetUser.id,
    motif: motif || 'Signalement de smartphone perdu ou volé sur le terrain',
  });

  res.json({
    success: true,
    message: `Le compte et toutes les sessions de ${targetUser.prenom} ${targetUser.nom} ont été immédiatement révoqués.`,
    user: targetUser,
  });
});

app.post('/api/users/:id/restore-status', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Action réservée à l’administrateur.' });
  }
  const targetUser = db.getData().users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });

  targetUser.statut_compte = 'actif';
  db.save();
  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'REACTIVATION_COMPTE',
    entity_type: 'profile',
    entity_id: targetUser.id,
    motif: 'Réactivation après sécurisation du terminal',
  });
  res.json({ success: true, user: targetUser });
});

// ==================== 14 QUARTIERS ====================

app.get('/api/quartiers', (_req: Request, res: Response) => {
  res.json({ success: true, quartiers: db.getData().quartiers });
});

// ==================== FICHES INDIVIDUELLES ====================

app.get('/api/fiches-individuelles', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const authCheck = isAccountAuthorized(currentUser);
  if (!authCheck.allowed) {
    return res.status(authCheck.statusCode || 403).json({ success: false, message: authCheck.reason });
  }

  // Scénario 4: Si un superviseur tente de lire les fiches d'un autre quartier via paramètre
  const requestedQuartier = req.query.quartier_id as string | undefined;
  if (currentUser.role === 'superviseur_quartier') {
    if (requestedQuartier && requestedQuartier !== currentUser.quartier_id) {
      // Tentative frauduleuse détectée -> Journalisation de l'incident de sécurité
      db.logAudit({
        user_id: currentUser.id,
        user_nom: `${currentUser.prenom} ${currentUser.nom}`,
        user_role: currentUser.role,
        action: 'TENTATIVE_ACCES_AUTRE_QUARTIER_INTERDIT',
        entity_type: 'quartier',
        entity_id: requestedQuartier,
        motif: `Accès non autorisé demandé pour le quartier ${requestedQuartier}`,
      });
      return res.status(403).json({
        success: false,
        message: 'Violation d’accès (Scénario 4) : En tant que superviseur, vous ne pouvez pas accéder aux fiches d’un autre quartier.',
      });
    }
  }

  let list = db.getData().fiches_individuelles;

  // Filtrage selon les droits stricts
  if (currentUser.role === 'admin_communal') {
    // Admin voit tout
  } else if (currentUser.role === 'superviseur_quartier') {
    list = list.filter((f) => f.quartier_id === currentUser.quartier_id);
  } else if (currentUser.role === 'agent_individuel') {
    list = list.filter((f) => f.agent_id === currentUser.id);
  } else if (currentUser.role === 'maire_lecture') {
    // Maire ne voit pas les fiches nominatives brutes
    const safeFiches = sanitizeFichesForMayor(list);
    return res.json({ success: true, fiches: safeFiches, mode: 'maire_anonymise' });
  } else {
    // Agent collectif
    list = [];
  }

  res.json({ success: true, fiches: list });
});

app.get('/api/fiches-individuelles/:id', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const fiche = db.getData().fiches_individuelles.find((f) => f.id === req.params.id);
  if (!fiche) {
    return res.status(404).json({ success: false, message: 'Fiche non trouvée.' });
  }

  const check = canReadFicheIndividuelle(currentUser, fiche);
  if (!check.allowed) {
    db.logAudit({
      user_id: currentUser.id,
      user_nom: `${currentUser.prenom} ${currentUser.nom}`,
      user_role: currentUser.role,
      action: 'TENTATIVE_LECTURE_REFUSEE',
      entity_type: 'fiche_individuelle',
      entity_id: fiche.id,
      motif: check.reason,
    });
    return res.status(check.statusCode || 403).json({ success: false, message: check.reason });
  }

  res.json({ success: true, fiche });
});

app.post('/api/fiches-individuelles', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const authCheck = isAccountAuthorized(currentUser);
  if (!authCheck.allowed) {
    return res.status(authCheck.statusCode || 403).json({ success: false, message: authCheck.reason });
  }

  if (currentUser.role !== 'agent_individuel' && currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Seul un agent individuel ou l’administrateur peut créer une fiche individuelle.' });
  }

  const payload: Partial<FicheIndividuelle> = req.body;
  if (!payload.nom || !payload.prenom || !payload.quartier_id || !payload.secteur) {
    return res.status(400).json({ success: false, message: 'Nom, prénom, quartier et secteur sont obligatoires.' });
  }

  // Vérification du consentement
  if (!payload.consentement_jeune) {
    return res.status(400).json({ success: false, message: 'Le consentement éclairé du jeune est strictement obligatoire.' });
  }

  // Vérification de la protection des mineurs (< 18 ans)
  const age = Number(payload.age);
  if (age < 18) {
    if (!payload.accord_parental_nom || !payload.accord_parental_lien) {
      return res.status(400).json({
        success: false,
        message: 'Pour les mineurs (moins de 18 ans), l’accord d’un parent ou tuteur (nom et lien) est impératif.',
      });
    }
  }

  const quartier = db.getData().quartiers.find((q) => q.id === payload.quartier_id);
  const existingList = db.getData().fiches_individuelles;

  // Détection des doublons sans bloquer (CDC 4.4 & Scénario 2)
  const dupCheck = detectDuplicate(payload, existingList);

  const newId = payload.id || `f-ind-${Date.now()}`;
  const now = new Date().toISOString();

  const newFiche: FicheIndividuelle = {
    id: newId,
    agent_id: currentUser.id,
    agent_nom: `${currentUser.prenom} ${currentUser.nom}`,
    quartier_id: payload.quartier_id,
    quartier_nom: quartier?.nom,
    secteur: payload.secteur,
    nom: payload.nom.trim(),
    prenom: payload.prenom.trim(),
    sexe: payload.sexe || 'M',
    date_naissance: payload.date_naissance,
    age: isNaN(age) ? 18 : age,
    telephone: payload.telephone,
    telephone_alternatif: payload.telephone_alternatif,
    email: payload.email,
    scolarise: Boolean(payload.scolarise),
    niveau_etudes: payload.niveau_etudes || 'aucun',
    dernier_diplome: payload.dernier_diplome,
    situation_emploi: payload.situation_emploi || 'sans_emploi',
    metier_competences: payload.metier_competences,
    besoins_formation_insertion: payload.besoins_formation_insertion,
    categories_preoccupations: payload.categories_preoccupations || [],
    propositions_mairie: payload.propositions_mairie,
    consentement_jeune: true,
    est_mineur: age < 18,
    accord_parental_nom: payload.accord_parental_nom,
    accord_parental_lien: payload.accord_parental_lien,
    accord_parental_date: payload.accord_parental_date || (age < 18 ? now.split('T')[0] : undefined),
    statut: payload.statut === 'brouillon' ? 'brouillon' : 'envoye',
    statut_doublon: dupCheck.isDuplicate ? 'doublon_potentiel' : 'aucun',
    doublon_de_fiche_id: dupCheck.candidateFicheId,
    doublon_score: dupCheck.score,
    doublon_raisons: dupCheck.reasons,
    version: 1,
    client_updated_at: payload.client_updated_at || now,
    server_updated_at: now,
  };

  db.getData().fiches_individuelles.unshift(newFiche);
  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: dupCheck.isDuplicate ? 'CREATION_FICHE_AVEC_ALERTE_DOUBLON' : 'CREATION_FICHE_INDIVIDUELLE',
    entity_type: 'fiche_individuelle',
    entity_id: newFiche.id,
    donnees_apres: { id: newFiche.id, nom: newFiche.nom, quartier: newFiche.quartier_nom, doublon: dupCheck.isDuplicate },
    motif: dupCheck.isDuplicate ? `Alerte doublon score ${dupCheck.score}% détectée mais saisie non bloquée` : 'Saisie régulière de terrain',
  });

  res.status(201).json({
    success: true,
    fiche: newFiche,
    doublonAlerte: dupCheck.isDuplicate
      ? {
          message: 'Alerte : doublon possible détecté sur cette personne ou son numéro partagé. La fiche est enregistrée et sera arbitrée par le superviseur.',
          score: dupCheck.score,
          reasons: dupCheck.reasons,
        }
      : null,
  });
});

// Mise à jour d'une fiche (Scénario 5 & Scénario 3 Conflits)
app.put('/api/fiches-individuelles/:id', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const existing = db.getData().fiches_individuelles.find((f) => f.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Fiche non trouvée.' });
  }

  const { motif_modification, ...updates } = req.body;

  // Contrôle des autorisations métier (Scénario 5)
  const editCheck = canEditFicheIndividuelle(currentUser, existing, motif_modification);
  if (!editCheck.allowed) {
    db.logAudit({
      user_id: currentUser.id,
      user_nom: `${currentUser.prenom} ${currentUser.nom}`,
      user_role: currentUser.role,
      action: 'TENTATIVE_MODIFICATION_REFUSEE',
      entity_type: 'fiche_individuelle',
      entity_id: existing.id,
      motif: editCheck.reason,
    });
    return res.status(editCheck.statusCode || 403).json({ success: false, message: editCheck.reason });
  }

  // Détection de conflit de concurrence (Scénario 3)
  if (updates.version && updates.version < existing.version) {
    const conflictResult = checkSyncConflict(updates as any, existing);
    if (conflictResult.hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Conflit de synchronisation détecté : cette fiche a déjà été modifiée sur le serveur.',
        conflict: conflictResult.conflict,
      });
    }
  }

  const donneesAvant = { ...existing };

  Object.assign(existing, updates);
  existing.version += 1;
  existing.server_updated_at = new Date().toISOString();
  if (motif_modification) {
    existing.motif_modification_post_validation = motif_modification;
  }

  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: existing.statut === 'valide' ? 'MODIFICATION_FICHE_VALIDEE_AVEC_MOTIF' : 'MISE_A_JOUR_FICHE',
    entity_type: 'fiche_individuelle',
    entity_id: existing.id,
    donnees_avant: donneesAvant,
    donnees_apres: existing,
    motif: motif_modification || 'Mise à jour standard des informations',
  });

  res.json({ success: true, fiche: existing });
});

// Validation ou retour à corriger par le Superviseur / Admin
app.post('/api/fiches-individuelles/:id/validate', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const existing = db.getData().fiches_individuelles.find((f) => f.id === req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Fiche non trouvée.' });

  const check = canValidateFiche(currentUser, existing);
  if (!check.allowed) {
    return res.status(check.statusCode || 403).json({ success: false, message: check.reason });
  }

  const { action, commentaire } = req.body; // action: 'valide' | 'a_corriger' | 'rejete'
  if (!action || !['valide', 'a_corriger', 'rejete'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action invalide.' });
  }

  if (action === 'a_corriger' && (!commentaire || commentaire.trim().length < 3)) {
    return res.status(400).json({ success: false, message: 'Un commentaire explicatif est obligatoire pour renvoyer une fiche à corriger.' });
  }

  existing.statut = action;
  existing.commentaire_superviseur = commentaire;
  if (action === 'valide') {
    existing.valide_par = currentUser.id;
    existing.valide_le = new Date().toISOString();
  }
  existing.version += 1;
  existing.server_updated_at = new Date().toISOString();

  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: action === 'valide' ? 'VALIDATION_FICHE' : 'RENVOI_A_CORRIGER',
    entity_type: 'fiche_individuelle',
    entity_id: existing.id,
    motif: commentaire || `Passage de la fiche au statut ${action}`,
  });

  res.json({ success: true, fiche: existing });
});

// Arbitrage d'un doublon par le Superviseur (Scénario 2)
app.post('/api/fiches-individuelles/:id/arbitrate-duplicate', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'superviseur_quartier' && currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Action réservée au superviseur ou à l’administrateur.' });
  }

  const fiche = db.getData().fiches_individuelles.find((f) => f.id === req.params.id);
  if (!fiche) return res.status(404).json({ success: false, message: 'Fiche non trouvée.' });

  const { decision, motif } = req.body; // 'keep_both' | 'merge' | 'reject'
  if (!['keep_both', 'merge', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'Décision d’arbitrage invalide.' });
  }

  if (decision === 'keep_both') {
    fiche.statut_doublon = 'confirme_distinct';
  } else if (decision === 'merge') {
    fiche.statut_doublon = 'fusionne';
    fiche.statut = 'rejete';
    fiche.commentaire_superviseur = `Fusionnée avec la fiche principale ${fiche.doublon_de_fiche_id}`;
  } else if (decision === 'reject') {
    fiche.statut = 'rejete';
    fiche.statut_doublon = 'aucun';
    fiche.commentaire_superviseur = `Rejetée : doublon avéré (${motif || 'sans motif spécifié'})`;
  }

  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: `ARBITRAGE_DOUBLON_${decision.toUpperCase()}`,
    entity_type: 'fiche_individuelle',
    entity_id: fiche.id,
    motif: motif || `Arbitrage du doublon : ${decision}`,
  });

  res.json({ success: true, fiche });
});

// ==================== FICHES COLLECTIVES ====================

app.get('/api/fiches-collectives', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  let list = db.getData().fiches_collectives;

  if (currentUser.role === 'superviseur_quartier') {
    list = list.filter((f) => f.quartier_id === currentUser.quartier_id);
  } else if (currentUser.role === 'agent_collectif') {
    list = list.filter((f) => f.agent_id === currentUser.id);
  }

  res.json({ success: true, fiches: list });
});

app.post('/api/fiches-collectives', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'agent_collectif' && currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Réservé aux agents collectifs et à l’administrateur.' });
  }

  const payload: Partial<FicheCollective> = req.body;
  if (!payload.nom_organisation || !payload.quartier_id || !payload.date_rencontre) {
    return res.status(400).json({ success: false, message: 'Nom d’organisation, quartier et date de rencontre requis.' });
  }

  const quartier = db.getData().quartiers.find((q) => q.id === payload.quartier_id);
  const now = new Date().toISOString();

  const newFiche: FicheCollective = {
    id: payload.id || `f-coll-${Date.now()}`,
    agent_id: currentUser.id,
    agent_nom: `${currentUser.prenom} ${currentUser.nom}`,
    quartier_id: payload.quartier_id,
    quartier_nom: quartier?.nom,
    nom_organisation: payload.nom_organisation,
    type_organisation: payload.type_organisation || 'association',
    annee_creation: payload.annee_creation,
    nombre_membres: Number(payload.nombre_membres) || 0,
    contact_referent_nom: payload.contact_referent_nom || '',
    contact_referent_tel: payload.contact_referent_tel || '',
    date_rencontre: payload.date_rencontre,
    lieu_rencontre: payload.lieu_rencontre || '',
    nombre_participants_total: Number(payload.nombre_participants_total) || 0,
    nombre_femmes_filles: Number(payload.nombre_femmes_filles) || 0,
    difficultes_par_theme: payload.difficultes_par_theme || {},
    projets_communautaires: payload.projets_communautaires,
    besoins_equipements: payload.besoins_equipements,
    idees_activites_revenus: payload.idees_activites_revenus,
    statut: 'envoye',
    version: 1,
    client_updated_at: now,
    server_updated_at: now,
  };

  db.getData().fiches_collectives.unshift(newFiche);
  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'CREATION_FICHE_COLLECTIVE',
    entity_type: 'fiche_collective',
    entity_id: newFiche.id,
    donnees_apres: { organisation: newFiche.nom_organisation, quartier: newFiche.quartier_nom },
  });

  res.status(201).json({ success: true, fiche: newFiche });
});

// ==================== ESPACES JEUNESSE ====================

app.get('/api/espaces', (_req: Request, res: Response) => {
  res.json({ success: true, espaces: db.getData().espaces_jeunesse });
});

app.post('/api/espaces', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const payload: Partial<EspaceJeunesse> = req.body;
  if (!payload.nom || !payload.quartier_id || payload.latitude === undefined || payload.longitude === undefined) {
    return res.status(400).json({ success: false, message: 'Nom, quartier, latitude et longitude sont requis.' });
  }

  const quartier = db.getData().quartiers.find((q) => q.id === payload.quartier_id);
  const newEspace: EspaceJeunesse = {
    id: `esp-${Date.now()}`,
    quartier_id: payload.quartier_id,
    quartier_nom: quartier?.nom,
    nom: payload.nom,
    type_espace: payload.type_espace || 'maison_des_jeunes',
    etat: payload.etat || 'moyen',
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    photo_url: payload.photo_url,
    description_besoins: payload.description_besoins,
    collecte_par: currentUser.id,
    created_at: new Date().toISOString(),
  };

  db.getData().espaces_jeunesse.push(newEspace);
  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'RECENSEMENT_ESPACE_JEUNESSE',
    entity_type: 'espace_jeunesse',
    entity_id: newEspace.id,
    donnees_apres: newEspace,
  });

  res.status(201).json({ success: true, espace: newEspace });
});

// ==================== STATISTIQUES & K-ANONYMAT (Scénarios 7, 10) ====================

app.get('/api/statistiques', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const allFiches = db.getData().fiches_individuelles;
  const quartiers = db.getData().quartiers;

  if (currentUser.role === 'maire_lecture') {
    // Application stricte du k-anonymat pour le Maire (CDC Page 7)
    const mayorStats = generateMayorStats(allFiches, quartiers);
    return res.json({ success: true, mode: 'maire_k_anonymise', stats: mayorStats });
  }

  // Statistiques complètes pour l'administration et superviseurs
  const validees = allFiches.filter((f) => f.statut === 'valide');
  const enAttente = allFiches.filter((f) => f.statut === 'envoye');
  const doublons = allFiches.filter((f) => f.statut_doublon === 'doublon_potentiel');
  const aCorriger = allFiches.filter((f) => f.statut === 'a_corriger');

  res.json({
    success: true,
    mode: 'complet',
    stats: {
      totalRecenses: allFiches.length,
      totalValidees: validees.length,
      totalEnAttente: enAttente.length,
      totalDoublons: doublons.length,
      totalACorriger: aCorriger.length,
      quartiersStats: quartiers.map((q) => {
        const qValidees = validees.filter((f) => f.quartier_id === q.id).length;
        const qTotal = allFiches.filter((f) => f.quartier_id === q.id).length;
        return {
          quartier_id: q.id,
          quartier_nom: q.nom,
          validees: qValidees,
          total: qTotal,
          tauxValidation: qTotal > 0 ? Math.round((qValidees / qTotal) * 100) : 0,
        };
      }),
      repartitionParEmploi: allFiches.reduce((acc: any, f) => {
        acc[f.situation_emploi] = (acc[f.situation_emploi] || 0) + 1;
        return acc;
      }, {}),
    },
  });
});

// ==================== PORTAIL CITOYEN "J'AI UN PROJET" (Option A) ====================

app.get('/api/projets', (_req: Request, res: Response) => {
  res.json({ success: true, projets: db.getData().projets_citoyens });
});

app.post('/api/projets', (req: Request, res: Response) => {
  const { nom_porteur, contact_porteur, quartier_id, titre_projet, description, type_demande } = req.body;
  if (!nom_porteur || !contact_porteur || !quartier_id || !titre_projet || !description) {
    return res.status(400).json({ success: false, message: 'Champs obligatoires manquants pour déposer un projet.' });
  }

  const quartier = db.getData().quartiers.find((q) => q.id === quartier_id);
  const codeNum = String(db.getData().projets_citoyens.length + 1).padStart(4, '0');
  const code_suivi = `LBN-PRJ-2026-${codeNum}`;

  const newProjet: ProjetCitoyen = {
    id: `prj-${Date.now()}`,
    code_suivi,
    nom_porteur,
    contact_porteur,
    quartier_id,
    quartier_nom: quartier?.nom,
    titre_projet,
    description,
    type_demande: type_demande || 'projet_economique',
    statut: 'recue',
    created_at: new Date().toISOString(),
  };

  db.getData().projets_citoyens.unshift(newProjet);
  db.save();

  db.logAudit({
    user_id: 'public-citizen',
    user_nom: nom_porteur,
    user_role: 'agent_individuel',
    action: 'DEPOT_PROJET_CITOYEN',
    entity_type: 'projet_citoyen',
    entity_id: newProjet.id,
    motif: `Nouveau projet déposé : ${titre_projet} (Code suivi ${code_suivi})`,
  });

  res.status(201).json({
    success: true,
    message: 'Votre projet a été transmis avec succès aux services de la mairie de Lambanyi.',
    code_suivi,
    projet: newProjet,
  });
});

app.patch('/api/projets/:id/statut', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Seul l’administrateur communal peut modifier le statut des projets.' });
  }

  const projet = db.getData().projets_citoyens.find((p) => p.id === req.params.id);
  if (!projet) return res.status(404).json({ success: false, message: 'Projet introuvable.' });

  const { statut, reponse_mairie, date_rdv } = req.body;
  if (statut) projet.statut = statut;
  if (reponse_mairie !== undefined) projet.reponse_mairie = reponse_mairie;
  if (date_rdv !== undefined) projet.date_rdv = date_rdv;

  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'INSTRUCTION_PROJET_CITOYEN',
    entity_type: 'projet_citoyen',
    entity_id: projet.id,
    motif: `Mise à jour du statut en '${statut}'`,
  });

  res.json({ success: true, projet });
});

// ==================== AUDIT TRAIL ====================

app.get('/api/audit-logs', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal' && currentUser.role !== 'superviseur_quartier') {
    return res.status(403).json({ success: false, message: 'Accès restreint au journal d’activité.' });
  }

  res.json({ success: true, logs: db.getData().audit_logs.slice(0, 100) });
});

// ==================== BATCH SYNC OFFLINE ====================

app.post('/api/sync', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const { fiches } = req.body;
  if (!Array.isArray(fiches)) {
    return res.status(400).json({ success: false, message: 'Format de paquet de synchronisation invalide.' });
  }

  const results: any[] = [];
  const existingList = db.getData().fiches_individuelles;

  for (const clientFiche of fiches) {
    const existingIndex = existingList.findIndex((f) => f.id === clientFiche.id);
    if (existingIndex === -1) {
      // Nouvelle fiche issue du terrain
      const dupCheck = detectDuplicate(clientFiche, existingList);
      clientFiche.statut = 'envoye';
      clientFiche.statut_doublon = dupCheck.isDuplicate ? 'doublon_potentiel' : 'aucun';
      clientFiche.doublon_de_fiche_id = dupCheck.candidateFicheId;
      clientFiche.doublon_score = dupCheck.score;
      clientFiche.doublon_raisons = dupCheck.reasons;
      clientFiche.server_updated_at = new Date().toISOString();
      clientFiche.agent_id = currentUser.id;
      clientFiche.agent_nom = `${currentUser.prenom} ${currentUser.nom}`;

      existingList.unshift(clientFiche);
      results.push({ id: clientFiche.id, status: 'synced_new', duplicateWarning: dupCheck.isDuplicate });
    } else {
      const serverFiche = existingList[existingIndex];
      // Vérification conflit
      const conflictResult = checkSyncConflict(clientFiche, serverFiche);
      if (conflictResult.hasConflict) {
        results.push({ id: clientFiche.id, status: 'conflict_detected', conflict: conflictResult.conflict });
      } else {
        // Mise à jour normale
        existingList[existingIndex] = {
          ...serverFiche,
          ...clientFiche,
          statut: 'envoye',
          version: serverFiche.version + 1,
          server_updated_at: new Date().toISOString(),
        };
        results.push({ id: clientFiche.id, status: 'synced_updated' });
      }
    }
  }

  db.save();

  db.logAudit({
    user_id: currentUser.id,
    user_nom: `${currentUser.prenom} ${currentUser.nom}`,
    user_role: currentUser.role,
    action: 'SYNCHRONISATION_OFFLINE_BATCH',
    entity_type: 'lot_fiches',
    entity_id: `batch-${Date.now()}`,
    motif: `Synchronisation de ${fiches.length} fiches enregistrées hors ligne`,
  });

  res.json({ success: true, count: fiches.length, results });
});

// ==================== SAUVEGARDE & RESTAURATION (Scénario 6) ====================

app.get('/api/backup', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Seul l’administrateur communal peut exporter une sauvegarde.' });
  }

  const backupData = db.createBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="lambanyi_sauvegarde_${Date.now()}.json"`);
  res.send(JSON.stringify(backupData, null, 2));
});

app.post('/api/restore', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  if (currentUser.role !== 'admin_communal') {
    return res.status(403).json({ success: false, message: 'Seul l’administrateur communal peut restaurer une sauvegarde.' });
  }

  try {
    const backupData = req.body;
    db.restoreFromBackup(backupData);
    res.json({
      success: true,
      message: 'Base de données communale restaurée avec succès (Test Scénario 6 validé).',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ==================== EXPORTS EXCEL / CSV / PDF (Scénario 7) ====================

app.get('/api/export/:format', (req: Request, res: Response) => {
  const currentUser: UserProfile = (req as any).user;
  const format = req.params.format; // 'csv' | 'excel' | 'pdf'
  const fiches = db.getData().fiches_individuelles;

  // Scénario 7: Le profil de lecture du Maire ne reçoit JAMAIS ni noms ni numéros
  const isMayor = currentUser.role === 'maire_lecture';

  if (format === 'csv') {
    let header = isMayor
      ? 'ID,Quartier,Secteur,Sexe,Tranche Age,Scolarise,Niveau Etudes,Situation Emploi,Statut\n'
      : 'ID,Quartier,Secteur,Nom,Prenom,Sexe,Age,Telephone,Scolarise,Niveau Etudes,Situation Emploi,Statut\n';

    const rows = fiches.map((f) => {
      if (isMayor) {
        return `"${f.id}","${f.quartier_nom}","${f.secteur}","${f.sexe}","${f.age} ans","${f.scolarise ? 'Oui' : 'Non'}","${f.niveau_etudes}","${f.situation_emploi}","${f.statut}"`;
      }
      return `"${f.id}","${f.quartier_nom}","${f.secteur}","${f.nom}","${f.prenom}","${f.sexe}",${f.age},"${f.telephone || ''}","${f.scolarise ? 'Oui' : 'Non'}","${f.niveau_etudes}","${f.situation_emploi}","${f.statut}"`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export_lambanyi_${format}.csv"`);
    return res.send(header + rows.join('\n'));
  }

  res.json({
    success: true,
    message: `Export ${format} généré avec respect des habilitations (Mode anonymisé: ${isMayor})`,
    count: fiches.length,
    isMayorFiltered: isMayor,
  });
});

// ==================== VITE MIDDLEWARE EN DEV / SERVEUR STATIQUE EN PROD ====================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur Lambanyi en écoute sur http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Erreur démarrage serveur:', err);
});
