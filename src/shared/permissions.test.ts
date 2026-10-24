import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReadFicheIndividuelle,
  canEditFicheIndividuelle,
  canValidateFiche,
  isAccountAuthorized,
} from './permissions.ts';
import type { UserProfile, FicheIndividuelle } from './types.ts';

const mockAgent: UserProfile = {
  id: 'u-agent-1',
  email: 'agent1@lambanyi.gn',
  nom: 'Diallo',
  prenom: 'Mamadou',
  telephone: '621111111',
  role: 'agent_individuel',
  quartier_id: 'q-lambanyi-centre',
  statut_compte: 'actif',
  created_at: new Date().toISOString(),
};

const mockSupervisorQuartier1: UserProfile = {
  id: 'u-sup-1',
  email: 'sup1@lambanyi.gn',
  nom: 'Bah',
  prenom: 'Ibrahima',
  telephone: '622222222',
  role: 'superviseur_quartier',
  quartier_id: 'q-lambanyi-centre',
  statut_compte: 'actif',
  created_at: new Date().toISOString(),
};

const mockFicheQuartier1: FicheIndividuelle = {
  id: 'f-1',
  agent_id: 'u-agent-1',
  quartier_id: 'q-lambanyi-centre',
  secteur: 'Secteur 1',
  nom: 'Sylla',
  prenom: 'Fodé',
  sexe: 'M',
  age: 21,
  scolarise: false,
  niveau_etudes: 'college',
  situation_emploi: 'sans_emploi',
  categories_preoccupations: ['emploi'],
  consentement_jeune: true,
  est_mineur: false,
  statut: 'envoye',
  statut_doublon: 'aucun',
  version: 1,
  client_updated_at: new Date().toISOString(),
  server_updated_at: new Date().toISOString(),
};

const mockFicheQuartier2: FicheIndividuelle = {
  ...mockFicheQuartier1,
  id: 'f-2',
  quartier_id: 'q-kobaya',
  agent_id: 'u-agent-other',
};

test('Scénario 4 : Un superviseur tente de lire un autre quartier -> Rejet 403', () => {
  // Même quartier : OK
  const sameQuartierResult = canReadFicheIndividuelle(mockSupervisorQuartier1, mockFicheQuartier1);
  assert.equal(sameQuartierResult.allowed, true);

  // Autre quartier : Rejet 403 strict
  const otherQuartierResult = canReadFicheIndividuelle(mockSupervisorQuartier1, mockFicheQuartier2);
  assert.equal(otherQuartierResult.allowed, false);
  assert.equal(otherQuartierResult.statusCode, 403);
});

test('Scénario 5 : Modification d’une fiche validée (Interdit pour agent, permis pour superviseur avec motif)', () => {
  const validatedFiche: FicheIndividuelle = {
    ...mockFicheQuartier1,
    statut: 'valide',
    valide_par: 'u-sup-1',
  };

  // Agent tente de modifier une fiche validée -> Rejet
  const agentAttempt = canEditFicheIndividuelle(mockAgent, validatedFiche);
  assert.equal(agentAttempt.allowed, false);
  assert.equal(agentAttempt.statusCode, 403);

  // Superviseur tente de modifier sans motif -> Rejet 400
  const supNoMotif = canEditFicheIndividuelle(mockSupervisorQuartier1, validatedFiche, '');
  assert.equal(supNoMotif.allowed, false);
  assert.equal(supNoMotif.statusCode, 400);

  // Superviseur avec motif valide documenté -> Autorisé
  const supWithMotif = canEditFicheIndividuelle(
    mockSupervisorQuartier1,
    validatedFiche,
    'Correction orthographe du patronyme vérifiée sur acte de naissance.'
  );
  assert.equal(supWithMotif.allowed, true);
});

test('Scénario 9 : Téléphone d’agent déclaré perdu -> Session révoquée immédiatement', () => {
  const lostDeviceAgent: UserProfile = {
    ...mockAgent,
    statut_compte: 'revoque_perte_telephone',
  };

  const check = isAccountAuthorized(lostDeviceAgent);
  assert.equal(check.allowed, false);
  assert.equal(check.statusCode, 403);
  assert.ok(check.reason?.includes('perdu ou volé'));

  const readAttempt = canReadFicheIndividuelle(lostDeviceAgent, mockFicheQuartier1);
  assert.equal(readAttempt.allowed, false);
  assert.equal(readAttempt.statusCode, 403);
});
