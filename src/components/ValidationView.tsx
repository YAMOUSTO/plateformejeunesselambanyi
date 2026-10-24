import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  GitMerge,
  Edit3,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import type { UserProfile, FicheIndividuelle, Quartier } from '../shared/types.ts';

interface ValidationViewProps {
  currentUser: UserProfile;
  quartiers: Quartier[];
  fiches: FicheIndividuelle[];
  onValidateFiche: (ficheId: string, action: 'valide' | 'a_corriger' | 'rejete', commentaire?: string) => Promise<void>;
  onArbitrateDuplicate: (ficheId: string, decision: 'keep_both' | 'merge' | 'reject', motif?: string) => Promise<void>;
  onEditValidatedFiche: (ficheId: string, updates: Partial<FicheIndividuelle>, motif: string) => Promise<void>;
  onRefreshFiches: () => void;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  currentUser,
  quartiers,
  fiches,
  onValidateFiche,
  onArbitrateDuplicate,
  onEditValidatedFiche,
  onRefreshFiches,
}) => {
  const [selectedFicheForCorrection, setSelectedFicheForCorrection] = useState<FicheIndividuelle | null>(null);
  const [correctionComment, setCorrectionComment] = useState('');

  const [selectedDuplicate, setSelectedDuplicate] = useState<FicheIndividuelle | null>(null);
  const [duplicateArbitrationMotif, setDuplicateArbitrationMotif] = useState('');

  const [editingValidatedFiche, setEditingValidatedFiche] = useState<FicheIndividuelle | null>(null);
  const [editMotif, setEditMotif] = useState('');
  const [editFields, setEditFields] = useState<Partial<FicheIndividuelle>>({});

  const [filterQuartier, setFilterQuartier] = useState<string>(currentUser.quartier_id || 'all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSupervisor = currentUser.role === 'superviseur_quartier';
  const isAdmin = currentUser.role === 'admin_communal';

  // Fiches à valider (statut 'envoye')
  const fichesEnAttente = fiches.filter((f) => f.statut === 'envoye');
  // Doublons potentiels
  const fichesDoublons = fiches.filter((f) => f.statut_doublon === 'doublon_potentiel');
  // Fiches validées (pour test modification post-validation Scénario 5)
  const fichesValidees = fiches.filter((f) => f.statut === 'valide');

  const handleValidationAction = async (ficheId: string, action: 'valide' | 'a_corriger' | 'rejete', commentaire?: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      await onValidateFiche(ficheId, action, commentaire);
      setActionMessage({
        type: 'success',
        text: action === 'valide'
          ? 'Fiche validée avec succès. Elle intègre les statistiques officielles.'
          : 'Fiche renvoyée à l’agent avec commentaire explicatif.',
      });
      setSelectedFicheForCorrection(null);
      setCorrectionComment('');
      onRefreshFiches();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erreur lors de la validation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArbitration = async (decision: 'keep_both' | 'merge' | 'reject') => {
    if (!selectedDuplicate) return;
    setIsProcessing(true);
    setActionMessage(null);
    try {
      await onArbitrateDuplicate(selectedDuplicate.id, decision, duplicateArbitrationMotif);
      setActionMessage({
        type: 'success',
        text: `Arbitrage enregistré : ${
          decision === 'keep_both'
            ? 'Les deux fiches sont conservées comme distinctes.'
            : decision === 'merge'
            ? 'La fiche a été fusionnée.'
            : 'Le doublon a été rejeté.'
        }`,
      });
      setSelectedDuplicate(null);
      setDuplicateArbitrationMotif('');
      onRefreshFiches();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erreur d’arbitrage.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveValidatedEdit = async () => {
    if (!editingValidatedFiche) return;
    if (!editMotif || editMotif.trim().length < 5) {
      setActionMessage({
        type: 'error',
        text: 'Scénario 5 : Un motif documenté (minimum 5 caractères) est strictement obligatoire.',
      });
      return;
    }

    setIsProcessing(true);
    setActionMessage(null);
    try {
      await onEditValidatedFiche(editingValidatedFiche.id, editFields, editMotif);
      setActionMessage({
        type: 'success',
        text: 'Modification post-validation enregistrée et tracée dans le journal d’audit (Scénario 5 validé).',
      });
      setEditingValidatedFiche(null);
      setEditMotif('');
      onRefreshFiches();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erreur lors de la modification.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Espace de Contrôle, Validation & Gestion des Doublons
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isSupervisor
              ? `Supervision exclusive du quartier : ${currentUser.quartier_nom}. (Scénario 4 cloisonné)`
              : 'Administration centrale : vue globale sur les 14 quartiers de Lambanyi.'}
          </p>
        </div>

        {/* Info stats */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-neutral-400">En attente : </span>
            <span className="font-bold text-blue-300">{fichesEnAttente.length}</span>
          </div>
          <div className="bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-neutral-400">Doublons : </span>
            <span className="font-bold text-amber-300">{fichesDoublons.length}</span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* SECTION 1: DOUBLONS POTENTIELS À ARBITRER (Scénario 2) */}
      {fichesDoublons.length > 0 && (
        <div className="bg-neutral-900 border border-amber-700/60 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">
              Alertes de Doublons Détectés (CDC Section 4.4 & Scénario 2)
            </h3>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            La saisie de terrain n'a pas été bloquée. En tant que superviseur, vous devez trancher :
            conserver les deux (ex. deux frères partageant un même numéro de téléphone), fusionner ou rejeter.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fichesDoublons.map((f) => (
              <div
                key={f.id}
                className="bg-neutral-800/80 border border-amber-800/40 rounded-lg p-3.5 space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-white">
                      {f.prenom} {f.nom}
                    </span>
                    <div className="text-xs text-neutral-400">
                      {f.quartier_nom} · {f.secteur} · {f.age} ans
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-700">
                    Score : {f.doublon_score}%
                  </span>
                </div>

                {f.doublon_raisons && (
                  <div className="bg-neutral-900/60 p-2 rounded text-[11px] text-neutral-300 space-y-0.5">
                    <span className="font-semibold text-amber-300">Indices de ressemblance :</span>
                    <ul className="list-disc list-inside text-neutral-400">
                      {f.doublon_raisons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setSelectedDuplicate(f)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-600 text-neutral-950 hover:bg-amber-500 transition"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Arbitrer le Doublon</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: FICHES EN ATTENTE DE VALIDATION */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Fiches Récemment Transmises ({fichesEnAttente.length})
          </h3>
          <span className="text-xs text-neutral-400">Statut : Envoyée par l'agent</span>
        </div>

        {fichesEnAttente.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs bg-neutral-800/30 rounded-lg">
            Aucune nouvelle fiche en attente de validation dans ce quartier.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {fichesEnAttente.map((f) => (
              <div key={f.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {f.prenom} {f.nom}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded font-mono">
                      {f.age} ans ({f.sexe})
                    </span>
                    {f.est_mineur && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                        Mineur · Accord parental vérifié
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Agent : <span className="text-neutral-300">{f.agent_nom || 'Non spécifié'}</span> · Quartier :{' '}
                    <span className="text-neutral-300">{f.quartier_nom}</span> ({f.secteur})
                  </div>
                  <div className="text-xs text-neutral-300">
                    Situation : <span className="capitalize font-medium">{f.situation_emploi.replace('_', ' ')}</span> ·
                    Compétences : {f.metier_competences || 'Généraliste'}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setSelectedFicheForCorrection(f)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>À corriger</span>
                  </button>

                  <button
                    onClick={() => handleValidationAction(f.id, 'valide')}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Valider</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: MODIFICATION D'UNE FICHE VALIDÉE (Scénario 5) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Fiches Officielles Validées (Test Scénario 5 : Modification avec Motif Obligatoire)
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400">
            Réservé aux superviseurs & admin communal
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          Selon le CDC (Section 4.3) : Une fiche validée ne peut plus être modifiée par l'agent de terrain.
          Seul le superviseur ou l'administrateur le peut, et cela exige un motif obligatoire tracé dans l'audit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fichesValidees.slice(0, 4).map((f) => (
            <div
              key={f.id}
              className="bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-3 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold text-xs text-white">
                  {f.prenom} {f.nom}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {f.quartier_nom} · {f.secteur} · Emploi : {f.situation_emploi}
                </div>
                {f.motif_modification_post_validation && (
                  <div className="text-[10px] text-emerald-300 italic mt-0.5">
                    Dernière modif : « {f.motif_modification_post_validation} »
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingValidatedFiche(f);
                  setEditFields({
                    nom: f.nom,
                    prenom: f.prenom,
                    situation_emploi: f.situation_emploi,
                    metier_competences: f.metier_competences,
                  });
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-700 text-xs text-neutral-200 hover:bg-neutral-600 transition"
              >
                <Edit3 className="w-3 h-3" />
                <span>Modifier (Scénario 5)</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: RENVOI À CORRIGER AVEC COMMENTAIRE */}
      {selectedFicheForCorrection && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Renvoyer la fiche à l'agent avec instructions</span>
            </h4>
            <p className="text-xs text-neutral-300">
              Fiche de : <strong>{selectedFicheForCorrection.prenom} {selectedFicheForCorrection.nom}</strong> ({selectedFicheForCorrection.quartier_nom})
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Commentaire d'instruction pour l'agent *
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Merci de vérifier l'âge exact ou de compléter le niveau d'études..."
                value={correctionComment}
                onChange={(e) => setCorrectionComment(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFicheForCorrection(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!correctionComment.trim()}
                onClick={() => handleValidationAction(selectedFicheForCorrection.id, 'a_corriger', correctionComment)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Confirmer le renvoi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ARBITRAGE DU DOUBLON (Scénario 2) */}
      {selectedDuplicate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-amber-700/80 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-amber-400" />
              <span>Arbitrage de Doublon (CDC Scénario 2)</span>
            </h4>

            <div className="bg-neutral-800/60 p-3 rounded-lg text-xs text-neutral-200 space-y-1">
              <div><strong>Personne :</strong> {selectedDuplicate.prenom} {selectedDuplicate.nom} ({selectedDuplicate.age} ans)</div>
              <div><strong>Quartier :</strong> {selectedDuplicate.quartier_nom} · {selectedDuplicate.secteur}</div>
              <div><strong>Téléphone :</strong> {selectedDuplicate.telephone || 'Non renseigné'}</div>
              <div className="text-amber-300 font-semibold pt-1">
                Score d'alerte : {selectedDuplicate.doublon_score}%
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Motif de la décision d'arbitrage (consigné dans l'audit) :
              </label>
              <input
                type="text"
                placeholder="Ex: Vérification physique effectuée : deux personnes distinctes d'un même foyer..."
                value={duplicateArbitrationMotif}
                onChange={(e) => setDuplicateArbitrationMotif(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleArbitration('keep_both')}
                className="p-2.5 rounded-lg text-xs font-semibold bg-emerald-600/30 border border-emerald-500 text-emerald-300 hover:bg-emerald-600/50 text-center"
              >
                Garder les deux (Personnes distinctes)
              </button>
              <button
                type="button"
                onClick={() => handleArbitration('merge')}
                className="p-2.5 rounded-lg text-xs font-semibold bg-blue-600/30 border border-blue-500 text-blue-300 hover:bg-blue-600/50 text-center"
              >
                Fusionner avec l'original
              </button>
              <button
                type="button"
                onClick={() => handleArbitration('reject')}
                className="p-2.5 rounded-lg text-xs font-semibold bg-rose-600/30 border border-rose-500 text-rose-300 hover:bg-rose-600/50 text-center"
              >
                Rejeter (Doublon avéré)
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedDuplicate(null)}
                className="text-xs text-neutral-400 hover:underline"
              >
                Fermer sans modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MODIFICATION AVEC MOTIF OBLIGATOIRE (Scénario 5) */}
      {editingValidatedFiche && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span>Modifier une fiche validée (Scénario 5)</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Situation d'emploi :</label>
                <select
                  value={editFields.situation_emploi}
                  onChange={(e) => setEditFields({ ...editFields, situation_emploi: e.target.value as any })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                >
                  <option value="sans_emploi">Sans emploi</option>
                  <option value="entrepreneur">Entrepreneur</option>
                  <option value="apprenti">Apprenti</option>
                  <option value="employe">Employé</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Métier / Compétences :</label>
                <input
                  type="text"
                  value={editFields.metier_competences || ''}
                  onChange={(e) => setEditFields({ ...editFields, metier_competences: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white"
                />
              </div>

              {/* Champ obligatoire CDC Section 4.3 & Scénario 5 */}
              <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                <label className="block text-amber-300 font-bold mb-1">
                  Motif justificatif obligatoire * (Scénario 5)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Rectification de la situation professionnelle sur présentation d'une attestation d'embauche..."
                  value={editMotif}
                  onChange={(e) => setEditMotif(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingValidatedFiche(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveValidatedEdit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Enregistrer avec Motif
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
