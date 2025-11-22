'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { StoryMapPoint } from '@/types/frontend';
import L from 'leaflet';

interface MapViewProps {
    stories: StoryMapPoint[];
    onSelectStory: (story: StoryMapPoint) => void;
}

/**
 * Composant de carte interactive affichant les stories de Paris
 */
export function MapView({ stories, onSelectStory }: MapViewProps) {
    const [isClient, setIsClient] = useState(false);

    // Leaflet ne fonctionne que côté client
    useEffect(() => {
        // Configuration de l'icône UNIQUEMENT côté client
        const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        L.Marker.prototype.options.icon = defaultIcon;
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <p className="text-slate-600">Chargement de la carte...</p>
            </div>
        );
    }

    return (
        <MapContainer
            center={[48.8566, 2.3522]} // Paris
            zoom={12}
            className="w-full h-full"
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stories.map((story) => (
                <Marker
                    key={story.id}
                    position={[story.latitude, story.longitude]}
                >
                    <Popup closeButton={false} autoClose={false}>
                        <div className="p-3 min-w-[200px]">
                            <h3 className="font-bold text-base mb-2">{story.title}</h3>
                            {story.period && (
                                <p className="text-xs text-slate-600 mb-3">📅 {story.period}</p>
                            )}
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    onSelectStory(story);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                                style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                            >
                                <span>Découvrir l&apos;histoire</span>
                                <span>→</span>
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

