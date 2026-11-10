import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chargerContenu } from '../../scripts/lib/contenu.ts';

const racine = fileURLToPath(new URL('../..', import.meta.url));

describe('contenu du dépôt', () => {
  it('est valide en mode brouillon', async () => {
    const { erreurs } = await chargerContenu(racine);
    expect(erreurs).toEqual([]);
  });

  it('transcrit chaque annexe de désignations en entier', async () => {
    const { contenu } = await chargerContenu(racine);
    const source = contenu.sources.get(contenu.designations?.source_id ?? '');
    expect(source?.annexes.length).toBeGreaterThan(0);
    for (const attendue of source?.annexes ?? []) {
      const annexe = contenu.designations?.annexes.find((a) => a.annexe === attendue.numero);
      expect(annexe?.entrees.length, `annexe ${attendue.numero}`).toBe(attendue.nombre);
    }
  });
});
