import React, { useState } from 'react';
import {
  MapPin,
  TrainFront,
  Bus,
  Car,
  Footprints,
  Lock,
  Home,
  Plus,
  Trash2,
  BookOpen,
  FileText,
  Camera,
  Mic,
  Newspaper,
  Gift,
  CheckCircle2,
  Link2,
} from 'lucide-react';
import type {
  ArchiveClue,
  OwnedPropertyState,
  PlayerSaveData,
  WorldLocation,
  WorldZoneId,
} from '../game/types';
import {
  ARCHIVE_CLUES,
  BRANCHING_ENDINGS,
  FURNITURE_CATALOG,
  PROPERTY_CATALOG,
  TRANSIT_ROUTES,
  WORLD_LOCATIONS,
} from '../game/worldData';
import { evaluateUnlockedEndings } from '../game/adaptiveDifficulty';

interface WorldMapViewProps {
  save: PlayerSaveData;
  activeLocationId: string;
  onTravelLocation: (loc: WorldLocation) => void;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  save,
  activeLocationId,
  onTravelLocation,
}) => {
  const [filterWorld, setFilterWorld] = useState<'all' | 'city' | 'town'>('all');
  const [selectedLoc, setSelectedLoc] = useState<WorldLocation>(
    WORLD_LOCATIONS.find((l) => l.id === activeLocationId) || WORLD_LOCATIONS[0],
  );
  const [transitBanner, setTransitBanner] = useState<string | null>(null);

  const visibleLocations = WORLD_LOCATIONS.filter(
    (l) => filterWorld === 'all' || l.world === filterWorld,
  );

  const handleBoardTransit = (routeId: string) => {
    const route = TRANSIT_ROUTES.find((r) => r.id === routeId);
    if (!route) return;
    if (save.highestLevelUnlocked < route.unlockedAtLevel) {
      setTransitBanner(`Requires Level ${route.unlockedAtLevel} to unlock ${route.name}.`);
      return;
    }
    setTransitBanner(`${route.name} (${route.durationLabel}): ${route.transitEvent}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
            Hybrid Open World · Seamless &amp; Transit Connected
          </p>
          <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">
            Christmas City &amp; Silent Christmas Town
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded bg-[#140e0f] p-1">
          {(['all', 'city', 'town'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterWorld(f)}
              className={`rounded px-3 py-1.5 text-xs font-semibold capitalize ${
                filterWorld === f ? 'bg-[#8b1a1a] text-white' : 'text-[#a8a29e] hover:text-white'
              }`}
            >
              {f === 'all' ? 'Both Worlds (17)' : f === 'city' ? 'Christmas City' : 'Silent Town'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Interactive Map Canvas */}
        <div className="relative h-96 overflow-hidden rounded-lg border border-[#3f1d1d] bg-[#0a090b] lg:col-span-2">
          {/* Subtle topographic grid + Midnight Train rail line */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full opacity-55">
            <line x1="50" y1="0" x2="50" y2="100" stroke="#3f1d1d" strokeDasharray="2 2" strokeWidth="0.4" />
            <path d="M 14 18 Q 38 38 52 48 T 88 26" fill="none" stroke="#ca8a04" strokeWidth="0.7" strokeDasharray="1.5 1.5" />
            <path d="M 18 32 L 38 38 L 68 44 L 82 48" fill="none" stroke="#8b1a1a" strokeWidth="0.8" />
          </svg>

          <div className="pointer-events-none absolute left-3 top-3 text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e]">
            World A: Christmas City
          </div>
          <div className="pointer-events-none absolute right-3 top-3 text-[11px] font-semibold uppercase tracking-wider text-[#dc2626]">
            World B: Silent Christmas Town
          </div>

          {visibleLocations.map((loc) => {
            const unlocked = save.highestLevelUnlocked >= loc.unlockedAtLevel;
            const isSelected = selectedLoc.id === loc.id;
            const isActive = activeLocationId === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                aria-label={`Select ${loc.name}`}
                onClick={() => setSelectedLoc(loc)}
                style={{ left: `${loc.coordinates.x}%`, top: `${loc.coordinates.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border p-1.5 transition-transform ${
                  isSelected
                    ? 'z-20 scale-125 border-[#ca8a04] bg-[#8b1a1a] text-white'
                    : isActive
                    ? 'z-10 border-[#ca8a04] bg-[#1e1212] text-[#ca8a04]'
                    : unlocked
                    ? 'border-[#3f1d1d] bg-[#140e0f] text-[#e7e5e4] hover:border-[#ca8a04]'
                    : 'border-[#27272a] bg-[#09090b] text-[#52525b]'
                }`}
              >
                {unlocked ? <MapPin className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        {/* Selected District Detail Panel */}
        <div className="flex flex-col justify-between rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-5">
          <div>
            <div className="flex items-center justify-between text-xs text-[#ca8a04]">
              <span className="uppercase tracking-wider">
                {selectedLoc.world === 'city' ? 'Christmas City' : 'Silent Christmas Town'}
              </span>
              <span>Unlocks Lvl {selectedLoc.unlockedAtLevel}</span>
            </div>
            <h3 className="font-display mt-1 text-xl font-bold text-[#e7e5e4]">{selectedLoc.name}</h3>
            <p className="mt-2 text-sm text-[#d6d3d1]">{selectedLoc.description}</p>

            {selectedLoc.npcPresent && (
              <p className="mt-3 text-xs text-[#ca8a04]">
                Present: <span className="text-[#e7e5e4]">{selectedLoc.npcPresent}</span>
              </p>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">Activities &amp; Secrets ({selectedLoc.secretCount})</p>
              <ul className="mt-1.5 space-y-1 text-xs text-[#d6d3d1]">
                {selectedLoc.activities.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            disabled={save.highestLevelUnlocked < selectedLoc.unlockedAtLevel}
            onClick={() => onTravelLocation(selectedLoc)}
            className="mt-5 w-full rounded bg-[#8b1a1a] py-2.5 text-sm font-bold text-white hover:bg-[#a61f1f] disabled:cursor-not-allowed disabled:bg-[#27272a] disabled:text-[#71717a]"
          >
            {save.highestLevelUnlocked >= selectedLoc.unlockedAtLevel
              ? `Travel to ${selectedLoc.name}`
              : `Reach Level ${selectedLoc.unlockedAtLevel} to Unlock`}
          </button>
        </div>
      </div>

      {/* Transit System */}
      <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
        <h3 className="font-display text-lg font-bold text-[#e7e5e4]">
          Hybrid Transit Network (Train, Bus, Car &amp; Footpaths)
        </h3>
        {transitBanner && (
          <p className="mt-3 rounded border border-[#ca8a04]/50 bg-[#18120c] px-3 py-2 text-xs text-[#e7e5e4]">
            {transitBanner}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRANSIT_ROUTES.map((r) => {
            const Icon =
              r.mode === 'train' ? TrainFront : r.mode === 'bus' ? Bus : r.mode === 'car' ? Car : Footprints;
            const unlocked = save.highestLevelUnlocked >= r.unlockedAtLevel;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleBoardTransit(r.id)}
                className="flex flex-col justify-between rounded border border-[#2e2324] bg-[#120e0f] p-3.5 text-left hover:border-[#ca8a04]"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#ca8a04]">
                    <Icon className="h-4 w-4" />
                    <span>{unlocked ? r.durationLabel : `Locked (Lvl ${r.unlockedAtLevel})`}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#e7e5e4]">{r.name}</p>
                  <p className="mt-1 text-xs text-[#a8a29e]">
                    {r.from} &rarr; {r.to}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface HousingViewProps {
  save: PlayerSaveData;
  onUpdateHousing: (coinsDelta: number, nextOwned: OwnedPropertyState[]) => void;
}

export const HousingView: React.FC<HousingViewProps> = ({ save, onUpdateHousing }) => {
  const [selectedPropId, setSelectedPropId] = useState<string>(
    save.ownedProperties[0]?.propertyId || 'prop_studio_avenue',
  );
  const [selectedRoom, setSelectedRoom] = useState<string>('Living Area');
  const [selectedFurnId, setSelectedFurnId] = useState<string>(FURNITURE_CATALOG[0].id);
  const [notice, setNotice] = useState<string | null>(null);

  const ownedEntry = save.ownedProperties.find((p) => p.propertyId === selectedPropId);
  const listing = PROPERTY_CATALOG.find((p) => p.id === selectedPropId) || PROPERTY_CATALOG[0];

  const handleBuyProperty = (propId: string) => {
    const target = PROPERTY_CATALOG.find((p) => p.id === propId);
    if (!target) return;
    if (save.coins < target.price) {
      setNotice(`Insufficient Coins (${target.price} needed). Clear missions to earn more.`);
      return;
    }
    if (save.highestLevelUnlocked < target.unlockedAtLevel) {
      setNotice(`Unlocks at Level ${target.unlockedAtLevel}.`);
      return;
    }
    const created: OwnedPropertyState = {
      propertyId: target.id,
      wallColor: '#1f1616',
      lightingMood: 'warm_candle',
      securityTier: target.securityLevel,
      allowFriends: true,
      furniture: [],
    };
    onUpdateHousing(-target.price, [...save.ownedProperties, created]);
    setSelectedPropId(target.id);
    setSelectedRoom(target.rooms[0]);
    setNotice(`Purchased ${target.name}! You can now build and decorate its rooms.`);
  };

  const updateCurrentOwned = (updater: (cur: OwnedPropertyState) => OwnedPropertyState) => {
    const next = save.ownedProperties.map((p) => (p.propertyId === selectedPropId ? updater(p) : p));
    onUpdateHousing(0, next);
  };

  const handlePlaceGrid = (gx: number, gy: number) => {
    if (!ownedEntry) return;
    const itemDef = FURNITURE_CATALOG.find((f) => f.id === selectedFurnId)!;
    const existing = ownedEntry.furniture.find(
      (f) => f.room === selectedRoom && f.gridX === gx && f.gridY === gy,
    );
    if (existing) {
      updateCurrentOwned((cur) => ({
        ...cur,
        furniture: cur.furniture.filter((f) => f.instanceId !== existing.instanceId),
      }));
    } else {
      updateCurrentOwned((cur) => ({
        ...cur,
        furniture: [
          ...cur.furniture,
          {
            instanceId: `f_${Date.now()}_${gx}_${gy}`,
            itemId: itemDef.id,
            name: itemDef.name,
            room: selectedRoom,
            gridX: gx,
            gridY: gy,
            color: itemDef.defaultColor,
          },
        ],
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
            Housing &amp; Property Ownership · {save.coins} Coins Available
          </p>
          <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">
            Properties, Interior Builder &amp; Multiplayer Invites
          </h2>
        </div>
      </div>

      {notice && (
        <p className="rounded border border-[#ca8a04]/50 bg-[#18120c] px-4 py-2.5 text-xs text-[#e7e5e4]">
          {notice}
        </p>
      )}

      {/* Property Catalog */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROPERTY_CATALOG.map((prop) => {
          const isOwned = save.ownedProperties.some((o) => o.propertyId === prop.id);
          const active = selectedPropId === prop.id;
          return (
            <div
              key={prop.id}
              className={`flex flex-col justify-between rounded-lg border p-4 ${
                active ? 'border-[#ca8a04] bg-[#160f10]' : 'border-[#27272a] bg-[#0e0b0c]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#ca8a04]">
                  <span>{isOwned ? 'Owned' : `${prop.price} Coins`}</span>
                  <span>Sec Tier {prop.securityLevel}</span>
                </div>
                <h3 className="mt-1.5 text-base font-bold text-[#e7e5e4]">{prop.name}</h3>
                <p className="text-xs text-[#a8a29e]">{prop.district}</p>
                <p className="mt-2 text-xs text-[#d6d3d1]">{prop.description}</p>
              </div>
              <div className="mt-4">
                {isOwned ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPropId(prop.id);
                      setSelectedRoom(prop.rooms[0]);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#ca8a04]/60 bg-[#1a1210] py-2 text-xs font-semibold text-[#e7e5e4]"
                  >
                    <Home className="h-3.5 w-3.5 text-[#ca8a04]" />
                    Customize Interior
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuyProperty(prop.id)}
                    className="w-full rounded bg-[#8b1a1a] py-2 text-xs font-bold text-white hover:bg-[#a61f1f]"
                  >
                    Purchase ({prop.price} Coins)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interior Designer Grid */}
      {ownedEntry && (
        <div className="grid gap-5 rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-5 lg:grid-cols-3">
          <div className="space-y-4">
            <h3 className="font-display text-lg font-bold text-[#e7e5e4]">{listing.name} Builder</h3>

            <div>
              <label htmlFor="house-room" className="block text-xs font-medium text-[#d6d3d1]">
                Active Room
              </label>
              <select
                id="house-room"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
              >
                {listing.rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="house-furn" className="block text-xs font-medium text-[#d6d3d1]">
                Furniture / Decor to Place (Click Grid Cell)
              </label>
              <select
                id="house-furn"
                value={selectedFurnId}
                onChange={(e) => setSelectedFurnId(e.target.value)}
                className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
              >
                {FURNITURE_CATALOG.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#d6d3d1]">Lighting &amp; Wall Tone</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['warm_candle', 'amber_lamp', 'crimson_vigil'] as const).map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => updateCurrentOwned((cur) => ({ ...cur, lightingMood: mood }))}
                    className={`rounded border px-2.5 py-1.5 text-xs capitalize ${
                      ownedEntry.lightingMood === mood
                        ? 'border-[#ca8a04] bg-[#241610] text-[#e7e5e4]'
                        : 'border-[#27272a] bg-[#070709] text-[#a8a29e]'
                    }`}
                  >
                    {mood.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#27272a] pt-3">
              <span className="text-xs text-[#d6d3d1]">Allow Friends Inside Property</span>
              <button
                type="button"
                onClick={() => updateCurrentOwned((cur) => ({ ...cur, allowFriends: !cur.allowFriends }))}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  ownedEntry.allowFriends ? 'bg-[#8b1a1a] text-white' : 'bg-[#27272a] text-[#a8a29e]'
                }`}
              >
                {ownedEntry.allowFriends ? 'Friends Allowed' : 'Private Only'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (save.coins >= 150) {
                  onUpdateHousing(
                    -150,
                    save.ownedProperties.map((p) =>
                      p.propertyId === selectedPropId ? { ...p, securityTier: p.securityTier + 1 } : p,
                    ),
                  );
                  setNotice(`Upgraded ${listing.name} security locks & CCTV sensors!`);
                } else {
                  setNotice('Need 150 Coins to upgrade property security.');
                }
              }}
              className="w-full rounded border border-[#ca8a04]/50 bg-[#17120c] py-2 text-xs font-semibold text-[#ca8a04] hover:bg-[#241b10]"
            >
              Upgrade Security Locks (-150 Coins · Tier {ownedEntry.securityTier})
            </button>
          </div>

          {/* 5x4 Floor Plan Grid */}
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between text-xs text-[#a8a29e]">
              <span>Floor Plan: {selectedRoom} (Click empty tile to place, occupied tile to remove)</span>
              <span>{ownedEntry.furniture.filter((f) => f.room === selectedRoom).length} items placed</span>
            </div>
            <div
              className="grid grid-cols-5 gap-2 rounded-lg border border-[#2e2324] p-3"
              style={{
                backgroundColor:
                  ownedEntry.lightingMood === 'crimson_vigil'
                    ? '#160809'
                    : ownedEntry.lightingMood === 'amber_lamp'
                    ? '#17120c'
                    : '#110e0d',
              }}
            >
              {Array.from({ length: 20 }, (_, idx) => {
                const gx = idx % 5;
                const gy = Math.floor(idx / 5);
                const placed = ownedEntry.furniture.find(
                  (f) => f.room === selectedRoom && f.gridX === gx && f.gridY === gy,
                );
                return (
                  <button
                    key={`${gx}_${gy}`}
                    type="button"
                    onClick={() => handlePlaceGrid(gx, gy)}
                    className={`flex h-16 flex-col items-center justify-center rounded border p-1 text-center text-[11px] transition-colors ${
                      placed
                        ? 'border-[#ca8a04] bg-[#211512] text-[#e7e5e4]'
                        : 'border-[#27272a] bg-[#09090b]/70 text-[#52525b] hover:border-[#8b1a1a] hover:text-[#d6d3d1]'
                    }`}
                  >
                    {placed ? (
                      <>
                        <Trash2 className="mb-0.5 h-3.5 w-3.5 text-[#dc2626]" />
                        <span className="line-clamp-1 font-medium">{placed.name}</span>
                      </>
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ArchivesViewProps {
  save: PlayerSaveData;
  onPlayRecordingTone: () => void;
  onConnectCluesHint: (clueA: string, clueB: string) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({
  save,
  onPlayRecordingTone,
  onConnectCluesHint,
}) => {
  const [catFilter, setCatFilter] = useState<'all' | ArchiveClue['category']>('all');
  const [districtFilter, setDistrictFilter] = useState<'all' | WorldZoneId>('all');
  const [inspectedClue, setInspectedClue] = useState<ArchiveClue>(ARCHIVE_CLUES[0]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [reconstructionNote, setReconstructionNote] = useState<string | null>(null);

  const unlockedEndings = evaluateUnlockedEndings(save);
  const filteredClues = ARCHIVE_CLUES.filter((c) => {
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    if (districtFilter !== 'all' && c.district !== districtFilter) return false;
    return true;
  });

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-1), id];
      if (next.length === 2) {
        const a = ARCHIVE_CLUES.find((c) => c.id === next[0]);
        const b = ARCHIVE_CLUES.find((c) => c.id === next[1]);
        if (a && b) {
          setReconstructionNote(
            `Lore Link Established (${a.title} + ${b.title}): Both evidence trails point to ${a.connectedCharacter} and ${b.connectedCharacter} inside the 1974 Silent Town pact. Check Ward 4 & the Underground Hatch at 3:17 AM.`,
          );
          onConnectCluesHint(a.id, b.id);
        }
      }
      return next;
    });
  };

  const categoryIcon = (cat: ArchiveClue['category']) => {
    switch (cat) {
      case 'newspaper':
        return Newspaper;
      case 'photograph':
        return Camera;
      case 'recording':
        return Mic;
      case 'gift':
        return Gift;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
            The Christmas Archives · {save.unlockedClues.length} / {ARCHIVE_CLUES.length} Core Evidence Recovered
          </p>
          <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">
            Investigation Board &amp; Branching Endings
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter archive by category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as 'all' | ArchiveClue['category'])}
            className="rounded border border-[#2e2324] bg-[#0e0b0c] px-3 py-1.5 text-xs text-[#e7e5e4]"
          >
            <option value="all">All Formats</option>
            <option value="letter">Letters</option>
            <option value="photograph">Photographs</option>
            <option value="recording">Recordings</option>
            <option value="newspaper">Newspapers</option>
            <option value="gift">Impossible Gifts</option>
          </select>

          <select
            aria-label="Filter archive by district"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value as 'all' | WorldZoneId)}
            className="rounded border border-[#2e2324] bg-[#0e0b0c] px-3 py-1.5 text-xs text-[#e7e5e4]"
          >
            <option value="all">All Districts</option>
            <option value="christmas_estate">Christmas Estate</option>
            <option value="silent_town">Silent Town</option>
            <option value="abandoned_hospital">Northside / Abandoned Hospital</option>
          </select>
        </div>
      </div>

      {reconstructionNote && (
        <div className="rounded border border-[#ca8a04] bg-[#17120c] p-4 text-xs text-[#e7e5e4]">
          <strong className="text-[#ca8a04]">Backstory Reconstruction Unlocked:</strong> {reconstructionNote}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {filteredClues.map((clue) => {
            const collected = save.unlockedClues.includes(clue.id);
            const Icon = categoryIcon(clue.category);
            const pinned = pinnedIds.includes(clue.id);
            return (
              <div
                key={clue.id}
                className={`flex flex-col justify-between rounded-lg border p-4 ${
                  inspectedClue.id === clue.id
                    ? 'border-[#ca8a04] bg-[#160f10]'
                    : collected
                    ? 'border-[#3f1d1d] bg-[#0e0b0c]'
                    : 'border-[#1f1f23] bg-[#09090b] opacity-65'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#ca8a04]">
                    <span className="inline-flex items-center gap-1.5 uppercase">
                      <Icon className="h-3.5 w-3.5" />
                      {clue.category}
                    </span>
                    <span>{collected ? 'Collected' : `Found in Level ${clue.unlockedAtLevel}`}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#e7e5e4]">{clue.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[#a8a29e]">
                    {collected ? clue.excerpt : 'Continue exploring this district to recover this evidence item.'}
                  </p>
                </div>

                {collected && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectedClue(clue)}
                      className="flex-1 rounded bg-[#1c1415] py-1.5 text-xs font-semibold text-[#e7e5e4] hover:bg-[#8b1a1a]"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePin(clue.id)}
                      className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs ${
                        pinned
                          ? 'border-[#ca8a04] bg-[#241a0d] text-[#ca8a04]'
                          : 'border-[#27272a] text-[#a8a29e] hover:text-white'
                      }`}
                    >
                      <Link2 className="h-3 w-3" />
                      {pinned ? 'Pinned' : 'Connect'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed Inspector */}
        <div className="rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#ca8a04]">
            <BookOpen className="h-4 w-4" />
            <span>Evidence Inspector</span>
          </div>
          {save.unlockedClues.includes(inspectedClue.id) ? (
            <>
              <h3 className="font-display mt-2 text-xl font-bold text-[#e7e5e4]">{inspectedClue.title}</h3>
              <p className="mt-1 text-xs text-[#a8a29e]">
                Subject: {inspectedClue.connectedCharacter} · District: {inspectedClue.district.replace('_', ' ')}
              </p>
              <div className="mt-4 rounded border border-[#2e2324] bg-[#070709] p-4 text-sm leading-relaxed text-[#e7e5e4]">
                {inspectedClue.excerpt}
              </div>
              {inspectedClue.category === 'recording' && (
                <button
                  type="button"
                  onClick={onPlayRecordingTone}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded bg-[#8b1a1a] py-2 text-xs font-semibold text-white hover:bg-[#a61f1f]"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Play Recovered Audio Tape
                </button>
              )}
              <p className="mt-4 text-xs text-[#a8a29e]">
                Tip: Click &ldquo;Connect&rdquo; on two collected items to cross-reference Baby Nicholas&apos;s backstory and reveal hidden investigation hints.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-[#a8a29e]">
              Select any collected archive item to inspect its full transcript, photograph notes, or audio log.
            </p>
          )}
        </div>
      </div>

      {/* Branching Story Endings Collection */}
      <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
        <h3 className="font-display text-lg font-bold text-[#e7e5e4]">
          Branching Story Endings ({unlockedEndings.length} / {BRANCHING_ENDINGS.length} Unlocked)
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHING_ENDINGS.map((end) => {
            const isUnlocked = unlockedEndings.some((u) => u.id === end.id);
            return (
              <div
                key={end.id}
                className={`rounded border p-4 ${
                  isUnlocked ? 'border-[#ca8a04] bg-[#16120c]' : 'border-[#27272a] bg-[#09090b]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#ca8a04]">{end.category}</span>
                  {isUnlocked ? (
                    <CheckCircle2 className="h-4 w-4 text-[#ca8a04]" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-[#52525b]" />
                  )}
                </div>
                <h4 className="mt-1.5 text-sm font-bold text-[#e7e5e4]">{end.title}</h4>
                <p className="mt-1 text-xs text-[#d6d3d1]">
                  {isUnlocked ? end.description : end.requirementsSummary}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
