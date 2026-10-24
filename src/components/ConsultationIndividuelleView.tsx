import React, { useState } from 'react';
import {
  UserPlus,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  MessageSquare,
  FileText,
  Clock,
  Shield,
  Smartphone,
} from 'lucide-react';
import type { UserProfile, Quartier, FicheIndividuelle } from '../shared/types.ts';

interface ConsultationIndividuelleViewProps {
  currentUser: UserProfile;
  quartiers: Quartier[];
  fiches: FicheIndividuelle[];
  onSubmitFiche: (ficheData: Partial<FicheIndividuelle>) => Promise<any>;
  isOnline: boolean;
  onRefreshFiches: () => void;
}

export const ConsultationIndividuelleView: React.FC<ConsultationIndividuelleViewProps> = ({
  currentUser,
  quartiers,
  fiches,
  onSubmitFiche,
  isOnline,
  onRefreshFiches,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'formulaire' | 'liste'>('formulaire');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'warning' | 'error'; text: string; details?: string[] } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<FicheIndividuelle>>({
    quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
    secteur: '',
    nom: '',
    prenom: '',
    sexe: 'M',
    age: 20,
    telephone: '',
    telephone_alternatif: '',
    email: '',
    scolarise: true,
    niveau_etudes: 'lycee',
    dernier_diplome: '',
    situation_emploi: 'sans_emploi',
    metier_competences: '',
    besoins_formation_insertion: '',
    categories_preoccupations: ['emploi', 'assainissement'],
    propositions_mairie: '',
    consentement_jeune: true,
    est_mineur: false,
    accord_parental_nom: '',
    accord_parental_lien: 'père',
    accord_parental_date: '',
  });

  const handleAgeChange = (newAge: number) => {
    const isMin = newAge < 18;
    setFormData((prev) => ({
      ...prev,
      age: newAge,
      est_mineur: isMin,
      accord_parental_date: isMin ? new Date().toISOString().split('T')[0] : '',
    }));
  };

  const togglePreoccupation = (cat: string) => {
    setFormData((prev) => {
      const current = prev.categories_preoccupations || [];
      const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
      return { ...prev, categories_preoccupations: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (!formData.nom?.trim() || !formData.prenom?.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Le nom et le prénom sont obligatoires.' });
      return;
    }

    if (!formData.quartier_id || !formData.secteur?.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Veuillez préciser le quartier et le secteur.' });
      return;
    }

    if (!formData.consentement_jeune) {
      setFeedbackMsg({ type: 'error', text: 'Le consentement du jeune est strictement obligatoire.' });
      return;
    }

    if (formData.est_mineur && (!formData.accord_parental_nom?.trim() || !formData.accord_parental_lien)) {
      setFeedbackMsg({
        type: 'error',
        text: 'Pour un mineur (< 18 ans), le nom du parent/tuteur et son lien de parenté sont impératifs.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmitFiche({
        ...formData,
        statut: asDraft ? 'brouillon' : isOnline ? 'envoye' : 'enregistre_offline',
      });

      if (result.doublonAlerte) {
        setFeedbackMsg({
          type: 'warning',
          text: `Fiche enregistrée avec succès, mais le système a détecté une ressemblance (Score : ${result.doublonAlerte.score}%) avec une personne ou un numéro existant. Le superviseur examinera ce cas.`,
          details: result.doublonAlerte.reasons,
        });
      } else {
        setFeedbackMsg({
          type: 'success',
          text: isOnline
            ? 'Fiche transmise avec succès au superviseur pour validation.'
            : 'Fiche enregistrée hors ligne sur votre téléphone. Elle sera synchronisée dès reconnexion.',
        });
      }

      // Reset form
      setFormData({
        quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
        secteur: '',
        nom: '',
        prenom: '',
        sexe: 'M',
        age: 20,
        telephone: '',
        telephone_alternatif: '',
        email: '',
        scolarise: true,
        niveau_etudes: 'lycee',
        dernier_diplome: '',
        situation_emploi: 'sans_emploi',
        metier_competences: '',
        besoins_formation_insertion: '',
        categories_preoccupations: ['emploi', 'assainissement'],
        propositions_mairie: '',
        consentement_jeune: true,
        est_mineur: false,
        accord_parental_nom: '',
        accord_parental_lien: 'père',
        accord_parental_date: '',
      });
      onRefreshFiches();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erreur lors de l’enregistrement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('formulaire')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'formulaire'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouvelle Saisie Terrain</span>
          </button>

          <button
            onClick={() => setActiveSubTab('liste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'liste'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mes Fiches ({fiches.length})</span>
          </button>
        </div>

        <div className="text-xs text-neutral-400 hidden sm:flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Compatible tactile · Sauvegarde instantanée</span>
        </div>
      </div>

      {/* Notifications feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              : feedbackMsg.type === 'warning'
              ? 'bg-amber-950/70 border-amber-600 text-amber-200'
              : 'bg-rose-950/70 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedbackMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {feedbackMsg.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
            {feedbackMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
          {feedbackMsg.details && (
            <ul className="list-disc list-inside text-neutral-300 pl-2">
              {feedbackMsg.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* SUB-VIEW 1: FORMULAIRE DE SAISIE */}
      {activeSubTab === 'formulaire' && (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Bloc 1: Localisation & Identité */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2 flex items-center justify-between">
              <span>1. Localisation & Identité Civile</span>
              <span className="text-[11px] text-neutral-500 font-normal">Champs obligatoires *</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Quartier *
                </label>
                <select
                  value={formData.quartier_id}
                  onChange={(e) => setFormData({ ...formData, quartier_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {quartiers.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nom} ({q.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Secteur / Repère *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Secteur Mosquée, Carrefour Canari..."
                  value={formData.secteur}
                  onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Sexe *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sexe: 'M' })}
                    className={`flex-1 py-2 text-xs rounded-lg font-medium border ${
                      formData.sexe === 'M'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                    }`}
                  >
                    Masculin
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sexe: 'F' })}
                    className={`flex-1 py-2 text-xs rounded-lg font-medium border ${
                      formData.sexe === 'F'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                    }`}
                  >
                    Féminin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nom de famille *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Camara, Diallo, Soumah..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Prénom(s) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mamadou, Aboubacar, Fatou..."
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Âge révolu *
                  </label>
                  {formData.est_mineur && (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      Mineur (&lt; 18 ans)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="12"
                  max="40"
                  value={formData.age}
                  onChange={(e) => handleAgeChange(parseInt(e.target.value, 10))}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Accord parental obligatoire pour mineurs */}
            {formData.est_mineur && (
              <div className="bg-amber-950/40 border border-amber-700/60 rounded-lg p-3 space-y-3 mt-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>Cadre Légal : Accord Parental Obligatoire pour Mineur (CDC Section 6)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">
                      Nom complet du Parent / Tuteur *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Diallo Mamadou (Père)"
                      value={formData.accord_parental_nom}
                      onChange={(e) => setFormData({ ...formData, accord_parental_nom: e.target.value })}
                      required={formData.est_mineur}
                      className="w-full bg-neutral-900 border border-amber-700/60 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">
                      Lien de parenté *
                    </label>
                    <select
                      value={formData.accord_parental_lien}
                      onChange={(e) => setFormData({ ...formData, accord_parental_lien: e.target.value })}
                      className="w-full bg-neutral-900 border border-amber-700/60 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="père">Père</option>
                      <option value="mère">Mère</option>
                      <option value="tuteur légal">Tuteur légal</option>
                      <option value="oncle/tante">Oncle / Tante</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">
                      Date de recueil de l'accord *
                    </label>
                    <input
                      type="date"
                      value={formData.accord_parental_date}
                      onChange={(e) => setFormData({ ...formData, accord_parental_date: e.target.value })}
                      className="w-full bg-neutral-900 border border-amber-700/60 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bloc 2: Contact */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
              2. Coordonnées & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Téléphone principal (Guinée)
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 620 12 34 56 ou +224..."
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-neutral-500">
                  Le numéro peut être partagé (contrôlé par l'algorithme)
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Contact alternatif (famille/ami)
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 622 99 88 77"
                  value={formData.telephone_alternatif}
                  onChange={(e) => setFormData({ ...formData, telephone_alternatif: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Adresse e-mail (facultatif)
                </label>
                <input
                  type="email"
                  placeholder="nom@exemple.gn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloc 3: Formation, Emploi & Compétences */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
              3. Parcours Scolaire, Emploi & Compétences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Niveau d'études
                </label>
                <select
                  value={formData.niveau_etudes}
                  onChange={(e) => setFormData({ ...formData, niveau_etudes: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="aucun">Aucun / Non scolarisé</option>
                  <option value="primaire">Primaire</option>
                  <option value="college">Collège</option>
                  <option value="lycee">Lycée</option>
                  <option value="professionnel">Enseignement Professionnel (CAP/BEP/BTS)</option>
                  <option value="universitaire">Université (Licence / Master)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Dernier diplôme obtenu
                </label>
                <input
                  type="text"
                  placeholder="Ex: Baccalauréat, Licence Eco, CAP..."
                  value={formData.dernier_diplome}
                  onChange={(e) => setFormData({ ...formData, dernier_diplome: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Situation d'activité actuelle *
                </label>
                <select
                  value={formData.situation_emploi}
                  onChange={(e) => setFormData({ ...formData, situation_emploi: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="sans_emploi">Sans emploi / En recherche</option>
                  <option value="entrepreneur">Entrepreneur / Travailleur indépendant</option>
                  <option value="apprenti">Apprenti / Stagiaire</option>
                  <option value="employe">Employé rémunéré</option>
                  <option value="etudiant">Élève ou Étudiant</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Métier, compétences pratiques ou centres d'intérêt
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mécanique moto, couture, maraîchage, maçonnerie, graphisme..."
                  value={formData.metier_competences}
                  onChange={(e) => setFormData({ ...formData, metier_competences: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Besoins prioritaires en formation et insertion professionnelle
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Formation en gestion de petite entreprise, kit d’outillage pour installation..."
                  value={formData.besoins_formation_insertion}
                  onChange={(e) => setFormData({ ...formData, besoins_formation_insertion: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloc 4: Préoccupations & Propositions citoyennes */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
              4. Préoccupations & Propositions à la Mairie de Lambanyi
            </h3>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-2">
                Principales difficultés vécues dans le quartier (Sélectionner les thèmes) :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'emploi', label: 'Emploi & Chômage' },
                  { id: 'assainissement', label: 'Assainissement / Eau' },
                  { id: 'sport', label: 'Terrains de sport' },
                  { id: 'education', label: 'Éducation / Écoles' },
                  { id: 'securite', label: 'Sécurité nocturne' },
                  { id: 'sante', label: 'Centres de Santé' },
                  { id: 'culture', label: 'Loisirs & Culture' },
                  { id: 'transport', label: 'Voirie & Transport' },
                ].map((th) => {
                  const isChecked = (formData.categories_preoccupations || []).includes(th.id);
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => togglePreoccupation(th.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                        isChecked
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-semibold'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {th.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Proposition libre ou message adressé à la commune / Monsieur le Maire :
              </label>
              <textarea
                rows={3}
                placeholder="Idée concrète pour améliorer la vie des jeunes de Lambanyi..."
                value={formData.propositions_mairie}
                onChange={(e) => setFormData({ ...formData, propositions_mairie: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Bloc 5: Consentement et Soumission */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3 bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
              <input
                type="checkbox"
                id="consentement"
                checked={formData.consentement_jeune}
                onChange={(e) => setFormData({ ...formData, consentement_jeune: e.target.checked })}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="consentement" className="text-xs text-neutral-300 leading-snug">
                <span className="font-semibold text-white">Consentement obligatoire recueilli : </span>
                Le jeune a été informé que ces données sont recueillies pour la mairie de Lambanyi
                dans le cadre exclusif de la politique communale jeunesse et de l'aménagement des quartiers.
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 transition"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer en Brouillon</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Transmission en cours...'
                    : isOnline
                    ? 'Soumettre au Superviseur'
                    : 'Enregistrer Hors-Ligne (Terrain)'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-VIEW 2: LISTE DES FICHES DE L'AGENT */}
      {activeSubTab === 'liste' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>
              Fiches enregistrées par vous ({currentUser.prenom} {currentUser.nom})
            </span>
            <button
              onClick={onRefreshFiches}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              Rafraîchir la liste
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fiches.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-500 text-xs">
                Aucune fiche enregistrée pour le moment. Commencez par une nouvelle saisie de terrain.
              </div>
            ) : (
              fiches.map((f) => {
                const isValidated = f.statut === 'valide';
                const isToCorrect = f.statut === 'a_corriger';
                const isPossibleDuplicate = f.statut_doublon === 'doublon_potentiel';

                return (
                  <div
                    key={f.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm space-y-3 relative overflow-hidden"
                  >
                    {/* Status bar accent */}
                    <div
                      className={`h-1 w-full absolute top-0 left-0 ${
                        isValidated
                          ? 'bg-emerald-500'
                          : isToCorrect
                          ? 'bg-rose-500'
                          : isPossibleDuplicate
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    ></div>

                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <div className="font-bold text-sm text-white">
                          {f.prenom} {f.nom}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {f.quartier_nom} · {f.secteur} · {f.age} ans ({f.sexe})
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isValidated
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isToCorrect
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : f.statut === 'envoye'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {f.statut.replace('_', ' ')}
                        </span>

                        {isPossibleDuplicate && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-700 rounded font-semibold">
                            Doublon potentiel ({f.doublon_score}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-neutral-300 bg-neutral-800/60 p-2.5 rounded-lg space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Emploi :</span>
                        <span className="font-medium capitalize">{f.situation_emploi.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Téléphone :</span>
                        <span className="font-mono">{f.telephone || 'Non renseigné'}</span>
                      </div>
                      {f.propositions_mairie && (
                        <div className="pt-1 text-[11px] text-neutral-300 italic border-t border-neutral-700/50 mt-1">
                          « {f.propositions_mairie} »
                        </div>
                      )}
                    </div>

                    {/* Feedback superviseur en cas de retour "À corriger" */}
                    {isToCorrect && f.commentaire_superviseur && (
                      <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-2.5 text-xs text-rose-200">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-300 mb-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Motif du renvoi par le Superviseur :</span>
                        </div>
                        <p>{f.commentaire_superviseur}</p>
                      </div>
                    )}

                    {/* Scénario 5 : Règle métier stricte affichée sur fiche validée */}
                    {isValidated && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/80 bg-emerald-950/30 p-2 rounded border border-emerald-800/40">
                        <Lock className="w-3.5 h-3.5" />
                        <span>
                          Fiche validée officielle : Modification verrouillée pour l'agent (CDC Section 4.3).
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
