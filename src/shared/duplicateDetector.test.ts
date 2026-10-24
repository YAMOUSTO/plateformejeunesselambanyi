import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDuplicate,
  normalizeString,
  normalizePhone,
  stringSimilarity,
} from './duplicateDetector.ts';
import type { FicheIndividuelle } from './types.ts';

test('normalizeString handles accents, uppercase, and spaces', () => {
  assert.equal(normalizeString('  Mamadou  BAH  '), 'mamadou bah');
  assert.equal(normalizeString('Élise Sékou'), 'elise sekou');
});

test('normalizePhone handles Guinean telephone numbers with +224 prefix', () => {
  assert.equal(normalizePhone('+224 620 12 34 56'), '620123456');
  assert.equal(normalizePhone('00224620123456'), '620123456');
  assert.equal(normalizePhone('622-44-55-66'), '622445566');
});

test('stringSimilarity returns 1 for identical and close values for slight typos', () => {
  assert.equal(stringSimilarity('soumah', 'soumah'), 1);
  const typoScore = stringSimilarity('soumah', 'souma');
  assert.ok(typoScore >= 0.8, 'Small typo should have high similarity');
});

test('detectDuplicate flags high similarity without blocking entry (CDC Scénario 2)', () => {
  const existingFiches: FicheIndividuelle[] = [
    {
      id: 'f-1',
      agent_id: 'agent-1',
      quartier_id: 'q-lambanyi-centre',
      secteur: 'Secteur 2',
      nom: 'Camara',
      prenom: 'Aboubacar',
      sexe: 'M',
      age: 22,
      telephone: '621000111',
      scolarise: true,
      niveau_etudes: 'universitaire',
      situation_emploi: 'sans_emploi',
      categories_preoccupations: ['emploi'],
      consentement_jeune: true,
      est_mineur: false,
      statut: 'valide',
      statut_doublon: 'aucun',
      version: 1,
      client_updated_at: new Date().toISOString(),
      server_updated_at: new Date().toISOString(),
    },
  ];

  // Cas A : Même nom, prénom, âge, quartier et téléphone partagé
  const newSimilarFiche: Partial<FicheIndividuelle> = {
    nom: 'Camara',
    prenom: 'Aboubacar',
    age: 22,
    quartier_id: 'q-lambanyi-centre',
    telephone: '621000111',
  };

  const result = detectDuplicate(newSimilarFiche, existingFiches);
  assert.ok(result.isDuplicate, 'Should detect duplicate');
  assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
  assert.equal(result.candidateFicheId, 'f-1');

  // Cas B : Téléphone partagé par un frère (nom identique, prénom différent, âge différent)
  const brotherFiche: Partial<FicheIndividuelle> = {
    nom: 'Camara',
    prenom: 'Ibrahima',
    age: 18,
    quartier_id: 'q-lambanyi-centre',
    telephone: '621000111', // Même téléphone partagé de la famille
  };

  const brotherResult = detectDuplicate(brotherFiche, existingFiches);
  // Le score combine téléphone et nom mais le prénom et l'âge diffèrent
  assert.ok(brotherResult.reasons.some((r) => r.includes('numéro de téléphone')));

  // Cas C : Personne complètement distincte
  const distinctFiche: Partial<FicheIndividuelle> = {
    nom: 'Diallo',
    prenom: 'Mariama',
    age: 27,
    quartier_id: 'q-kobaya',
    telephone: '628999888',
  };

  const distinctResult = detectDuplicate(distinctFiche, existingFiches);
  assert.equal(distinctResult.isDuplicate, false);
  assert.ok(distinctResult.score < 40);
});
