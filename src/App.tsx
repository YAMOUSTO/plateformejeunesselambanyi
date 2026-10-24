/**
 * Application Principale — Plateforme Communale de Consultation des Jeunes de Lambanyi
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { Navigation, TabId } from './components/Navigation.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ConsultationIndividuelleView } from './components/ConsultationIndividuelleView.tsx';
import { ConsultationCollectiveView } from './components/ConsultationCollectiveView.tsx';
import { ValidationView } from './components/ValidationView.tsx';
import { CartographieView } from './components/CartographieView.tsx';
import { ProjetsCitoyensView } from './components/ProjetsCitoyensView.tsx';
import { AdministrationView } from './components/AdministrationView.tsx';
import { ExportsView } from './components/ExportsView.tsx';
import { OfflineStorageManager } from './utils/offlineStorage.ts';
import type {
  UserProfile,
  Quartier,
  FicheIndividuelle,
  FicheCollective,
  EspaceJeunesse,
  ProjetCitoyen,
  AuditLog,
} from './shared/types.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [fichesIndividuelles, setFichesIndividuelles] = useState<FicheIndividuelle[]>([]);
  const [fichesCollectives, setFichesCollectives] = useState<FicheCollective[]>([]);
  const [espaces, setEspaces] = useState<EspaceJeunesse[]>([]);
  const [projets, setProjets] = useState<ProjetCitoyen[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mise à jour du compteur d'éléments en attente de synchronisation
  const updatePendingSync = useCallback(() => {
    const queue = OfflineStorageManager.getSyncQueue();
    setPendingSyncCount(queue.length);
  }, []);

  // Chargement global des données depuis l'API
  const fetchAllData = useCallback(async () => {
    try {
      // 1. Current user, Available accounts & Quartiers
      const [userRes, availRes, quartiersRes] = await Promise.all([
        fetch('/api/auth/current').then((r) => r.json()),
        fetch('/api/auth/available-users').then((r) => r.json()),
        fetch('/api/quartiers').then((r) => r.json()),
      ]);

      if (userRes.success) setCurrentUser(userRes.user);
      if (availRes.success) setAvailableUsers(availRes.users || []);
      if (quartiersRes.success) setQuartiers(quartiersRes.quartiers);

      // 2. Fiches & modules
      const [fichesRes, collRes, espRes, prjRes, statsRes] = await Promise.all([
        fetch('/api/fiches-individuelles').then((r) => r.json()),
        fetch('/api/fiches-collectives').then((r) => r.json()),
        fetch('/api/espaces').then((r) => r.json()),
        fetch('/api/projets').then((r) => r.json()),
        fetch('/api/statistiques').then((r) => r.json()),
      ]);

      if (fichesRes.success) setFichesIndividuelles(fichesRes.fiches || []);
      if (collRes.success) setFichesCollectives(collRes.fiches || []);
      if (espRes.success) setEspaces(espRes.espaces || []);
      if (prjRes.success) setProjets(prjRes.projets || []);
      if (statsRes.success) setStats(statsRes.stats || null);

      // 3. Audit logs (si admin ou superviseur)
      if (userRes.user?.role === 'admin_communal' || userRes.user?.role === 'superviseur_quartier') {
        const logsRes = await fetch('/api/audit-logs').then((r) => r.json()).catch(() => ({ success: false }));
        if (logsRes.success) setAuditLogs(logsRes.logs || []);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des données initiales', err);
    } finally {
      setIsLoading(false);
      updatePendingSync();
    }
  }, [updatePendingSync]);

  useEffect(() => {
    fetchAllData();

    // Détection réseau réelle
    const handleOnline = () => {
      setIsOnline(true);
      handleSyncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchAllData]);

  // Synchronisation des fiches locales en attente (CDC Section 4.3 & 5)
  const handleSyncNow = async () => {
    const queue = OfflineStorageManager.getSyncQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      const localRecords = OfflineStorageManager.getLocalFiches();
      const fichesToSync = localRecords
        .filter((r) => queue.includes(r.fiche.id))
        .map((r) => r.fiche);

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiches: fichesToSync }),
      });
      const data = await res.json();

      if (data.success) {
        for (const item of data.results) {
          OfflineStorageManager.markAsSynced(item.id);
        }
        updatePendingSync();
        await fetchAllData();
      }
    } catch (e) {
      console.error('Erreur synchronisation', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Bascule de rôle (pour évaluer les 5 profils)
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        // Ajuster l'onglet par défaut si rôle incompatible
        if (data.user.role === 'agent_individuel') setActiveTab('consultation_indiv');
        else if (data.user.role === 'agent_collectif') setActiveTab('consultation_coll');
        else setActiveTab('dashboard');

        await fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Soumission d'une fiche individuelle (Mode En Ligne ou Hors-Ligne)
  const handleSubmitFiche = async (ficheData: Partial<FicheIndividuelle>) => {
    if (!isOnline) {
      // Scénario 1 : Saisie hors connexion, enregistrement sur téléphone
      const offlineId = ficheData.id || `f-offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newFiche: FicheIndividuelle = {
        ...(ficheData as any),
        id: offlineId,
        agent_id: currentUser?.id || 'agent-offline',
        agent_nom: `${currentUser?.prenom} ${currentUser?.nom}`,
        statut: 'enregistre_offline',
        statut_doublon: 'aucun',
        version: 1,
        client_updated_at: new Date().toISOString(),
        server_updated_at: new Date().toISOString(),
      };

      OfflineStorageManager.saveFicheOffline(newFiche);
      updatePendingSync();
      setFichesIndividuelles((prev) => [newFiche, ...prev]);
      return { success: true, offline: true, fiche: newFiche };
    }

    // Mode En Ligne standard
    const res = await fetch('/api/fiches-individuelles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ficheData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur enregistrement');
    return data;
  };

  // Validation d'une fiche par Superviseur / Admin
  const handleValidateFiche = async (ficheId: string, action: 'valide' | 'a_corriger' | 'rejete', commentaire?: string) => {
    const res = await fetch(`/api/fiches-individuelles/${ficheId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, commentaire }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur validation');
    await fetchAllData();
  };

  // Arbitrage d'un doublon par Superviseur (Scénario 2)
  const handleArbitrateDuplicate = async (ficheId: string, decision: 'keep_both' | 'merge' | 'reject', motif?: string) => {
    const res = await fetch(`/api/fiches-individuelles/${ficheId}/arbitrate-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, motif }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur arbitrage doublon');
    await fetchAllData();
  };

  // Modification d'une fiche validée avec motif obligatoire (Scénario 5)
  const handleEditValidatedFiche = async (ficheId: string, updates: Partial<FicheIndividuelle>, motif: string) => {
    const res = await fetch(`/api/fiches-individuelles/${ficheId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, motif_modification: motif }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur modification');
    await fetchAllData();
  };

  // Soumission consultation collective
  const handleSubmitCollective = async (data: Partial<FicheCollective>) => {
    const res = await fetch('/api/fiches-collectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  // Recensement espace
  const handleSubmitEspace = async (data: Partial<EspaceJeunesse>) => {
    const res = await fetch('/api/espaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  // Portail Citoyen Projets (Option A)
  const handleSubmitProjet = async (data: Partial<ProjetCitoyen>) => {
    const res = await fetch('/api/projets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json;
  };

  const handleUpdateProjetStatut = async (id: string, statut: string, reponse?: string, dateRdv?: string) => {
    const res = await fetch(`/api/projets/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, reponse_mairie: reponse, date_rdv: dateRdv }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  // Révocation terminal perdu (Scénario 9)
  const handleRevokeStolenDevice = async (userId: string, motif: string) => {
    const res = await fetch(`/api/users/${userId}/revoke-lost-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  const handleRestoreUserStatus = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/restore-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  const handleCreateUser = async (user: Partial<UserProfile>) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  // Sauvegarde & Restauration (Scénario 6)
  const handleDownloadBackup = () => {
    window.open('/api/backup', '_blank');
  };

  const handleRestoreBackup = async (backupData: any) => {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    await fetchAllData();
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 animate-pulse flex items-center justify-center font-bold text-lg font-mono">
          LBN
        </div>
        <div className="text-sm font-semibold tracking-wide text-neutral-300">
          Chargement de la Plateforme Jeunesse Lambanyi...
        </div>
        <div className="text-xs text-neutral-500 font-mono">14 Quartiers · Conakry</div>
      </div>
    );
  }

  const doublonsCount = fichesIndividuelles.filter((f) => f.statut_doublon === 'doublon_potentiel').length;
  const toValidateCount = fichesIndividuelles.filter((f) => f.statut === 'envoye').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header global avec sélecteur de rôle et indicateur de synchronisation */}
      <Header
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitchUser={handleSwitchUser}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        pendingSyncCount={pendingSyncCount}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
      />

      {/* Barre de navigation par onglets conditionnée aux autorisations du rôle */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userRole={currentUser.role}
        doublonsCount={doublonsCount}
        toValidateCount={toValidateCount}
      />

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            quartiers={quartiers}
            fiches={fichesIndividuelles}
            stats={stats}
          />
        )}

        {activeTab === 'consultation_indiv' && (
          <ConsultationIndividuelleView
            currentUser={currentUser}
            quartiers={quartiers}
            fiches={fichesIndividuelles}
            onSubmitFiche={handleSubmitFiche}
            isOnline={isOnline}
            onRefreshFiches={fetchAllData}
          />
        )}

        {activeTab === 'consultation_coll' && (
          <ConsultationCollectiveView
            currentUser={currentUser}
            quartiers={quartiers}
            collectives={fichesCollectives}
            espaces={espaces}
            onSubmitCollective={handleSubmitCollective}
            onSubmitEspace={handleSubmitEspace}
            onRefreshData={fetchAllData}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationView
            currentUser={currentUser}
            quartiers={quartiers}
            fiches={fichesIndividuelles}
            onValidateFiche={handleValidateFiche}
            onArbitrateDuplicate={handleArbitrateDuplicate}
            onEditValidatedFiche={handleEditValidatedFiche}
            onRefreshFiches={fetchAllData}
          />
        )}

        {activeTab === 'carte' && (
          <CartographieView quartiers={quartiers} espaces={espaces} />
        )}

        {activeTab === 'projets' && (
          <ProjetsCitoyensView
            currentUser={currentUser}
            quartiers={quartiers}
            projets={projets}
            onSubmitProjet={handleSubmitProjet}
            onUpdateProjetStatut={handleUpdateProjetStatut}
            onRefreshProjets={fetchAllData}
          />
        )}

        {activeTab === 'admin' && (
          <AdministrationView
            currentUser={currentUser}
            users={availableUsers}
            auditLogs={auditLogs}
            quartiers={quartiers}
            onRevokeStolenDevice={handleRevokeStolenDevice}
            onRestoreUserStatus={handleRestoreUserStatus}
            onCreateUser={handleCreateUser}
            onDownloadBackup={handleDownloadBackup}
            onRestoreBackup={handleRestoreBackup}
            onRefreshData={fetchAllData}
          />
        )}

        {activeTab === 'exports' && (
          <ExportsView
            currentUser={currentUser}
            quartiers={quartiers}
            fiches={fichesIndividuelles}
          />
        )}
      </main>

      {/* Footer officiel */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            République de Guinée · Commune Urbaine de Lambanyi · Tous droits réservés
          </span>
          <span className="font-mono text-[11px] text-neutral-400">
            Conception & Réalisation : Yamoussa Soumah, Ingénieur Logiciel
          </span>
        </div>
      </footer>
    </div>
  );
}
