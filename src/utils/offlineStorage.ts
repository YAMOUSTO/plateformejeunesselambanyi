/**
 * Gestionnaire de stockage local hors connexion & file de synchronisation
 * Implémente le mode hors connexion robuste pour le terrain (CDC Section 5)
 */
import type { FicheIndividuelle, FicheCollective } from '../shared/types.ts';

const LOCAL_FICHES_KEY = 'lambanyi_offline_fiches_v1';
const LOCAL_COLLECTIVE_KEY = 'lambanyi_offline_collectives_v1';
const SYNC_QUEUE_KEY = 'lambanyi_sync_queue_v1';

export interface LocalFicheRecord {
  fiche: FicheIndividuelle;
  savedLocallyAt: string;
  isSynced: boolean;
  syncAttempts: number;
  lastSyncError?: string;
}

export class OfflineStorageManager {
  // Sauvegarde d'une fiche individuelle hors ligne
  public static saveFicheOffline(fiche: FicheIndividuelle): LocalFicheRecord {
    const list = this.getLocalFiches();
    const existingIndex = list.findIndex((item) => item.fiche.id === fiche.id);

    const record: LocalFicheRecord = {
      fiche: {
        ...fiche,
        statut: 'enregistre_offline',
        client_updated_at: new Date().toISOString(),
      },
      savedLocallyAt: new Date().toISOString(),
      isSynced: false,
      syncAttempts: 0,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }

    try {
      localStorage.setItem(LOCAL_FICHES_KEY, JSON.stringify(list));
      this.addToSyncQueue(fiche.id);
    } catch (e) {
      console.error('Erreur stockage local', e);
    }

    return record;
  }

  public static getLocalFiches(): LocalFicheRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_FICHES_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static markAsSynced(ficheId: string) {
    const list = this.getLocalFiches();
    const item = list.find((i) => i.fiche.id === ficheId);
    if (item) {
      item.isSynced = true;
      item.fiche.statut = 'envoye';
      localStorage.setItem(LOCAL_FICHES_KEY, JSON.stringify(list));
    }
    this.removeFromSyncQueue(ficheId);
  }

  // File d'attente de synchronisation
  public static getSyncQueue(): string[] {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static addToSyncQueue(ficheId: string) {
    const queue = this.getSyncQueue();
    if (!queue.includes(ficheId)) {
      queue.push(ficheId);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  }

  private static removeFromSyncQueue(ficheId: string) {
    const queue = this.getSyncQueue().filter((id) => id !== ficheId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  public static clearAllLocalData() {
    localStorage.removeItem(LOCAL_FICHES_KEY);
    localStorage.removeItem(LOCAL_COLLECTIVE_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }
}
