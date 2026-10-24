import React, { useState } from 'react';
import {
  Users,
  Building,
  MapPin,
  Send,
  PlusCircle,
  FileCheck,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import type { UserProfile, Quartier, FicheCollective, EspaceJeunesse } from '../shared/types.ts';

interface ConsultationCollectiveViewProps {
  currentUser: UserProfile;
  quartiers: Quartier[];
  collectives: FicheCollective[];
  espaces: EspaceJeunesse[];
  onSubmitCollective: (data: Partial<FicheCollective>) => Promise<void>;
  onSubmitEspace: (data: Partial<EspaceJeunesse>) => Promise<void>;
  onRefreshData: () => void;
}

export const ConsultationCollectiveView: React.FC<ConsultationCollectiveViewProps> = ({
  currentUser,
  quartiers,
  collectives,
  espaces,
  onSubmitCollective,
  onSubmitEspace,
  onRefreshData,
}) => {
  const [subTab, setSubTab] = useState<'association' | 'espace' | 'historique'>('association');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulaire Collective
  const [collForm, setCollForm] = useState<Partial<FicheCollective>>({
    quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
    nom_organisation: '',
    type_organisation: 'association',
    annee_creation: 2022,
    nombre_membres: 30,
    contact_referent_nom: '',
    contact_referent_tel: '',
    date_rencontre: new Date().toISOString().split('T')[0],
    lieu_rencontre: '',
    nombre_participants_total: 20,
    nombre_femmes_filles: 10,
    projets_communautaires: '',
    besoins_equipements: '',
    idees_activites_revenus: '',
    difficultes_par_theme: {
      assainissement: '',
      emploi: '',
      sport: '',
    },
  });

  // Formulaire Espace
  const [espaceForm, setEspaceForm] = useState<Partial<EspaceJeunesse>>({
    quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
    nom: '',
    type_espace: 'maison_des_jeunes',
    etat: 'moyen',
    latitude: 9.6248,
    longitude: -13.6212,
    description_besoins: '',
  });

  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setEspaceForm((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          }));
          setMsg({ type: 'success', text: `Coordonnées GPS capturées : ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        },
        () => {
          // Coordonnées par défaut Lambanyi Centre si géolocalisation indisponible
          setEspaceForm((prev) => ({ ...prev, latitude: 9.6245, longitude: -13.6210 }));
          setMsg({ type: 'success', text: 'Position par défaut Lambanyi Centre appliquée.' });
        }
      );
    }
  };

  const handleSubmitColl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collForm.nom_organisation || !collForm.quartier_id) {
      setMsg({ type: 'error', text: 'Nom de l’organisation et quartier obligatoires.' });
      return;
    }
    setIsSubmitting(true);
    setMsg(null);
    try {
      await onSubmitCollective(collForm);
      setMsg({ type: 'success', text: 'Consultation collective enregistrée avec succès.' });
      setCollForm({
        quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
        nom_organisation: '',
        type_organisation: 'association',
        annee_creation: 2022,
        nombre_membres: 30,
        contact_referent_nom: '',
        contact_referent_tel: '',
        date_rencontre: new Date().toISOString().split('T')[0],
        lieu_rencontre: '',
        nombre_participants_total: 20,
        nombre_femmes_filles: 10,
        projets_communautaires: '',
        besoins_equipements: '',
        idees_activites_revenus: '',
      });
      onRefreshData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Erreur lors de l’enregistrement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEsp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espaceForm.nom || !espaceForm.quartier_id) {
      setMsg({ type: 'error', text: 'Nom de l’espace et quartier requis.' });
      return;
    }
    setIsSubmitting(true);
    setMsg(null);
    try {
      await onSubmitEspace(espaceForm);
      setMsg({ type: 'success', text: 'Espace jeunesse recensé et ajouté à la cartographie.' });
      setEspaceForm({
        quartier_id: currentUser.quartier_id || quartiers[0]?.id || '',
        nom: '',
        type_espace: 'maison_des_jeunes',
        etat: 'moyen',
        latitude: 9.6248,
        longitude: -13.6212,
        description_besoins: '',
      });
      onRefreshData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Erreur lors du recensement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab selection */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setSubTab('association')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'association'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Consultation d'Association</span>
        </button>

        <button
          onClick={() => setSubTab('espace')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'espace'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Recensement d'un Espace / Équipement</span>
        </button>

        <button
          onClick={() => setSubTab('historique')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            subTab === 'historique'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Répertoire ({collectives.length} orgs · {espaces.length} espaces)</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            msg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* FORMULAIRE 1 : CONSULTATION COLLECTIVE */}
      {subTab === 'association' && (
        <form onSubmit={handleSubmitColl} className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
              Identification de l'Organisation de Jeunesse (CDC Section 4.2)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Nom de l'organisation *</label>
                <input
                  type="text"
                  placeholder="Ex: Association des Jeunes Unis de Waria"
                  value={collForm.nom_organisation}
                  onChange={(e) => setCollForm({ ...collForm, nom_organisation: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Type de structure *</label>
                <select
                  value={collForm.type_organisation}
                  onChange={(e) => setCollForm({ ...collForm, type_organisation: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="association">Association enregistrée</option>
                  <option value="groupement_jeunes">Groupement d'intérêt économique / informel</option>
                  <option value="club_sportif">Club de sport / Maracana</option>
                  <option value="collectif_artistique">Collectif d'artistes / Foyer culturel</option>
                  <option value="ong_locale">ONG locale de développement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Quartier affecté *</label>
                <select
                  value={collForm.quartier_id}
                  onChange={(e) => setCollForm({ ...collForm, quartier_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  {quartiers.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nom} ({q.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Nombre d'adhérents</label>
                <input
                  type="number"
                  value={collForm.nombre_membres}
                  onChange={(e) => setCollForm({ ...collForm, nombre_membres: parseInt(e.target.value, 10) })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Personne de contact / Rôle</label>
                <input
                  type="text"
                  placeholder="Ex: Diallo Sékou (Président)"
                  value={collForm.contact_referent_nom}
                  onChange={(e) => setCollForm({ ...collForm, contact_referent_nom: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Numéro de téléphone</label>
                <input
                  type="tel"
                  placeholder="+224 620..."
                  value={collForm.contact_referent_tel}
                  onChange={(e) => setCollForm({ ...collForm, contact_referent_tel: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
              Déroulement de la Rencontre Collective & Propositions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Date de rencontre</label>
                <input
                  type="date"
                  value={collForm.date_rencontre}
                  onChange={(e) => setCollForm({ ...collForm, date_rencontre: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Participants au total</label>
                <input
                  type="number"
                  value={collForm.nombre_participants_total}
                  onChange={(e) => setCollForm({ ...collForm, nombre_participants_total: parseInt(e.target.value, 10) })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Dont Femmes & Jeunes Filles</label>
                <input
                  type="number"
                  value={collForm.nombre_femmes_filles}
                  onChange={(e) => setCollForm({ ...collForm, nombre_femmes_filles: parseInt(e.target.value, 10) })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-300 mb-1">Projets communautaires prioritaires</label>
                <textarea
                  rows={2}
                  placeholder="Projet concret porté par l'organisation..."
                  value={collForm.projets_communautaires}
                  onChange={(e) => setCollForm({ ...collForm, projets_communautaires: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-300 mb-1">Besoins urgents en équipements</label>
                <input
                  type="text"
                  placeholder="Ex: Sono pour activités, outillage de nettoyage, kits sportifs..."
                  value={collForm.besoins_equipements}
                  onChange={(e) => setCollForm({ ...collForm, besoins_equipements: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition shadow"
              >
                <Send className="w-4 h-4" />
                <span>Enregistrer la consultation collective</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FORMULAIRE 2 : RECENSEMENT ESPACE & ÉQUIPEMENT */}
      {subTab === 'espace' && (
        <form onSubmit={handleSubmitEsp} className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
              Recensement d'un Espace ou Équipement Jeunesse (CDC Section 4.2 & Cartographie)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Nom du lieu / espace *</label>
                <input
                  type="text"
                  placeholder="Ex: Maison des jeunes, Terrain Canari..."
                  value={espaceForm.nom}
                  onChange={(e) => setEspaceForm({ ...espaceForm, nom: e.target.value })}
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Type d'espace *</label>
                <select
                  value={espaceForm.type_espace}
                  onChange={(e) => setEspaceForm({ ...espaceForm, type_espace: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="maison_des_jeunes">Maison des Jeunes</option>
                  <option value="terrain_football">Terrain de Football / Maracana</option>
                  <option value="espace_polyvalent">Plateau Omnisport / Polyvalent</option>
                  <option value="foyer_socioculturel">Foyer socioculturel</option>
                  <option value="emprise_amenagee">Emprise de route aménagée</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">Quartier *</label>
                <select
                  value={espaceForm.quartier_id}
                  onChange={(e) => setEspaceForm({ ...espaceForm, quartier_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  {quartiers.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nom} ({q.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">État actuel du lieu *</label>
                <select
                  value={espaceForm.etat}
                  onChange={(e) => setEspaceForm({ ...espaceForm, etat: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="tres_bon">Très bon état / Opérationnel</option>
                  <option value="moyen">Moyen / Nécessite des rénovations</option>
                  <option value="degrade">Dégradé / Praticable avec difficultés</option>
                  <option value="abandonne">Abandonné / À réhabiliter totalement</option>
                  <option value="en_chantier">En chantier de construction</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-neutral-300">Coordonnées GPS géographiques *</label>
                  <button
                    type="button"
                    onClick={handleCaptureGPS}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Capturer ma position GPS actuelle</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude (ex: 9.6248)"
                    value={espaceForm.latitude}
                    onChange={(e) => setEspaceForm({ ...espaceForm, latitude: parseFloat(e.target.value) })}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude (ex: -13.6212)"
                    value={espaceForm.longitude}
                    onChange={(e) => setEspaceForm({ ...espaceForm, longitude: parseFloat(e.target.value) })}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-300 mb-1">
                  Description des aménagements ou équipements nécessaires
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Électrification solaire, grillages de protection, peinture, sonorisation..."
                  value={espaceForm.description_besoins}
                  onChange={(e) => setEspaceForm({ ...espaceForm, description_besoins: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition shadow"
              >
                <Building className="w-4 h-4" />
                <span>Enregistrer l'espace communal</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB 3 : HISTORIQUE ET RÉPERTOIRE */}
      {subTab === 'historique' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Associations */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Organisations Consultées ({collectives.length})</span>
              </h4>
              <div className="space-y-2">
                {collectives.map((c) => (
                  <div key={c.id} className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/50 text-xs">
                    <div className="font-bold text-white">{c.nom_organisation}</div>
                    <div className="text-neutral-400">
                      {c.quartier_nom} · {c.nombre_membres} membres · Contact: {c.contact_referent_nom}
                    </div>
                    {c.projets_communautaires && (
                      <div className="text-neutral-300 text-[11px] mt-1 italic">
                        « {c.projets_communautaires} »
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Espaces */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Espaces & Terrains Recensés ({espaces.length})</span>
              </h4>
              <div className="space-y-2">
                {espaces.map((esp) => (
                  <div key={esp.id} className="bg-neutral-800/60 p-3 rounded-lg border border-neutral-700/50 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white">{esp.nom}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-700 text-neutral-300 capitalize">
                        {esp.etat.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-neutral-400 mt-0.5">
                      {esp.quartier_nom} · GPS: {esp.latitude}, {esp.longitude}
                    </div>
                    {esp.description_besoins && (
                      <div className="text-neutral-300 text-[11px] mt-1">
                        Besoins : {esp.description_besoins}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
