import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  History,
  Download,
  Upload,
  UserX,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Database,
  Lock,
} from 'lucide-react';
import type { UserProfile, AuditLog, Quartier } from '../shared/types.ts';

interface AdministrationViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  auditLogs: AuditLog[];
  quartiers: Quartier[];
  onRevokeStolenDevice: (userId: string, motif: string) => Promise<void>;
  onRestoreUserStatus: (userId: string) => Promise<void>;
  onCreateUser: (user: Partial<UserProfile>) => Promise<void>;
  onDownloadBackup: () => void;
  onRestoreBackup: (backupData: any) => Promise<void>;
  onRefreshData: () => void;
}

export const AdministrationView: React.FC<AdministrationViewProps> = ({
  currentUser,
  users,
  auditLogs,
  quartiers,
  onRevokeStolenDevice,
  onRestoreUserStatus,
  onCreateUser,
  onDownloadBackup,
  onRestoreBackup,
  onRefreshData,
}) => {
  const [subTab, setSubTab] = useState<'users' | 'audit' | 'backup'>('users');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Nouvel utilisateur modal
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'agent_individuel' as const,
    quartier_id: quartiers[0]?.id || '',
  });

  // Modal révocation smartphone volé (Scénario 9)
  const [revokingUser, setRevokingUser] = useState<UserProfile | null>(null);
  const [revocationMotif, setRevocationMotif] = useState('');

  const handleRevokeConfirm = async () => {
    if (!revokingUser) return;
    setIsProcessing(true);
    setMessage(null);
    try {
      await onRevokeStolenDevice(
        revokingUser.id,
        revocationMotif || 'Smartphone de recensement déclaré perdu ou volé sur le terrain.'
      );
      setMessage({
        type: 'success',
        text: `Scénario 9 Validé : Le compte de ${revokingUser.prenom} ${revokingUser.nom} et toutes ses sessions ont été immédiatement révoqués.`,
      });
      setRevokingUser(null);
      setRevocationMotif('');
      onRefreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la révocation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    setIsProcessing(true);
    try {
      await onRestoreUserStatus(userId);
      setMessage({ type: 'success', text: 'Compte utilisateur réactivé avec succès.' });
      onRefreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await onCreateUser(newUserForm);
      setMessage({ type: 'success', text: 'Nouvel agent communal créé avec succès.' });
      setNewUserOpen(false);
      setNewUserForm({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        role: 'agent_individuel',
        quartier_id: quartiers[0]?.id || '',
      });
      onRefreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backupData = JSON.parse(evt.target?.result as string);
        await onRestoreBackup(backupData);
        setMessage({
          type: 'success',
          text: 'Scénario 6 Validé : Données communales restaurées avec succès depuis le fichier de sauvegarde.',
        });
        onRefreshData();
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Erreur restauration : ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'users' ? 'bg-emerald-600 text-white shadow' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestion des Comptes ({users.length})</span>
        </button>

        <button
          onClick={() => setSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'audit' ? 'bg-emerald-600 text-white shadow' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Journal d'Activité & Audit ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'backup' ? 'bg-emerald-600 text-white shadow' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sauvegardes & Résilience (Scénario 6)</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SOUS-ONGLET 1 : COMPTES & SÉCURITÉ DES TERMINAUX */}
      {subTab === 'users' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Comptes Utilisateurs & Sécurité Flotte Terrain
              </h3>
              <p className="text-xs text-neutral-400">
                Superviseurs des 14 quartiers et agents de collecte de Lambanyi
              </p>
            </div>
            <button
              onClick={() => setNewUserOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow"
            >
              + Nouvel Agent / Superviseur
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-800/80 text-neutral-400 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Nom & Prénom</th>
                  <th className="py-2.5 px-3">Rôle</th>
                  <th className="py-2.5 px-3">Quartier Affecté</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Statut Compte</th>
                  <th className="py-2.5 px-3 text-right">Sécurité (Scénario 9)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 font-sans">
                {users.map((u) => {
                  const isRevoked = u.statut_compte === 'revoque_perte_telephone';
                  const isSelf = u.id === currentUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-neutral-800/40">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {u.prenom} {u.nom}
                        {isSelf && <span className="ml-2 text-[10px] text-emerald-400 font-normal">(Vous)</span>}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-neutral-300">
                        {u.role.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        {u.quartier_nom || 'Commune globale'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-400">
                        {u.telephone}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isRevoked
                              ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {isRevoked ? 'Téléphone Révoqué' : 'Actif'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isSelf && (
                          <div>
                            {isRevoked ? (
                              <button
                                onClick={() => handleRestoreUser(u.id)}
                                className="px-2.5 py-1 text-[11px] rounded bg-neutral-800 text-emerald-400 hover:bg-neutral-700 border border-emerald-800/60"
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button
                                onClick={() => setRevokingUser(u)}
                                className="flex items-center gap-1 ml-auto px-2.5 py-1 text-[11px] rounded bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                <span>Déclarer Perdu/Volé (Scénario 9)</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SOUS-ONGLET 2 : JOURNAL D'AUDIT */}
      {subTab === 'audit' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Journal d'Activité & Traçabilité Complète (CDC Section 6)
              </h3>
              <p className="text-xs text-neutral-400">
                Toutes les modifications, validations, refus et arbitrages sont inscrits de façon inviolable.
              </p>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              Total événements : {auditLogs.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">{log.action}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-700 text-neutral-300">
                      {log.entity_type}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="text-neutral-300">
                  Auteur : <strong>{log.user_nom}</strong> ({log.user_role.replace('_', ' ')})
                </div>
                {log.motif && (
                  <div className="text-[11px] text-amber-200/90 bg-neutral-900/60 p-1.5 rounded">
                    Motif : {log.motif}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOUS-ONGLET 3 : SAUVEGARDES & RESTAURATION (Scénario 6) */}
      {subTab === 'backup' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-5">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>Gestion des Sauvegardes & Restauration (CDC Scénario de Recette 6)</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              CDC Condition 6 : « Restauration d'une sauvegarde sur un environnement de test : Données restaurées complètes ».
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Sauvegarde */}
            <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4 space-y-3">
              <div className="font-bold text-sm text-white">1. Sauvegarde Complète (Snapshot)</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Génère une archive JSON intégrale contenant les 14 quartiers, les comptes, les fiches individuelles,
                collectives, espaces jeunesse et le journal d'audit.
              </p>
              <button
                onClick={onDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la Sauvegarde JSON</span>
              </button>
            </div>

            {/* Test de Restauration */}
            <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4 space-y-3">
              <div className="font-bold text-sm text-white">2. Tester la Restauration (Scénario 6)</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Restaurez la base de données communale depuis un fichier JSON de sauvegarde précédemment téléchargé.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-neutral-950 hover:bg-amber-500 cursor-pointer shadow">
                <Upload className="w-4 h-4" />
                <span>Restaurer depuis un fichier JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉVOCATION TÉLÉPHONE PERDU (Scénario 9) */}
      {revokingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-rose-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Révocation d'Urgence : Terminal Déclaré Perdu ou Volé</span>
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Vous êtes sur le point de désactiver immédiatement le compte et toutes les sessions actives de{' '}
              <strong>{revokingUser.prenom} {revokingUser.nom}</strong> ({revokingUser.telephone}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Motif du signalement d'incident :
              </label>
              <input
                type="text"
                placeholder="Ex: Smartphone perdu lors de la tournée au marché de Lambanyi..."
                value={revocationMotif}
                onChange={(e) => setRevocationMotif(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokingUser(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRevokeConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-500"
              >
                Confirmer la Révocation Immédiate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION UTILISATEUR */}
      {newUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white">Créer un Agent ou Superviseur Communal</h4>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.nom}
                    onChange={(e) => setNewUserForm({ ...newUserForm, nom: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.prenom}
                    onChange={(e) => setNewUserForm({ ...newUserForm, prenom: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Email professionnel</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={newUserForm.telephone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, telephone: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Rôle</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                >
                  <option value="agent_individuel">Agent Individuel (Terrain)</option>
                  <option value="agent_collectif">Agent Collectif & Espaces</option>
                  <option value="superviseur_quartier">Superviseur de Quartier</option>
                  <option value="admin_communal">Administrateur Communal</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Quartier d'affectation</label>
                <select
                  value={newUserForm.quartier_id}
                  onChange={(e) => setNewUserForm({ ...newUserForm, quartier_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                >
                  {quartiers.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nom} ({q.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewUserOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
