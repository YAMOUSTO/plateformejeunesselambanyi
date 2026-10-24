/**
 * Moteur des règles d'autorisation et de sécurité (CDC Sections 3, 4, 6, 10)
 * Scénarios de recette 4, 5, 9
 */
import type { UserProfile, FicheIndividuelle, FicheCollective } from './types.ts';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
}

/**
 * Vérifie si le compte est actif et valide
 * Scénario 9: Téléphone déclaré perdu ou compte révoqué -> Accès immédiatement bloqué
 */
export function isAccountAuthorized(user?: UserProfile | null): PermissionCheckResult {
  if (!user) {
    return { allowed: false, reason: 'Utilisateur non authentifié', statusCode: 401 };
  }
  if (user.statut_compte === 'revoque_perte_telephone') {
    return {
      allowed: false,
      reason: 'Session révoquée : le terminal associé a été déclaré perdu ou volé.',
      statusCode: 403,
    };
  }
  if (user.statut_compte === 'suspendu') {
    return {
      allowed: false,
      reason: 'Compte suspendu par l’administration communale.',
      statusCode: 403,
    };
  }
  return { allowed: true };
}

/**
 * Vérifie le droit de lecture d'une fiche individuelle
 * Scénario 4: Un superviseur tente de lire un autre quartier -> Rejet 403
 */
export function canReadFicheIndividuelle(
  user: UserProfile,
  fiche: FicheIndividuelle
): PermissionCheckResult {
  const accountCheck = isAccountAuthorized(user);
  if (!accountCheck.allowed) return accountCheck;

  // 1. Admin communal: voit tout
  if (user.role === 'admin_communal') {
    return { allowed: true };
  }

  // 2. Maire / Lecture: ne peut pas lire le détail nominatif complet (redirigé vers vue anonymisée)
  if (user.role === 'maire_lecture') {
    return {
      allowed: false,
      reason: 'Le profil du Maire consulte uniquement les données statistiques agrégées sans identifiants personnels.',
      statusCode: 403,
    };
  }

  // 3. Superviseur de quartier: strictement limité à son quartier
  if (user.role === 'superviseur_quartier') {
    if (fiche.quartier_id === user.quartier_id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Violation d’accès : En tant que superviseur du quartier, vous ne pouvez pas accéder aux fiches d'un autre quartier (Quartier demandé: ${fiche.quartier_id}, Affectation: ${user.quartier_id}).`,
      statusCode: 403,
    };
  }

  // 4. Agent individuel: voit uniquement ses propres fiches
  if (user.role === 'agent_individuel') {
    if (fiche.agent_id === user.id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Un agent individuel ne peut consulter que ses propres fiches de recensement.',
      statusCode: 403,
    };
  }

  // 5. Agent collectif: pas d'accès aux fiches individuelles nominatives
  if (user.role === 'agent_collectif') {
    return {
      allowed: false,
      reason: 'Un agent collectif n’a pas accès aux fiches de consultation individuelle.',
      statusCode: 403,
    };
  }

  return { allowed: false, reason: 'Rôle non reconnu', statusCode: 403 };
}

/**
 * Vérifie le droit de modification d'une fiche individuelle
 * Scénario 5: Modification d'une fiche validée :
 * Impossible pour l'agent ; possible pour le superviseur avec motif obligatoire.
 */
export function canEditFicheIndividuelle(
  user: UserProfile,
  fiche: FicheIndividuelle,
  modificationMotif?: string
): PermissionCheckResult {
  const accountCheck = isAccountAuthorized(user);
  if (!accountCheck.allowed) return accountCheck;

  // Fiche déjà validée (Scénario 5)
  if (fiche.statut === 'valide') {
    if (user.role === 'agent_individuel') {
      return {
        allowed: false,
        reason: 'Règle métier stricte : Une fiche validée ne peut plus être modifiée par un agent de terrain.',
        statusCode: 403,
      };
    }

    if (user.role === 'superviseur_quartier' || user.role === 'admin_communal') {
      // Superviseur doit appartenir au même quartier
      if (user.role === 'superviseur_quartier' && fiche.quartier_id !== user.quartier_id) {
        return {
          allowed: false,
          reason: 'Vous ne pouvez pas modifier une fiche d’un autre quartier.',
          statusCode: 403,
        };
      }

      // Motif de modification obligatoire
      if (!modificationMotif || modificationMotif.trim().length < 5) {
        return {
          allowed: false,
          reason: 'La modification d’une fiche validée exige obligatoirement un motif justificatif documenté (minimum 5 caractères).',
          statusCode: 400,
        };
      }

      return { allowed: true };
    }

    return { allowed: false, reason: 'Action non autorisée', statusCode: 403 };
  }

  // Fiche non validée (Brouillon, Enregistré offline, À corriger, Rejeté)
  if (user.role === 'agent_individuel') {
    if (fiche.agent_id === user.id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Vous ne pouvez modifier que les fiches dont vous êtes l’auteur.',
      statusCode: 403,
    };
  }

  if (user.role === 'superviseur_quartier') {
    if (fiche.quartier_id === user.quartier_id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Vous ne pouvez intervenir que sur les fiches de votre propre quartier.',
      statusCode: 403,
    };
  }

  if (user.role === 'admin_communal') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Droits insuffisants pour modifier cette fiche.', statusCode: 403 };
}

/**
 * Vérifie le droit de validation d'une fiche
 */
export function canValidateFiche(
  user: UserProfile,
  fiche: FicheIndividuelle | FicheCollective
): PermissionCheckResult {
  const accountCheck = isAccountAuthorized(user);
  if (!accountCheck.allowed) return accountCheck;

  if (user.role === 'admin_communal') {
    return { allowed: true };
  }

  if (user.role === 'superviseur_quartier') {
    if (fiche.quartier_id === user.quartier_id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Un superviseur ne peut valider que les fiches relatives à son quartier affecté.',
      statusCode: 403,
    };
  }

  return {
    allowed: false,
    reason: 'Seuls les superviseurs de quartier et l’administrateur communal peuvent valider ou renvoyer des fiches.',
    statusCode: 403,
  };
}
