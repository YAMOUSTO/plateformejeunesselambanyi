export const DOMAIN_VERSION = '1.0.0';

export type UserRole =
  | 'agent_individuel'
  | 'agent_collectif'
  | 'superviseur_quartier'
  | 'admin_communal'
  | 'maire_lecture';

export type AccountStatus = 'actif' | 'suspendu' | 'revoque_perte_telephone';

export interface UserProfile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: UserRole;
  quartier_id?: string; // Obligatoire pour superviseur et agents affectés
  quartier_nom?: string;
  statut_compte: AccountStatus;
  derniere_connexion?: string;
  created_at: string;
}

export interface Quartier {
  id: string;
  code: string;
  nom: string;
  population_estimee: number;
  superviseur_id?: string;
  superviseur_nom?: string;
  coordonnees: [number, number]; // [lat, lng]
}

export type StatutFiche =
  | 'brouillon'
  | 'enregistre_offline'
  | 'envoye'
  | 'valide'
  | 'a_corriger'
  | 'rejete';

export type StatutDoublon =
  | 'aucun'
  | 'doublon_potentiel'
  | 'confirme_distinct'
  | 'fusionne';

export interface FicheIndividuelle {
  id: string; // UUID v4
  agent_id: string;
  agent_nom?: string;
  quartier_id: string;
  quartier_nom?: string;
  secteur: string;

  // Identité
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  date_naissance?: string;
  age: number;

  // Contact
  telephone?: string;
  telephone_alternatif?: string;
  email?: string;

  // Formation
  scolarise: boolean;
  niveau_etudes: 'aucun' | 'primaire' | 'college' | 'lycee' | 'professionnel' | 'universitaire';
  dernier_diplome?: string;

  // Emploi & Besoins
  situation_emploi: 'employe' | 'sans_emploi' | 'entrepreneur' | 'apprenti' | 'etudiant';
  metier_competences?: string;
  besoins_formation_insertion?: string;

  // Préoccupations & Propositions
  categories_preoccupations: string[]; // ex: ['emploi', 'assainissement', 'securite', 'sport']
  propositions_mairie?: string;

  // Protection & Consentement
  consentement_jeune: boolean;
  est_mineur: boolean;
  accord_parental_nom?: string;
  accord_parental_lien?: string; // père, mère, tuteur
  accord_parental_date?: string;

  // Cycle de validation
  statut: StatutFiche;
  statut_doublon: StatutDoublon;
  doublon_de_fiche_id?: string;
  doublon_score?: number;
  doublon_raisons?: string[];
  commentaire_superviseur?: string;
  valide_par?: string;
  valide_le?: string;
  motif_modification_post_validation?: string;

  // Sync & Conflits
  version: number;
  client_updated_at: string;
  server_updated_at: string;
  sync_hash?: string;
}

export interface FicheCollective {
  id: string;
  agent_id: string;
  agent_nom?: string;
  quartier_id: string;
  quartier_nom?: string;

  // Organisation
  nom_organisation: string;
  type_organisation: 'association' | 'groupement_jeunes' | 'club_sportif' | 'collectif_artistique' | 'ong_locale' | 'autre';
  annee_creation?: number;
  nombre_membres: number;
  contact_referent_nom: string;
  contact_referent_tel: string;

  // Rencontre
  date_rencontre: string;
  lieu_rencontre: string;
  nombre_participants_total: number;
  nombre_femmes_filles: number;

  // Difficultés & Besoins
  difficultes_par_theme: Record<string, string>; // ex: { education: '...', emploi: '...' }
  projets_communautaires?: string;
  besoins_equipements?: string;
  idees_activites_revenus?: string;
  preuves_presence_urls?: string[];

  // Validation
  statut: StatutFiche;
  commentaire_superviseur?: string;
  valide_par?: string;
  valide_le?: string;
  version: number;
  client_updated_at: string;
  server_updated_at: string;
}

export interface EspaceJeunesse {
  id: string;
  quartier_id: string;
  quartier_nom?: string;
  nom: string;
  type_espace: 'maison_des_jeunes' | 'terrain_football' | 'espace_polyvalent' | 'foyer_socioculturel' | 'emprise_amenagee' | 'autre';
  etat: 'tres_bon' | 'moyen' | 'degrade' | 'abandonne' | 'en_chantier';
  latitude: number;
  longitude: number;
  photo_url?: string;
  description_besoins?: string;
  collecte_par?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_nom: string;
  user_role: UserRole;
  action: string;
  entity_type: string;
  entity_id: string;
  donnees_avant?: any;
  donnees_apres?: any;
  motif?: string;
  ip_address?: string;
  created_at: string;
}

export interface ProjetCitoyen {
  id: string;
  code_suivi: string;
  nom_porteur: string;
  contact_porteur: string;
  quartier_id: string;
  quartier_nom?: string;
  titre_projet: string;
  description: string;
  type_demande: 'projet_economique' | 'preoccupation_citoyenne' | 'demande_rdv_maire';
  statut: 'recue' | 'en_cours_examen' | 'rdv_programme' | 'acceptee' | 'cloturee';
  reponse_mairie?: string;
  date_rdv?: string;
  created_at: string;
}
