/**
 * Symtomlistan ur formulär 2.1 (Min panikdagbok).
 *
 * Varje symtom har en stabil nyckel, som sparas i databasen, och bokens exakta svenska
 * etikett, som visas i gränssnittet. Nycklarna får aldrig döpas om, eftersom sparade
 * panikattacker refererar till dem. Etiketterna går däremot bra att ändra.
 */
export const SYMPTOMS = [
  { key: "chest_pain", label: "Bröstsmärtor eller obehag" },
  { key: "sweating", label: "Svettningar" },
  { key: "palpitations", label: "Hjärtklappning/snabba eller bultande hjärtslag" },
  { key: "nausea", label: "Illamående/magbesvär" },
  { key: "shortness_of_breath", label: "Andnöd" },
  { key: "dizziness", label: "Yr/ostadig/vimmelkantig/svimfärdig" },
  { key: "trembling", label: "Skakningar/darrningar" },
  { key: "chills_or_hot_flushes", label: "Frossa eller värmevallningar" },
  { key: "numbness_or_tingling", label: "Domningar eller stickningar" },
  { key: "derealization", label: "Overklighetskänslor" },
  { key: "choking", label: "Kvävningskänsla" },
  { key: "fear_of_dying", label: "Rädsla för att dö" },
  { key: "fear_of_losing_control", label: "Rädsla för att tappa kontrollen/bli galen" },
] as const;

export type SymptomKey = (typeof SYMPTOMS)[number]["key"];

export const SYMPTOM_KEYS: readonly SymptomKey[] = SYMPTOMS.map((s) => s.key);

export function isSymptomKey(value: string): value is SymptomKey {
  return (SYMPTOM_KEYS as readonly string[]).includes(value);
}
