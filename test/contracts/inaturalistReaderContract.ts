import { InaturalistReader } from '../../core/ports';

export function inaturalistReaderContract(
  adapterName: string,
  createReader: () => Promise<InaturalistReader> | InaturalistReader,
): void {
  describe(`${adapterName} iNaturalist reader contract`, () => {
    it('separates member-visible records from officer audit reads', async () => {
      const reader = await createReader();

      await expect(reader.listObservations(false)).resolves.toEqual([
        expect.objectContaining({ id: '1001', data: expect.objectContaining({ visible: true }) }),
      ]);
      await expect(reader.listObservations(true)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '1001' }),
          expect.objectContaining({ id: '1002' }),
        ]),
      );
      await expect(reader.getObservation(1002)).resolves.toEqual(
        expect.objectContaining({ id: '1002', data: expect.objectContaining({ visible: false }) }),
      );
      await expect(reader.listCatalog(false)).resolves.toEqual([
        expect.objectContaining({ id: '2001', data: expect.objectContaining({ visible: true }) }),
      ]);
      await expect(reader.listCatalog(true)).resolves.toHaveLength(2);
      await expect(reader.getCatalog(9999)).resolves.toBeUndefined();
      await expect(reader.getStatus()).resolves.toEqual(
        expect.objectContaining({
          id: 'inaturalist',
          data: expect.objectContaining({ running: false }),
        }),
      );
    });
  });
}
