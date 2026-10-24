/**
 * Algorithme de détection des doublons (CDC Lambanyi Section 4.4)
 * Combine Nom, Prénom, Tranche d'âge, Quartier et Téléphone.
 * Alerte sans bloquer la saisie.
 */
import type { FicheIndividuelle } from './types.ts';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  score: number;
  candidateFicheId?: string;
  candidateFicheNom?: string;
  reasons: string[];
}

/**
 * Normalise une chaîne de texte (accents, casse, espaces multiples)
 */
export function normalizeString(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalise un numéro de téléphone guinéen (retire indicatif +224, espaces, tirets)
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('00224') && cleaned.length > 11) {
    cleaned = cleaned.substring(5);
  } else if (cleaned.startsWith('224') && cleaned.length > 9) {
    cleaned = cleaned.substring(3);
  }
  return cleaned;
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes normalisées
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // suppression
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Évalue la similitude entre deux noms ou prénoms (0 à 1)
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, (maxLen - dist) / maxLen);
}

/**
 * Détecte si une nouvelle fiche présente une ressemblance avec les fiches existantes
 * @param newFiche La fiche saisie ou en cours de validation
 * @param existingFiches La base des fiches déjà enregistrées
 * @param threshold Seuil de score pour déclencher l'alerte (par défaut 65 sur 100)
 */
export function detectDuplicate(
  newFiche: Partial<FicheIndividuelle>,
  existingFiches: FicheIndividuelle[],
  threshold = 65
): DuplicateDetectionResult {
  let bestScore = 0;
  let bestMatch: FicheIndividuelle | undefined = undefined;
  let bestReasons: string[] = [];

  const newNom = normalizeString(newFiche.nom);
  const newPrenom = normalizeString(newFiche.prenom);
  const newPhone = normalizePhone(newFiche.telephone);
  const newQuartier = newFiche.quartier_id;
  const newAge = Number(newFiche.age);

  for (const existing of existingFiches) {
    // Ne pas se comparer à soi-même
    if (newFiche.id && existing.id === newFiche.id) continue;

    let score = 0;
    const reasons: string[] = [];

    // 1. Similitude Nom & Prénom (Max 45 points)
    const nomSim = stringSimilarity(newNom, existing.nom);
    const prenomSim = stringSimilarity(newPrenom, existing.prenom);
    const nameScore = (nomSim * 0.5 + prenomSim * 0.5) * 45;
    score += nameScore;

    if (nomSim > 0.8 && prenomSim > 0.8) {
      reasons.push(`Nom et prénom quasi identiques (${Math.round(nameScore)}/45)`);
    } else if (nomSim > 0.8) {
      reasons.push(`Même nom de famille (${Math.round(nomSim * 22)}/22)`);
    }

    // 2. Tranche d'âge (Max 20 points)
    const existingAge = Number(existing.age);
    if (!isNaN(newAge) && !isNaN(existingAge) && newAge > 0 && existingAge > 0) {
      const ageDiff = Math.abs(newAge - existingAge);
      if (ageDiff === 0) {
        score += 20;
        reasons.push(`Âge identique (${newAge} ans)`);
      } else if (ageDiff <= 1) {
        score += 15;
        reasons.push(`Âge très proche (${newAge} vs ${existingAge} ans)`);
      } else if (ageDiff <= 2) {
        score += 8;
      }
    }

    // 3. Même quartier (Max 15 points)
    if (newQuartier && existing.quartier_id && newQuartier === existing.quartier_id) {
      score += 15;
      reasons.push(`Même quartier`);
    }

    // 4. Téléphone partagé ou identique (Max 20 points)
    const existPhone = normalizePhone(existing.telephone);
    if (newPhone && existPhone && newPhone === existPhone) {
      score += 20;
      reasons.push(`Même numéro de téléphone (${newFiche.telephone})`);
    }

    const totalScore = Math.round(score);
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = existing;
      bestReasons = reasons;
    }
  }

  const isDuplicate = bestScore >= threshold;
  return {
    isDuplicate,
    score: bestScore,
    candidateFicheId: bestMatch?.id,
    candidateFicheNom: bestMatch ? `${bestMatch.prenom} ${bestMatch.nom}` : undefined,
    reasons: bestReasons,
  };
}
