import { LayersControl, TileLayer } from 'react-leaflet'

/** Street vs satellite base layer switcher, shared by every interactive map in the app. */
export function BaseTileLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Peta Jalan (OSM)">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Citra Satelit (Esri)">
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  )
}
