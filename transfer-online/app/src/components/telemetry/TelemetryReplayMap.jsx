import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import L from 'leaflet';

// Car icon for replay
const carIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

export default function TelemetryReplayMap({ events }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [speed, setSpeed] = useState(1); // 1x, 2x, 4x
    const requestRef = useRef();
    const startTimeRef = useRef();
    
    // Filter only location-relevant events and sort
    const locationEvents = events
        .filter(e => e.latitude && e.longitude && e.timestamp)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (locationEvents.length < 2) return <div className="p-4 text-center text-gray-500">Dados insuficientes para replay</div>;

    const startTimestamp = new Date(locationEvents[0].timestamp).getTime();
    const endTimestamp = new Date(locationEvents[locationEvents.length - 1].timestamp).getTime();
    const totalDuration = endTimestamp - startTimestamp;

    // Current position calculation
    const currentTimestamp = startTimestamp + (progress / 100) * totalDuration;
    
    // Find active segment
    const currentIndex = locationEvents.findIndex(e => new Date(e.timestamp).getTime() >= currentTimestamp);
    const prevEvent = locationEvents[Math.max(0, currentIndex - 1)];
    const nextEvent = locationEvents[currentIndex] || locationEvents[locationEvents.length - 1];

    // Interpolate position
    const getInterpolatedPosition = () => {
        if (!prevEvent || !nextEvent || prevEvent === nextEvent) return [prevEvent.latitude, prevEvent.longitude];
        
        const t1 = new Date(prevEvent.timestamp).getTime();
        const t2 = new Date(nextEvent.timestamp).getTime();
        const ratio = (currentTimestamp - t1) / (t2 - t1);
        
        const lat = prevEvent.latitude + (nextEvent.latitude - prevEvent.latitude) * ratio;
        const lng = prevEvent.longitude + (nextEvent.longitude - prevEvent.longitude) * ratio;
        
        return [lat, lng];
    };

    const currentPos = getInterpolatedPosition();

    const animate = (time) => {
        if (startTimeRef.current === undefined) startTimeRef.current = time;
        
        // Advance progress based on real time * speed
        // Let's say whole trip takes 10 seconds to replay at 1x
        // totalDuration (real) -> 10s (replay)
        // factor = totalDuration / 10000
        
        setProgress(prev => {
            const newProgress = prev + (0.1 * speed); // Arbitrary increment
            if (newProgress >= 100) {
                setIsPlaying(false);
                return 100;
            }
            return newProgress;
        });

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
            startTimeRef.current = undefined;
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, speed]);

    const handleSliderChange = (value) => {
        setProgress(value[0]);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 relative min-h-[400px]">
                <MapContainer 
                    center={[locationEvents[0].latitude, locationEvents[0].longitude]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Polyline 
                        positions={locationEvents.map(e => [e.latitude, e.longitude])}
                        color="blue"
                        opacity={0.4}
                    />
                    {/* Path driven so far */}
                    <Polyline 
                        positions={locationEvents
                            .filter(e => new Date(e.timestamp).getTime() <= currentTimestamp)
                            .map(e => [e.latitude, e.longitude])}
                        color="blue"
                        weight={4}
                    />
                    <Marker position={currentPos} icon={carIcon}>
                        <Popup>
                            Velocidade Atual: {prevEvent.speed} km/h<br/>
                            Hora: {new Date(currentTimestamp).toLocaleTimeString()}
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>
            
            <div className="bg-white p-4 border-t space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{new Date(startTimestamp).toLocaleTimeString()}</span>
                    <span className="font-mono font-bold text-blue-600">{new Date(currentTimestamp).toLocaleTimeString()}</span>
                    <span>{new Date(endTimestamp).toLocaleTimeString()}</span>
                </div>
                
                <Slider 
                    value={[progress]} 
                    max={100} 
                    step={0.1} 
                    onValueChange={handleSliderChange}
                    className="cursor-pointer"
                />

                <div className="flex justify-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => setProgress(0)}>
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant={isPlaying ? "destructive" : "default"} 
                        size="icon" 
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}
                    >
                        {speed}x
                    </Button>
                </div>
            </div>
        </div>
    );
}