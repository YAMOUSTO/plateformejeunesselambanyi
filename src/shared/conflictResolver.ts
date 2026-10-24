/**
 * Résolution des Conflits de Synchronisation Hors Connexion (CDC Section 4.3 & Scénario 3)
 * Règle : AUCUNE donnée n'est écrasée en silence.
 * Si le serveur a une version plus récente ou divergente, un conflit est levé pour arbitrage par le superviseur.
 */
import type { FicheIndividuelle } from './types.ts';

export interface SyncConflict {
  ficheId: string;
  clientVersion: number;
  serverVersion: number;
  clientUpdatedAt: string;
  serverUpdatedAt: string;
  divergingFields: string[];
  localData: Partial<FicheIndividuelle>;
  serverData: FicheIndividuelle;
}

export type ConflictResolutionChoice = 'keep_local' | 'keep_server' | 'merge_manual';

/**
 * Détecte si la synchronisation d'une fiche locale produit un conflit avec la version serveur
 */
export function checkSyncConflict(
  localFiche: FicheIndividuelle,
  serverFiche?: FicheIndividuelle
): { hasConflict: boolean; conflict?: SyncConflict } {
  if (!serverFiche) {
    // Fiche inexistante sur le serveur : nouvelle création, pas de conflit
    return { hasConflict: false };
  }

  // Si les versions sont identiques et hash identique, pas de conflit
  if (localFiche.version === serverFiche.version) {
    return { hasConflict: false };
  }

  // Vérification de la divergence
  const divergingFields: string[] = [];
  const fieldsToCheck: Array<keyof FicheIndividuelle> = [
    'nom',
    'prenom',
    'age',
    'telephone',
    'secteur',
    'situation_emploi',
    'propositions_mairie',
    'statut',
  ];

  for (const field of fieldsToCheck) {
    if (JSON.stringify(localFiche[field]) !== JSON.stringify(serverFiche[field])) {
      divergingFields.push(String(field));
    }
  }

  if (divergingFields.length > 0) {
    return {
      hasConflict: true,
      conflict: {
        ficheId: localFiche.id,
        clientVersion: localFiche.version,
        serverVersion: serverFiche.version,
        clientUpdatedAt: localFiche.client_updated_at,
        serverUpdatedAt: serverFiche.server_updated_at,
        divergingFields,
        localData: localFiche,
        serverData: serverFiche,
      },
    };
  }

  return { hasConflict: false };
}

/**
 * Applique la résolution d'un conflit décidée par le superviseur
 */
export function resolveConflict(
  conflict: SyncConflict,
  choice: ConflictResolutionChoice,
  mergedData?: Partial<FicheIndividuelle>
): FicheIndividuelle {
  const nextVersion = Math.max(conflict.clientVersion, conflict.serverVersion) + 1;
  const now = new Date().toISOString();

  if (choice === 'keep_local') {
    return {
      ...conflict.serverData,
      ...conflict.localData,
      version: nextVersion,
      server_updated_at: now,
      client_updated_at: now,
    } as FicheIndividuelle;
  }

  if (choice === 'keep_server') {
    return {
      ...conflict.serverData,
      version: nextVersion,
      server_updated_at: now,
    };
  }

  // Merge manuel
  return {
    ...conflict.serverData,
    ...(mergedData || {}),
    version: nextVersion,
    server_updated_at: now,
    client_updated_at: now,
  } as FicheIndividuelle;
}
