/**
 * Moteur de Confidentialité et K-Anonymat (CDC Section 6 & Scénarios 7, 10)
 * Destiné au profil de lecture du Maire et aux exports publics :
 * - Masque strictement tout identifiant direct (noms, téléphones, emails, accords parentaux nominatifs).
 * - Applique le seuil de k-anonymat (k >= 5) : toute catégorie ou tranche comptant moins de 5 personnes
 *   est masquée ("< 5") pour empêcher la ré-identification de personnes isolées.
 */
import type { FicheIndividuelle } from './types.ts';

export interface MayorSafeFiche {
  id: string;
  quartier_id: string;
  quartier_nom?: string;
  secteur: string;
  sexe: 'M' | 'F';
  age_tranche: string;
  scolarise: boolean;
  niveau_etudes: string;
  situation_emploi: string;
  categories_preoccupations: string[];
  statut: string;
}

export interface MayorCommunalStats {
  totalJeunesRecenses: number;
  totalFichesValidees: number;
  repartitionParQuartier: Array<{
    quartier_id: string;
    quartier_nom: string;
    nombreValide: number | '< 5';
    pourcentage: number;
  }>;
  repartitionParSexe: {
    hommes: number | '< 5';
    femmes: number | '< 5';
  };
  repartitionParEmploi: Record<string, number | '< 5'>;
  topPreoccupations: Array<{
    theme: string;
    occurrences: number | '< 5';
  }>;
  seuilKAnonymat: number;
}

export const K_THRESHOLD = 5;

export function getAgeTranche(age: number): string {
  if (age < 15) return '< 15 ans';
  if (age <= 19) return '15-19 ans';
  if (age <= 24) return '20-24 ans';
  if (age <= 29) return '25-29 ans';
  if (age <= 35) return '30-35 ans';
  return '> 35 ans';
}

export function sanitizeFichesForMayor(fiches: FicheIndividuelle[]): MayorSafeFiche[] {
  const fichesValidees = fiches.filter((f) => f.statut === 'valide');

  return fichesValidees.map((f) => ({
    id: f.id,
    quartier_id: f.quartier_id,
    quartier_nom: f.quartier_nom,
    secteur: f.secteur,
    sexe: f.sexe,
    age_tranche: getAgeTranche(f.age),
    scolarise: f.scolarise,
    niveau_etudes: f.niveau_etudes,
    situation_emploi: f.situation_emploi,
    categories_preoccupations: f.categories_preoccupations || [],
    statut: f.statut,
  }));
}

export function enforceKThreshold(count: number, k = K_THRESHOLD): number | '< 5' {
  if (count > 0 && count < k) {
    return '< 5';
  }
  return count;
}

export function generateMayorStats(
  allFiches: FicheIndividuelle[],
  quartiers: Array<{ id: string; nom: string }>
): MayorCommunalStats {
  const validees = allFiches.filter((f) => f.statut === 'valide');
  const totalValidees = validees.length;

  const repartitionParQuartier = quartiers.map((q) => {
    const qCount = validees.filter((f) => f.quartier_id === q.id).length;
    return {
      quartier_id: q.id,
      quartier_nom: q.nom,
      nombreValide: enforceKThreshold(qCount),
      pourcentage: totalValidees > 0 ? Math.round((qCount / totalValidees) * 100) : 0,
    };
  });

  const nbHommes = validees.filter((f) => f.sexe === 'M').length;
  const nbFemmes = validees.filter((f) => f.sexe === 'F').length;

  const emploiCounts: Record<string, number> = {};
  for (const f of validees) {
    emploiCounts[f.situation_emploi] = (emploiCounts[f.situation_emploi] || 0) + 1;
  }
  const repartitionParEmploi: Record<string, number | '< 5'> = {};
  for (const [key, val] of Object.entries(emploiCounts)) {
    repartitionParEmploi[key] = enforceKThreshold(val);
  }

  const themeCounts: Record<string, number> = {};
  for (const f of validees) {
    for (const t of f.categories_preoccupations || []) {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  }
  const topPreoccupations = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([theme, count]) => ({
      theme,
      occurrences: enforceKThreshold(count),
    }));

  return {
    totalJeunesRecenses: allFiches.length,
    totalFichesValidees: totalValidees,
    repartitionParQuartier,
    repartitionParSexe: {
      hommes: enforceKThreshold(nbHommes),
      femmes: enforceKThreshold(nbFemmes),
    },
    repartitionParEmploi,
    topPreoccupations,
    seuilKAnonymat: K_THRESHOLD,
  };
}
