import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Field'
import { Button } from '../ui/Button'
import { useStore } from '../../store/useStore'
import type { BoomCondition, StockBatch } from '../../types'

const CONDITIONS: BoomCondition[] = ['Baik', 'Rusak Ringan', 'Rusak Berat']

function empty(defaultPosId: string, defaultUnitLength: number) {
  return { posId: defaultPosId, label: '', quantityUnits: 1, unitLengthMeters: defaultUnitLength, condition: 'Baik' as BoomCondition, notes: '' }
}

export function StockFormModal({ open, batch, onClose }: { open: boolean; batch?: StockBatch; onClose: () => void }) {
  const db = useStore((s) => s.db)
  const addStockBatch = useStore((s) => s.addStockBatch)
  const updateStockBatch = useStore((s) => s.updateStockBatch)
  const posList = db.locations.filter((l) => l.type === 'pos')

  const [form, setForm] = useState(() => empty(posList[0]?.id ?? '', db.settings.defaultUnitLengthMeters))

  useEffect(() => {
    if (!open) return
    if (batch) {
      setForm({
        posId: batch.posId,
        label: batch.label,
        quantityUnits: batch.quantityUnits,
        unitLengthMeters: batch.unitLengthMeters,
        condition: batch.condition,
        notes: batch.notes ?? '',
      })
    } else {
      setForm(empty(posList[0]?.id ?? '', db.settings.defaultUnitLengthMeters))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, batch?.id])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const canSubmit = form.posId && form.label.trim() && form.quantityUnits > 0 && form.unitLengthMeters > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      posId: form.posId,
      label: form.label.trim(),
      quantityUnits: Number(form.quantityUnits),
      unitLengthMeters: Number(form.unitLengthMeters),
      condition: form.condition,
      notes: form.notes.trim() || undefined,
    }
    if (batch) updateStockBatch(batch.id, payload)
    else addStockBatch(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={batch ? 'Edit Batch Stok' : 'Tambah Batch Stok'}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Floating Storage" required>
          <select className={inputClass} value={form.posId} onChange={(e) => set('posId', e.target.value)}>
            {posList.length === 0 && <option value="">Belum ada Floating Storage, tambahkan terlebih dahulu</option>}
            {posList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Label Batch" required hint="cth. Boom Kuning 15m - Batch A">
          <input className={inputClass} value={form.label} onChange={(e) => set('label', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Jumlah Unit" required>
            <input type="number" min={0} className={inputClass} value={form.quantityUnits} onChange={(e) => set('quantityUnits', Number(e.target.value))} />
          </Field>
          <Field label="Panjang per Unit (m)" required>
            <input type="number" min={0} step="0.5" className={inputClass} value={form.unitLengthMeters} onChange={(e) => set('unitLengthMeters', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Kondisi">
          <select className={inputClass} value={form.condition} onChange={(e) => set('condition', e.target.value as BoomCondition)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Catatan">
          <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {batch ? 'Simpan' : 'Tambah'}
        </Button>
      </div>
    </Modal>
  )
}
