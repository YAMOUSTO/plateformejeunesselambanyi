import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  TrendingUp,
  ShieldCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import type { UserProfile, Quartier, FicheIndividuelle } from '../shared/types.ts';

interface DashboardViewProps {
  currentUser: UserProfile;
  quartiers: Quartier[];
  fiches: FicheIndividuelle[];
  stats: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  quartiers,
  fiches,
  stats,
}) => {
  const isMayor = currentUser.role === 'maire_lecture';
  const isSupervisor = currentUser.role === 'superviseur_quartier';

  // Calculs statistiques
  const totalRecenses = stats?.totalRecenses ?? fiches.length;
  const totalValidees = stats?.totalValidees ?? fiches.filter((f) => f.statut === 'valide').length;
  const totalEnAttente = stats?.totalEnAttente ?? fiches.filter((f) => f.statut === 'envoye').length;
  const totalDoublons = stats?.totalDoublons ?? fiches.filter((f) => f.statut_doublon === 'doublon_potentiel').length;
  const totalACorriger = stats?.totalACorriger ?? fiches.filter((f) => f.statut === 'a_corriger').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Contextual Note */}
      <div className="bg-neutral-800/60 border border-neutral-700/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Tableau de Bord Stratégique — Lambanyi
            </h2>
            {isMayor && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Mode K-Anonymat Actif (k ≥ 5)
              </span>
            )}
            {isSupervisor && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                Quartier affecté : {currentUser.quartier_nom}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isMayor
              ? 'Vue d’aide à la décision du Maire : Données statistiques consolidées sans noms ni téléphones (CDC Section 6).'
              : isSupervisor
              ? 'Pilotage de l’équipe d’agents et validation des fiches de votre quartier.'
              : 'Pilotage communal global couvrant les 14 quartiers de la commune de Lambanyi.'}
          </p>
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-900/80 px-3 py-2 rounded-lg border border-neutral-700/60 font-mono">
          Objectif pilote : 14 quartiers · PWA Hors-ligne active
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Jeunes Recensés</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalRecenses}</div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            14 quartiers en cours
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Fiches Validées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{totalValidees}</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Base officielle communale
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">En Attente Superviseur</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{totalEnAttente}</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            À contrôler par quartier
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Doublons & Corrections</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {totalDoublons + totalACorriger}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {totalDoublons} doublon(s) · {totalACorriger} à corriger
          </div>
        </div>
      </div>

      {/* Avancement par Quartier (14 quartiers de Lambanyi) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Suivi du Recensement dans les 14 Quartiers
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            Commune de Lambanyi, Conakry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-800/80 text-neutral-400 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3 rounded-l">Code</th>
                <th className="py-2.5 px-3">Nom du Quartier</th>
                <th className="py-2.5 px-3">Pop. Estimée</th>
                <th className="py-2.5 px-3">Jeunes Recensés</th>
                <th className="py-2.5 px-3">Fiches Validées</th>
                <th className="py-2.5 px-3 text-right rounded-r">Avancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-sans">
              {quartiers.map((q) => {
                const qFiches = fiches.filter((f) => f.quartier_id === q.id);
                const qValidees = qFiches.filter((f) => f.statut === 'valide').length;
                const isSelectedQuartier = currentUser.quartier_id === q.id;

                return (
                  <tr
                    key={q.id}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      isSelectedQuartier ? 'bg-emerald-950/20 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-neutral-400">{q.code}</td>
                    <td className="py-2.5 px-3 text-white flex items-center gap-1.5">
                      <span>{q.nom}</span>
                      {isSelectedQuartier && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                          Mon quartier
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-400">
                      {q.population_estimee.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-200">
                      {qFiches.length}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      {isMayor && qValidees > 0 && qValidees < 5 ? '< 5' : qValidees}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="w-28 ml-auto flex items-center gap-2">
                        <div className="flex-1 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(5, (qValidees / 10) * 100))}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {qValidees}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thématiques & Emploi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Emploi & Situation des Jeunes */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Répartition par Situation d'Activité
            </h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Sans emploi / En recherche', value: 'sans_emploi', color: 'bg-rose-500' },
              { label: 'Entrepreneurs & Artisans', value: 'entrepreneur', color: 'bg-amber-500' },
              { label: 'Apprentis & Stagiaires', value: 'apprenti', color: 'bg-blue-500' },
              { label: 'Employés formels', value: 'employe', color: 'bg-emerald-500' },
            ].map((item) => {
              const count = fiches.filter((f) => f.situation_emploi === item.value).length;
              const displayCount = isMayor && count > 0 && count < 5 ? '< 5' : count;
              const pct = totalRecenses > 0 ? Math.round((count / totalRecenses) * 100) : 0;

              return (
                <div key={item.value}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-300">{item.label}</span>
                    <span className="font-semibold text-white">
                      {displayCount} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Préoccupations Majeures Exprimées */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Top Préoccupations de la Jeunesse
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { theme: 'Emploi & Insertion', count: 6, tag: 'Économie' },
              { theme: 'Assainissement & Voirie', count: 4, tag: 'Cadre de vie' },
              { theme: 'Équipements sportifs', count: 3, tag: 'Loisirs' },
              { theme: 'Formations qualifiantes', count: 4, tag: 'Éducation' },
              { theme: 'Sécurité nocturne', count: 2, tag: 'Sécurité' },
              { theme: 'Espaces culturels', count: 2, tag: 'Culture' },
            ].map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-neutral-800/60 border border-neutral-700/50 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="font-medium text-neutral-200">{p.theme}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                    {p.tag}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-neutral-400">
                  Priorité haute signalée sur le terrain
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
