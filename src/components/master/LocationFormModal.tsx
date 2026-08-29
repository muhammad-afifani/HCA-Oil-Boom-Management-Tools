import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Field'
import { Button } from '../ui/Button'
import { useStore } from '../../store/useStore'
import { LocationMapPicker } from './LocationMapPicker'
import type { LocationType, MapLocation } from '../../types'

const SITE_TYPES: { value: LocationType; label: string }[] = [
  { value: 'sumur', label: 'Sumur' },
  { value: 'platform', label: 'Platform' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'lainnya', label: 'Lainnya' },
]

function empty(defaultType: LocationType, lat: number, lng: number) {
  return { name: '', code: '', type: defaultType, area: '', lat, lng, description: '' }
}

export function LocationFormModal({
  open,
  kind,
  location,
  onClose,
  onCreated,
}: {
  open: boolean
  kind: 'pos' | 'site'
  location?: MapLocation
  onClose: () => void
  /** Called with the new location's ID right after a successful create (not on edit). */
  onCreated?: (id: string) => void
}) {
  const db = useStore((s) => s.db)
  const addLocation = useStore((s) => s.addLocation)
  const updateLocation = useStore((s) => s.updateLocation)

  const [form, setForm] = useState(() => empty(kind === 'pos' ? 'pos' : 'sumur', db.settings.centerLat, db.settings.centerLng))

  useEffect(() => {
    if (!open) return
    if (location) {
      setForm({
        name: location.name,
        code: location.code ?? '',
        type: location.type,
        area: location.area ?? '',
        lat: location.lat,
        lng: location.lng,
        description: location.description ?? '',
      })
    } else {
      setForm(empty(kind === 'pos' ? 'pos' : 'sumur', db.settings.centerLat, db.settings.centerLng))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location?.id, kind])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const contextLocations = useMemo(
    () => db.locations.filter((l) => l.id !== location?.id),
    [db.locations, location?.id],
  )

  const canSubmit = form.name.trim() && Number.isFinite(form.lat) && Number.isFinite(form.lng)

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      type: form.type,
      area: form.area.trim() || undefined,
      lat: Number(form.lat),
      lng: Number(form.lng),
      description: form.description.trim() || undefined,
    }
    if (location) {
      updateLocation(location.id, payload)
    } else {
      const newId = addLocation(payload)
      onCreated?.(newId)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location ? `Edit ${kind === 'pos' ? 'Pos' : 'Lokasi Kerja'}` : kind === 'pos' ? 'Tambah Pos Penyimpanan' : 'Tambah Lokasi Kerja'}
      wide
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Nama" required>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={kind === 'pos' ? 'cth. Pos Delta Utara' : 'cth. Sumur MHK-101'} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kode">
              <input className={inputClass} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="cth. POS-01" />
            </Field>
            {kind === 'site' ? (
              <Field label="Tipe">
                <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value as LocationType)}>
                  {SITE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Area / Sub-wilayah">
                <input className={inputClass} value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="cth. Delta Utara" />
              </Field>
            )}
          </div>
          {kind === 'site' && (
            <Field label="Area / Sub-wilayah">
              <input className={inputClass} value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="cth. Delta Utara" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude" required hint="cth. -0.8414299">
              <input type="number" step="any" className={inputClass} value={form.lat} onChange={(e) => set('lat', Number(e.target.value))} />
            </Field>
            <Field label="Longitude" required hint="cth. 117.2783195">
              <input type="number" step="any" className={inputClass} value={form.lng} onChange={(e) => set('lng', Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Deskripsi">
            <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>

        <div>
          <Field label="Pilih Titik di Peta">
            <LocationMapPicker
              lat={form.lat}
              lng={form.lng}
              onChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
              contextLocations={contextLocations}
              height={340}
            />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose}>Batal</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {location ? 'Simpan' : 'Tambah'}
        </Button>
      </div>
    </Modal>
  )
}
