import React, { useState } from 'react';
import {
  FolderPlus,
  Send,
  Search,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Clock,
  Tag,
  Shield,
} from 'lucide-react';
import type { UserProfile, Quartier, ProjetCitoyen } from '../shared/types.ts';

interface ProjetsCitoyensViewProps {
  currentUser: UserProfile;
  quartiers: Quartier[];
  projets: ProjetCitoyen[];
  onSubmitProjet: (data: Partial<ProjetCitoyen>) => Promise<any>;
  onUpdateProjetStatut: (id: string, statut: string, reponse?: string, dateRdv?: string) => Promise<void>;
  onRefreshProjets: () => void;
}

export const ProjetsCitoyensView: React.FC<ProjetsCitoyensViewProps> = ({
  currentUser,
  quartiers,
  projets,
  onSubmitProjet,
  onUpdateProjetStatut,
  onRefreshProjets,
}) => {
  const [subTab, setSubTab] = useState<'deposer' | 'suivre' | 'gestion'>('deposer');
  const [searchCode, setSearchCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; code?: string } | null>(null);

  // Formulaire dépôt
  const [form, setForm] = useState({
    nom_porteur: '',
    contact_porteur: '',
    quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
    titre_projet: '',
    description: '',
    type_demande: 'projet_economique' as const,
  });

  // Modal traitement pour Admin
  const [selectedProjet, setSelectedProjet] = useState<ProjetCitoyen | null>(null);
  const [statutUpdate, setStatutUpdate] = useState('');
  const [reponseMairie, setReponseMairie] = useState('');
  const [dateRdv, setDateRdv] = useState('');

  const isAdmin = currentUser.role === 'admin_communal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_porteur || !form.contact_porteur || !form.titre_projet || !form.description) {
      setFeedback({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await onSubmitProjet(form);
      setFeedback({
        type: 'success',
        text: 'Votre projet a été soumis à la Mairie de Lambanyi avec succès ! Conservez votre code de suivi.',
        code: res.code_suivi,
      });
      setForm({
        nom_porteur: '',
        contact_porteur: '',
        quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
        titre_projet: '',
        description: '',
        type_demande: 'projet_economique',
      });
      onRefreshProjets();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de la soumission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProjet) return;
    setIsSubmitting(true);
    try {
      await onUpdateProjetStatut(selectedProjet.id, statutUpdate, reponseMairie, dateRdv);
      setSelectedProjet(null);
      onRefreshProjets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchedProjects = searchCode.trim()
    ? projets.filter(
        (p) =>
          p.code_suivi.toLowerCase().includes(searchCode.toLowerCase()) ||
          p.nom_porteur.toLowerCase().includes(searchCode.toLowerCase())
      )
    : projets;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setSubTab('deposer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'deposer'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Déposer un Projet (Portail Jeunes)</span>
        </button>

        <button
          onClick={() => setSubTab('suivre')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'suivre'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Suivre une Demande ({projets.length})</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback.text}</span>
          </div>
          {feedback.code && (
            <div className="mt-2 bg-neutral-900/90 px-3 py-2 rounded-lg border border-emerald-600/40 font-mono text-emerald-300 text-sm font-bold inline-block">
              Code de suivi : {feedback.code}
            </div>
          )}
        </div>
      )}

      {/* SOUS-ONGLET 1 : DÉPÔT PUBLIC DU PROJET */}
      {subTab === 'deposer' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <FolderPlus className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">
                Portail Public « J'ai un projet » — Mairie de Lambanyi (Option A)
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              Vous êtes un jeune de Lambanyi, vous n'avez pas encore été recensé par un agent, ou vous
              portez une initiative économique ou communautaire ? Déposez votre projet directement auprès de la mairie.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Votre Nom & Prénom *</label>
                <input
                  type="text"
                  placeholder="Ex: Diallo Ibrahima"
                  value={form.nom_porteur}
                  onChange={(e) => setForm({ ...form, nom_porteur: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Numéro de Téléphone *</label>
                <input
                  type="tel"
                  placeholder="+224 620..."
                  value={form.contact_porteur}
                  onChange={(e) => setForm({ ...form, contact_porteur: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Quartier de résidence *</label>
                <select
                  value={form.quartier_id}
                  onChange={(e) => setForm({ ...form, quartier_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  {quartiers.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nom} ({q.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-neutral-300 mb-1">Titre de votre projet ou idée *</label>
                <input
                  type="text"
                  placeholder="Ex: Création d’un atelier solidaire de transformation agro-alimentaire"
                  value={form.titre_projet}
                  onChange={(e) => setForm({ ...form, titre_projet: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Type de démarche *</label>
                <select
                  value={form.type_demande}
                  onChange={(e) => setForm({ ...form, type_demande: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="projet_economique">Projet économique / Entrepreneuriat</option>
                  <option value="preoccupation_citoyenne">Préoccupation citoyenne / Quartier</option>
                  <option value="demande_rdv_maire">Demande d'audience / Rendez-vous</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-300 mb-1">Description détaillée du projet *</label>
                <textarea
                  rows={4}
                  placeholder="Expliquez votre projet : objectifs, bénéficiaires prévus, besoins d’accompagnement..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow"
              >
                <Send className="w-4 h-4" />
                <span>Déposer officiellement mon projet</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SOUS-ONGLET 2 : SUIVI ET GESTION */}
      {subTab === 'suivre' && (
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher par code de suivi (ex: LBN-PRJ-2026-0001) ou par nom..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="bg-transparent border-none text-xs text-white w-full focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {searchedProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-xl">
                Aucun projet trouvé avec ces critères de recherche.
              </div>
            ) : (
              searchedProjects.map((p) => {
                const getStatusBadge = (st: string) => {
                  switch (st) {
                    case 'recue':
                      return { label: 'Reçue', bg: 'bg-neutral-800 text-neutral-300' };
                    case 'en_cours_examen':
                      return { label: 'En cours d’examen', bg: 'bg-blue-950 text-blue-300 border-blue-800' };
                    case 'rdv_programme':
                      return { label: 'Rendez-vous programmé', bg: 'bg-purple-950 text-purple-300 border-purple-800' };
                    case 'acceptee':
                      return { label: 'Projet Retenu', bg: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
                    case 'cloturee':
                      return { label: 'Clôturé', bg: 'bg-neutral-800 text-neutral-500' };
                    default:
                      return { label: st, bg: 'bg-neutral-800 text-neutral-300' };
                  }
                };

                const badge = getStatusBadge(p.statut);

                return (
                  <div
                    key={p.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {p.code_suivi}
                          </span>
                          <span className="font-bold text-sm text-white">{p.titre_projet}</span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          Porteur : <strong>{p.nom_porteur}</strong> ({p.contact_porteur}) · Quartier : {p.quartier_nom}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedProjet(p);
                              setStatutUpdate(p.statut);
                              setReponseMairie(p.reponse_mairie || '');
                              setDateRdv(p.date_rdv || '');
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700"
                          >
                            Traiter
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-800/40 p-2.5 rounded-lg border border-neutral-800">
                      {p.description}
                    </p>

                    {p.reponse_mairie && (
                      <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg text-xs text-emerald-200">
                        <div className="font-semibold text-emerald-300 mb-0.5">
                          Réponse officielle des services communaux :
                        </div>
                        <p>{p.reponse_mairie}</p>
                        {p.date_rdv && (
                          <div className="mt-1 text-[11px] text-amber-300 font-medium">
                            Audience / Entretien fixé le : {new Date(p.date_rdv).toLocaleString('fr-FR')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL TRAITEMENT ADMIN */}
      {selectedProjet && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white">
              Instruction du Projet : {selectedProjet.code_suivi}
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">Nouveau statut du dossier :</label>
                <select
                  value={statutUpdate}
                  onChange={(e) => setStatutUpdate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                >
                  <option value="recue">Reçue</option>
                  <option value="en_cours_examen">En cours d'examen par la commission</option>
                  <option value="rdv_programme">Rendez-vous programmé</option>
                  <option value="acceptee">Acceptée / Projet retenu</option>
                  <option value="cloturee">Clôturée</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Réponse communale adressée au porteur :</label>
                <textarea
                  rows={3}
                  value={reponseMairie}
                  onChange={(e) => setReponseMairie(e.target.value)}
                  placeholder="Décision, orientation vers un partenaire, instructions..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                />
              </div>

              {statutUpdate === 'rdv_programme' && (
                <div>
                  <label className="block text-neutral-300 mb-1">Date et heure du rendez-vous :</label>
                  <input
                    type="datetime-local"
                    value={dateRdv}
                    onChange={(e) => setDateRdv(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProjet(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Mettre à jour le dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
