import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CheckSquare,
  MapPin,
  FolderPlus,
  Settings,
  FileSpreadsheet,
} from 'lucide-react';
import type { UserRole } from '../shared/types.ts';

export type TabId =
  | 'dashboard'
  | 'consultation_indiv'
  | 'consultation_coll'
  | 'validation'
  | 'carte'
  | 'projets'
  | 'admin'
  | 'exports';

interface NavigationProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  userRole: UserRole;
  doublonsCount: number;
  toValidateCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  doublonsCount,
  toValidateCount,
}) => {
  const allTabs: Array<{
    id: TabId;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    allowedRoles: UserRole[];
  }> = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      allowedRoles: ['admin_communal', 'superviseur_quartier', 'maire_lecture'],
    },
    {
      id: 'consultation_indiv',
      label: userRole === 'agent_individuel' ? 'Recensement Individuel' : 'Fiches Individuelles',
      icon: UserPlus,
      allowedRoles: ['admin_communal', 'superviseur_quartier', 'agent_individuel'],
    },
    {
      id: 'consultation_coll',
      label: userRole === 'agent_collectif' ? 'Associations & Espaces' : 'Fiches Collectives',
      icon: Users,
      allowedRoles: ['admin_communal', 'superviseur_quartier', 'agent_collectif'],
    },
    {
      id: 'validation',
      label: 'Validation & Doublons',
      icon: CheckSquare,
      badge: toValidateCount + doublonsCount,
      badgeColor: doublonsCount > 0 ? 'bg-amber-600' : 'bg-emerald-600',
      allowedRoles: ['admin_communal', 'superviseur_quartier'],
    },
    {
      id: 'carte',
      label: 'Cartographie',
      icon: MapPin,
      allowedRoles: ['admin_communal', 'superviseur_quartier', 'agent_collectif', 'maire_lecture'],
    },
    {
      id: 'projets',
      label: 'Portail Projets (Option A)',
      icon: FolderPlus,
      allowedRoles: ['admin_communal', 'superviseur_quartier', 'agent_individuel', 'agent_collectif', 'maire_lecture'],
    },
    {
      id: 'admin',
      label: 'Administration & Sécurité',
      icon: Settings,
      allowedRoles: ['admin_communal'],
    },
    {
      id: 'exports',
      label: 'Exports & Rapports',
      icon: FileSpreadsheet,
      allowedRoles: ['admin_communal', 'superviseur_quartier', 'maire_lecture'],
    },
  ];

  const visibleTabs = allTabs.filter((t) => t.allowedRoles.includes(userRole));

  return (
    <nav className="bg-neutral-900/90 border-b border-neutral-800 backdrop-blur sticky top-[61px] z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors relative ${
                isActive
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-600/50'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full text-white font-bold ${
                    tab.badgeColor || 'bg-emerald-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
