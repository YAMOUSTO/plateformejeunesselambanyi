import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { UserProfile, FicheIndividuelle, Quartier } from '../shared/types.ts';

interface ExportsViewProps {
  currentUser: UserProfile;
  quartiers: Quartier[];
  fiches: FicheIndividuelle[];
}

export const ExportsView: React.FC<ExportsViewProps> = ({
  currentUser,
  quartiers,
  fiches,
}) => {
  const isMayor = currentUser.role === 'maire_lecture';
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (isMayor) {
      // Scénario 7 : Profil de lecture sans noms ni numéros
      csvContent += 'ID;Quartier;Secteur;Sexe;Tranche Age;Scolarise;Niveau Etudes;Situation Emploi;Statut\n';
      fiches.forEach((f) => {
        csvContent += `"${f.id}";"${f.quartier_nom}";"${f.secteur}";"${f.sexe}";"${f.age} ans";"${f.scolarise ? 'Oui' : 'Non'}";"${f.niveau_etudes}";"${f.situation_emploi}";"${f.statut}"\n`;
      });
    } else {
      csvContent += 'ID;Quartier;Secteur;Nom;Prenom;Sexe;Age;Telephone;Scolarise;Niveau Etudes;Situation Emploi;Statut\n';
      fiches.forEach((f) => {
        csvContent += `"${f.id}";"${f.quartier_nom}";"${f.secteur}";"${f.nom}";"${f.prenom}";"${f.sexe}";${f.age};"${f.telephone || ''}";"${f.scolarise ? 'Oui' : 'Non'}";"${f.niveau_etudes}";"${f.situation_emploi}";"${f.statut}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `export_jeunesse_lambanyi_${isMayor ? 'maire_anonymise' : 'officiel'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('Fichier CSV généré et téléchargé.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Exports des Données Communales & Rapports Officiels
            </h2>
          </div>
          {isMayor && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Scénario 7 : Export Filtré sans Identifiants</span>
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400">
          Générez des rapports exploitables pour les séances du Conseil Communal, les partenaires techniques
          et financiers (PTF) et les services municipaux.
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CSV / Excel */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Format Tabulaire (CSV / Compatible Excel)</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Téléchargez l'ensemble des fiches recensées au format CSV avec encodage UTF-8 et séparateurs point-virgule.
            {isMayor
              ? ' En tant que Maire, les colonnes Nom, Prénom et Numéro de téléphone sont automatiquement exclues (Scénario 7).'
              : ' Contient l’intégralité des champs autorisés pour votre rôle.'}
          </p>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger l'Export CSV ({fiches.length} lignes)</span>
          </button>
        </div>

        {/* PDF Synthèse */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileText className="w-5 h-5 text-purple-400" />
            <span>Rapport Imprimable / PDF pour le Conseil</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Format mise en page prêt pour impression papier ou génération PDF via le navigateur, avec
            l'en-tête officiel de la Commune de Lambanyi et les statistiques des 14 quartiers.
          </p>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / Exporter en PDF Officiel</span>
          </button>
        </div>
      </div>

      {/* Aperçu des colonnes exportées (Preuve de conformité Scénario 7) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
            Aperçu des données d'export (Vérification Scénario 7)
          </h3>
          <span className="text-[11px] text-neutral-400 font-mono">
            {isMayor ? 'Masquage des données nominatives actif' : 'Vue nominative complète'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-neutral-300">
            <thead className="bg-neutral-800/80 text-neutral-400 font-semibold">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Quartier</th>
                <th className="p-2">Secteur</th>
                {!isMayor && <th className="p-2 text-emerald-400">Nom & Prénom</th>}
                <th className="p-2">Sexe</th>
                <th className="p-2">Âge</th>
                {!isMayor && <th className="p-2 text-emerald-400">Téléphone</th>}
                <th className="p-2">Emploi</th>
                <th className="p-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-sans">
              {fiches.slice(0, 5).map((f) => (
                <tr key={f.id} className="hover:bg-neutral-800/30">
                  <td className="p-2 font-mono text-neutral-400">{f.id}</td>
                  <td className="p-2 font-medium text-white">{f.quartier_nom}</td>
                  <td className="p-2">{f.secteur}</td>
                  {!isMayor && <td className="p-2 font-semibold text-white">{f.prenom} {f.nom}</td>}
                  <td className="p-2">{f.sexe}</td>
                  <td className="p-2 font-mono">{f.age} ans</td>
                  {!isMayor && <td className="p-2 font-mono text-neutral-300">{f.telephone || '-'}</td>}
                  <td className="p-2 capitalize">{f.situation_emploi.replace('_', ' ')}</td>
                  <td className="p-2 font-semibold text-emerald-400">{f.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
