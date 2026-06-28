'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Tooltip,
    ZoomControl,
    useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L, { type DivIcon } from 'leaflet';
import type { StoryMapPoint, Lang } from '@/types/frontend';
import 'leaflet/dist/leaflet.css';


interface MapViewProps {
    stories: StoryMapPoint[];
    onSelectStory: (story: StoryMapPoint) => void;
    focusedStory?: StoryMapPoint | null;
    hoveredId?: string | null;
    fitTo?: StoryMapPoint[] | null;
    lang?: Lang;
}

/** Titre selon la langue (repli FR si pas de traduction). */
function pickTitle(s: { title: string; titleEn?: string | null }, lang?: Lang) {
    return lang === 'en' && s.titleEn ? s.titleEn : s.title;
}

/**
 * Recentre la carte en douceur sur l'histoire sélectionnée.
 */
function MapController({ focused }: { focused?: StoryMapPoint | null }) {
    const map = useMap();
    useEffect(() => {
        if (focused) {
            map.flyTo([focused.latitude, focused.longitude], 14, { duration: 1.2 });
        }
    }, [focused, map]);
    return null;
}

/**
 * Déplace/dézoome la carte pour cadrer les résultats de recherche
 * (ex. taper « Lyon » amène la carte sur les événements lyonnais).
 */
function FitController({ points }: { points?: StoryMapPoint[] | null }) {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length === 0) return;
        if (points.length === 1) {
            map.flyTo([points[0].latitude, points[0].longitude], 13, { duration: 1 });
        } else {
            const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
            map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 13, duration: 1 });
        }
    }, [points, map]);
    return null;
}

/**
 * Pastille de regroupement (cluster) affichant le nombre de pins.
 */
function createClusterIcon(cluster: { getChildCount: () => number }): DivIcon {
    const count = cluster.getChildCount();
    const size = count < 10 ? 38 : count < 50 ? 46 : 54;
    return L.divIcon({
        html: `<div class="story-cluster"><span>${count}</span></div>`,
        className: 'story-cluster-wrapper',
        iconSize: L.point(size, size, true),
    });
}

/**
 * Carte interactive : histoires de France, regroupées en clusters au dézoom.
 */
export function MapView({ stories, onSelectStory, focusedStory, hoveredId, fitTo, lang }: MapViewProps) {
    const icons = useMemo(() => {
        const opts = {
            html: '<span class="story-pin"></span>',
            iconSize: [30, 30] as [number, number],
            iconAnchor: [15, 30] as [number, number],
            popupAnchor: [0, -28] as [number, number],
        };
        return {
            base: L.divIcon({ className: 'story-pin-wrapper', ...opts }),
            blink: L.divIcon({ className: 'story-pin-wrapper story-pin--blink', ...opts }),
        };
    }, []);

    // Contourne un bug de react-leaflet-cluster : les marqueurs ne sont pas
    // toujours ajoutés au tout premier montage (double-montage StrictMode).
    // On force un ré-ajout propre juste après l'initialisation de la carte.
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setReady(true), 60);
        return () => clearTimeout(t);
    }, []);

    return (
        <MapContainer
            center={[46.6, 2.3]} // France (centre)
            zoom={6}
            minZoom={4}
            zoomControl={false}
            className="w-full h-full"
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
            />

            <ZoomControl position="bottomright" />
            <MapController focused={focusedStory} />
            <FitController points={fitTo} />

            <MarkerClusterGroup
                key={`mcg-${ready}-${stories.length}`}
                iconCreateFunction={createClusterIcon}
                showCoverageOnHover={false}
                maxClusterRadius={45}
                spiderfyOnMaxZoom
                removeOutsideVisibleBounds={false}
            >
                {stories.map((story) => (
                    <Marker
                        key={story.id}
                        position={[story.latitude, story.longitude]}
                        icon={hoveredId === story.id ? icons.blink : icons.base}
                        zIndexOffset={hoveredId === story.id ? 1000 : 0}
                    >
                        <Tooltip direction="top" offset={[0, -30]} opacity={1} className="story-tooltip">
                            <span className="story-tooltip__title">{pickTitle(story, lang)}</span>
                            {story.period && (
                                <span className="story-tooltip__period"> · {story.period}</span>
                            )}
                        </Tooltip>
                        <Popup closeButton autoClose={false}>
                            <div className="story-popup">
                                {story.period && (
                                    <p className="story-popup__period">{story.period}</p>
                                )}
                                <h3 className="story-popup__title">{pickTitle(story, lang)}</h3>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onSelectStory(story);
                                    }}
                                    className="story-popup__btn"
                                >
                                    {lang === 'en' ? 'Read the story' : "Lire l'histoire"}
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
