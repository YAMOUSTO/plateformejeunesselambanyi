import React from 'react';
import { Wifi, WifiOff, RefreshCw, Shield, AlertTriangle, UserCheck } from 'lucide-react';
import type { UserProfile } from '../shared/types.ts';

interface HeaderProps {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  canSwitchProfiles: boolean;
  onSwitchUser: (userId: string) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  pendingSyncCount: number;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  availableUsers,
  canSwitchProfiles,
  onSwitchUser,
  isOnline,
  onToggleOnline,
  pendingSyncCount,
  onSyncNow,
  isSyncing,
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_communal':
        return { label: 'Admin Communal', bg: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'maire_lecture':
        return { label: 'Cabinet du Maire (Lecture)', bg: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'superviseur_quartier':
        return { label: `Superviseur (${currentUser.quartier_nom || 'Quartier'})`, bg: 'bg-blue-950 text-blue-300 border-blue-800' };
      case 'agent_individuel':
        return { label: 'Agent Individuel', bg: 'bg-teal-950 text-teal-300 border-teal-800' };
      case 'agent_collectif':
        return { label: 'Agent Collectif & Espaces', bg: 'bg-purple-950 text-purple-300 border-purple-800' };
      default:
        return { label: role, bg: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const isStolen = currentUser.statut_compte === 'revoque_perte_telephone';

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 text-white sticky top-0 z-50 shadow-md">
      {/* Guinean national banner accent */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#CE1126]"></div>
        <div className="h-full w-1/3 bg-[#FCD116]"></div>
        <div className="h-full w-1/3 bg-[#009460]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Commune Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-800/80 border border-emerald-500/30 flex items-center justify-center font-bold text-white shadow-inner">
            <span className="text-sm tracking-wider font-mono">LBN</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base sm:text-lg tracking-tight text-neutral-100">
                Commune de Lambanyi
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium hidden sm:inline-block">
                14 Quartiers
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Plateforme Communale de Consultation & Recensement des Jeunes
            </p>
          </div>
        </div>

        {/* Status controls: Network, Sync, User Switcher */}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Mode Hors Connexion toggle button */}
          <button
            onClick={onToggleOnline}
            title={isOnline ? 'Cliquer pour simuler le mode hors connexion' : 'Cliquer pour rétablir la connexion'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse hover:bg-amber-900'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'En ligne (4G)' : 'Mode Terrain (Hors ligne)'}</span>
          </button>

          {/* Sync Button */}
          {pendingSyncCount > 0 && (
            <button
              onClick={onSyncNow}
              disabled={isSyncing || !isOnline}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                !isOnline
                  ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                  : 'bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-400 shadow'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync ({pendingSyncCount})</span>
            </button>
          )}

          {/* Role & Profile Switcher */}
          <div className="flex items-center gap-2 bg-neutral-800/80 p-1.5 rounded-lg border border-neutral-700">
            <div className="text-right hidden md:block">
              <div className="text-xs font-medium text-neutral-200">
                {currentUser.prenom} {currentUser.nom}
              </div>
              <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded border ${badge.bg}`}>
                {badge.label}
              </span>
            </div>

            {canSwitchProfiles && (
              <div className="flex items-center">
                <label htmlFor="user-select" className="sr-only">Changer de profil de test</label>
                <select
                  id="user-select"
                  aria-label="Sélectionner le profil d'évaluation"
                  value={currentUser.id}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="bg-neutral-900 border border-neutral-600 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nom} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner if session revoked for stolen device (Scénario 9) */}
      {isStolen && (
        <div className="bg-red-900/90 text-red-100 text-xs px-4 py-2 flex items-center justify-center gap-2 border-t border-red-700 font-medium">
          <AlertTriangle className="w-4 h-4 text-red-300" />
          <span>
            ALERTE SÉCURITÉ : Ce compte / terminal est révoqué pour signalement de perte ou vol (Scénario 9).
            Toute action d'écriture ou lecture est immédiatement refusée par le serveur.
          </span>
        </div>
      )}
    </header>
  );
};
