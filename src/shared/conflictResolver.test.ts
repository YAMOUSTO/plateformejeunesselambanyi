import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkSyncConflict,
  resolveConflict,
} from './conflictResolver.ts';
import type { FicheIndividuelle } from './types.ts';

const baseFiche: FicheIndividuelle = {
  id: 'fiche-c-1',
  agent_id: 'agent-1',
  quartier_id: 'q-1',
  secteur: 'Secteur 1',
  nom: 'Barry',
  prenom: 'Mamadou',
  sexe: 'M',
  age: 24,
  telephone: '622000000',
  scolarise: true,
  niveau_etudes: 'universitaire',
  situation_emploi: 'sans_emploi',
  categories_preoccupations: ['emploi'],
  consentement_jeune: true,
  est_mineur: false,
  statut: 'envoye',
  statut_doublon: 'aucun',
  version: 1,
  client_updated_at: '2026-10-20T08:00:00Z',
  server_updated_at: '2026-10-20T08:00:00Z',
};

test('Scénario 3 : Détection de conflit lors d’une modification concurrente', () => {
  // Version serveur modifiée par le superviseur
  const serverVersion: FicheIndividuelle = {
    ...baseFiche,
    version: 2,
    situation_emploi: 'entrepreneur',
    server_updated_at: '2026-10-20T09:30:00Z',
  };

  // Version locale modifiée hors connexion par l'agent
  const localVersion: FicheIndividuelle = {
    ...baseFiche,
    situation_emploi: 'employe',
    propositions_mairie: 'Aide à la création d’atelier de couture',
    client_updated_at: '2026-10-20T09:45:00Z',
  };

  const result = checkSyncConflict(localVersion, serverVersion);
  assert.equal(result.hasConflict, true, 'Should detect concurrent divergence');
  assert.ok(result.conflict);
  assert.ok(result.conflict.divergingFields.includes('situation_emploi'));

  // Test de résolution superviseur : arbitrage vers la version locale avec incrémentation de version
  const resolved = resolveConflict(result.conflict, 'keep_local');
  assert.equal(resolved.situation_emploi, 'employe');
  assert.equal(resolved.version, 3);
  assert.ok(resolved.server_updated_at > '2026-10-20T09:45:00Z');
});
