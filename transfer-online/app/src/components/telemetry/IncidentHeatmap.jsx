import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle } from 'lucide-react';

// Using simple markers for now as heatmap plugin requires external lib setup
const getIcon = (type) => {
    let color = 'red';
    if (type === 'hard_brake') color = 'red';
    if (type === 'sharp_turn') color = 'orange';
    if (type === 'speeding') color = 'yellow';

    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
};

export default function IncidentHeatmap({ incidents }) {
    if (!incidents || incidents.length === 0) return <div className="text-center p-8 text-gray-500">Nenhum incidente registrado para o mapa de calor</div>;

    const center = [incidents[0].lat, incidents[0].lng];

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-inner border">
            <MapContainer 
                center={center} 
                zoom={11} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                />
                {incidents.map((inc, idx) => (
                    <Marker 
                        key={idx} 
                        position={[inc.lat, inc.lng]} 
                        icon={getIcon(inc.type)}
                    >
                        <Popup>
                            <div className="font-bold capitalize">{inc.type.replace('_', ' ')}</div>
                            <div>{new Date(inc.timestamp).toLocaleString()}</div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            
            <div className="bg-white p-3 flex gap-4 text-xs justify-center border-t">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Frenagem Brusca</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Curva Acentuada</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Excesso de Velocidade</div>
            </div>
        </div>
    );
}