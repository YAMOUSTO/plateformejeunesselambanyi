import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeFichesForMayor,
  enforceKThreshold,
  generateMayorStats,
  K_THRESHOLD,
} from './kAnonymity.ts';
import type { FicheIndividuelle } from './types.ts';

test('enforceKThreshold suppresses numbers below k=5 to "< 5"', () => {
  assert.equal(enforceKThreshold(0), 0);
  assert.equal(enforceKThreshold(1), '< 5');
  assert.equal(enforceKThreshold(4), '< 5');
  assert.equal(enforceKThreshold(5), 5);
  assert.equal(enforceKThreshold(42), 42);
});

test('sanitizeFichesForMayor strips all personally identifiable information', () => {
  const fiches: FicheIndividuelle[] = [
    {
      id: 'f-1',
      agent_id: 'ag-1',
      quartier_id: 'q-1',
      quartier_nom: 'Lambanyi Centre',
      secteur: 'Secteur 1',
      nom: 'SOULEYMANE',
      prenom: 'Mamadou',
      sexe: 'M',
      age: 23,
      telephone: '620123456',
      email: 'mamadou@test.gn',
      scolarise: true,
      niveau_etudes: 'universitaire',
      situation_emploi: 'sans_emploi',
      categories_preoccupations: ['emploi', 'assainissement'],
      consentement_jeune: true,
      est_mineur: false,
      accord_parental_nom: 'Tuteur Secret',
      statut: 'valide',
      statut_doublon: 'aucun',
      version: 1,
      client_updated_at: new Date().toISOString(),
      server_updated_at: new Date().toISOString(),
    },
    {
      id: 'f-draft',
      agent_id: 'ag-1',
      quartier_id: 'q-1',
      secteur: 'Secteur 1',
      nom: 'Non-Validé',
      prenom: 'Test',
      sexe: 'F',
      age: 19,
      scolarise: false,
      niveau_etudes: 'primaire',
      situation_emploi: 'apprenti',
      categories_preoccupations: ['formation'],
      consentement_jeune: true,
      est_mineur: false,
      statut: 'brouillon', // Doit être exclu du profil Maire (Scénario 10)
      statut_doublon: 'aucun',
      version: 1,
      client_updated_at: new Date().toISOString(),
      server_updated_at: new Date().toISOString(),
    },
  ];

  const sanitized = sanitizeFichesForMayor(fiches);
  assert.equal(sanitized.length, 1, 'Only validated fiches must be visible to Mayor');

  const item = sanitized[0] as any;
  assert.equal(item.nom, undefined, 'Nom must be stripped');
  assert.equal(item.prenom, undefined, 'Prenom must be stripped');
  assert.equal(item.telephone, undefined, 'Telephone must be stripped');
  assert.equal(item.email, undefined, 'Email must be stripped');
  assert.equal(item.accord_parental_nom, undefined, 'Parental info must be stripped');
  assert.equal(item.age_tranche, '20-24 ans');
});

test('generateMayorStats produces k-anonymized communal statistics', () => {
  const quartiers = [
    { id: 'q-1', nom: 'Lambanyi Centre' },
    { id: 'q-2', nom: 'Kobaya' },
  ];

  // 6 fiches in q-1, 2 in q-2 (below 5)
  const fiches: FicheIndividuelle[] = [];
  for (let i = 0; i < 6; i++) {
    fiches.push({
      id: `f-q1-${i}`,
      agent_id: 'ag-1',
      quartier_id: 'q-1',
      secteur: 'S1',
      nom: `Nom${i}`,
      prenom: `Prenom${i}`,
      sexe: 'M',
      age: 20,
      scolarise: true,
      niveau_etudes: 'lycee',
      situation_emploi: 'sans_emploi',
      categories_preoccupations: ['emploi'],
      consentement_jeune: true,
      est_mineur: false,
      statut: 'valide',
      statut_doublon: 'aucun',
      version: 1,
      client_updated_at: new Date().toISOString(),
      server_updated_at: new Date().toISOString(),
    });
  }

  for (let i = 0; i < 2; i++) {
    fiches.push({
      id: `f-q2-${i}`,
      agent_id: 'ag-2',
      quartier_id: 'q-2',
      secteur: 'S2',
      nom: `Nom${i}`,
      prenom: `Prenom${i}`,
      sexe: 'F',
      age: 18,
      scolarise: false,
      niveau_etudes: 'college',
      situation_emploi: 'entrepreneur',
      categories_preoccupations: ['sport'],
      consentement_jeune: true,
      est_mineur: false,
      statut: 'valide',
      statut_doublon: 'aucun',
      version: 1,
      client_updated_at: new Date().toISOString(),
      server_updated_at: new Date().toISOString(),
    });
  }

  const stats = generateMayorStats(fiches, quartiers);
  assert.equal(stats.totalFichesValidees, 8);

  const q1 = stats.repartitionParQuartier.find((q) => q.quartier_id === 'q-1');
  assert.equal(q1?.nombreValide, 6, 'Quartier with 6 elements should display exact count');

  const q2 = stats.repartitionParQuartier.find((q) => q.quartier_id === 'q-2');
  assert.equal(q2?.nombreValide, '< 5', 'Quartier with 2 elements (< 5) must be masked to "< 5"');
});
