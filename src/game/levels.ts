import type { LevelDefinition, WorldZoneId } from './types';

export const CHAPTER_TITLES: readonly string[] = [
  'The Strange Babysitting Job',
  "The Baby's Secrets",
  'The Christmas House',
  "Santa's Arrival",
  'The Forgotten Christmas Village',
  'The Hidden Basement',
  'The Missing Children Mystery',
  'The Christmas Curse',
  'The Final Investigation',
  'The Last Christmas',
];

const CHAPTER_DISTRICTS: readonly WorldZoneId[] = [
  'christmas_estate',
  'christmas_estate',
  'christmas_estate',
  'christmas_city',
  'silent_town',
  'underground',
  'abandoned_hospital',
  'frozen_woods',
  'santas_territory',
  'christmas_estate',
];

const LEVEL_1_TO_10: Array<{
  title: string;
  summary: string;
  variant: string;
  objectives: Array<{ id: string; label: string; interactTarget: string }>;
  supernaturalEvent: string;
  rule317Event: string;
  rewardUnlock?: string;
}> = [
  {
    title: 'The Invitation',
    summary: 'Arrive at the Blackwood Christmas Estate, read the parents’ emergency note, prepare warm milk for Baby Nicholas, and check the nursery crib.',
    variant: 'Estate Foyer · Snowfall Outside',
    objectives: [
      { id: 'obj_note', label: 'Read the parents’ instructions on the parlor desk', interactTarget: 'note_desk' },
      { id: 'obj_milk', label: 'Prepare warm milk in the kitchen', interactTarget: 'kitchen_bottle' },
      { id: 'obj_crib', label: 'Check on Baby Nicholas in the nursery', interactTarget: 'baby_crib' },
    ],
    supernaturalEvent: 'Front porch lanterns flicker crimson as the parents’ car vanishes into the fog.',
    rule317Event: 'At 3:17, the nursery music box starts playing backward on its own.',
    rewardUnlock: 'Outfits: Classic Nanny Coat',
  },
  {
    title: 'The Christmas House',
    summary: 'Explore the ground floor of the mansion, inspect the grand Christmas tree, and lock the winter shutters before midnight.',
    variant: 'Grand Hall · Towering Gothic Tree',
    objectives: [
      { id: 'obj_tree', label: 'Inspect the ornaments on the grand Christmas tree', interactTarget: 'christmas_tree' },
      { id: 'obj_door', label: 'Verify the estate front bolt lock', interactTarget: 'front_door' },
      { id: 'obj_crib', label: 'Soothe Baby Nicholas without meeting his eyes', interactTarget: 'baby_crib' },
    ],
    supernaturalEvent: 'Ornaments turn slowly toward the nanny whenever your back is turned.',
    rule317Event: 'At 3:17, frost blooms across every interior windowpane in handprint patterns.',
  },
  {
    title: 'The Missing Toy',
    summary: 'Baby Nicholas refuses to sleep without his wooden nutcracker, which keeps vanishing from room to room.',
    variant: 'Dim Corridor · Moving Props',
    objectives: [
      { id: 'obj_toy', label: 'Locate the missing nutcracker toy near the hearth', interactTarget: 'impossible_gift' },
      { id: 'obj_milk', label: 'Check the kitchen refrigerator for souring signs', interactTarget: 'kitchen_bottle' },
      { id: 'obj_crib', label: 'Return the toy to the nursery crib', interactTarget: 'baby_crib' },
    ],
    supernaturalEvent: 'Footsteps patter behind you in empty hallways before stopping abruptly.',
    rule317Event: 'At 3:17, every toy soldier in the hall pivots toward the basement door.',
  },
  {
    title: 'Someone Is Watching',
    summary: 'Check the estate CCTV security terminal after motion alerts trigger outside the porch and inside the nursery.',
    variant: 'Security Study · Flickering Monitors',
    objectives: [
      { id: 'obj_cam', label: 'Inspect the live CCTV observation terminal', interactTarget: 'security_monitor' },
      { id: 'obj_note', label: 'Cross-check Mrs. Evelyn’s warning letter', interactTarget: 'note_desk' },
      { id: 'obj_door', label: 'Inspect the frost-covered estate door', interactTarget: 'front_door' },
    ],
    supernaturalEvent: 'Camera 02 briefly captures a tall red-coated silhouette standing behind the pine trees.',
    rule317Event: 'At 3:17, all four security feeds display Baby Nicholas staring straight at the lens.',
    rewardUnlock: 'Tool: Security Feed Replay',
  },
  {
    title: 'The First Gift',
    summary: 'An unmarked black-and-gold parcel appears beneath the Christmas tree—an Impossible Gift addressed to the nanny.',
    variant: 'Living Room · Crimson Tree Glow',
    objectives: [
      { id: 'obj_gift', label: 'Open the Impossible Gift beneath the tree', interactTarget: 'impossible_gift' },
      { id: 'obj_tree', label: 'Inspect the blood-red star atop the tree', interactTarget: 'christmas_tree' },
      { id: 'obj_crib', label: 'Verify Baby Nicholas is still inside his crib', interactTarget: 'baby_crib' },
    ],
    supernaturalEvent: 'Whispered carols echo from inside the chimney flue.',
    rule317Event: 'At 3:17, a second wrapped box materializes inside the locked pantry.',
  },
  {
    title: 'The Locked Room',
    summary: 'Uncover the brass key to Mr. Daniel’s sealed study—the room the parents strictly forbade you from entering.',
    variant: 'Upper Wing · Sealed Study Threshold',
    objectives: [
      { id: 'obj_note', label: 'Search the parlor ledger for the study code', interactTarget: 'note_desk' },
      { id: 'obj_cam', label: 'Review the last footage of Mr. Daniel', interactTarget: 'security_monitor' },
      { id: 'obj_gift', label: 'Retrieve the sealed key box', interactTarget: 'impossible_gift' },
    ],
    supernaturalEvent: 'Knocking erupts from the inside of a closet no one could enter.',
    rule317Event: 'At 3:17, the study doorknob rattles violently for seven seconds.',
    rewardUnlock: 'District Route: Christmas City Bus',
  },
  {
    title: 'The Christmas Song',
    summary: 'Follow a distorted vinyl carol echoing through the mansion vents and cut the power before Baby Nicholas enters his Supernatural state.',
    variant: 'Blackout Warning · Acoustic Horror',
    objectives: [
      { id: 'obj_tree', label: 'Silence the music box near the Christmas tree', interactTarget: 'christmas_tree' },
      { id: 'obj_milk', label: 'Calm the nursery with warm milk', interactTarget: 'kitchen_bottle' },
      { id: 'obj_cam', label: 'Check audio spikes on the security console', interactTarget: 'security_monitor' },
    ],
    supernaturalEvent: 'The estate lights dim to blood-crimson as the gramophone speeds up.',
    rule317Event: 'At 3:17, a choir of Silent Children hums from outside the courtyard.',
  },
  {
    title: 'The Empty Bedroom',
    summary: 'You return to the nursery to find the crib empty, the window unlatched, and miniature footprints leading into the foyer.',
    variant: 'Living House Shift · Rearranged Furniture',
    objectives: [
      { id: 'obj_crib', label: 'Examine the empty nursery crib', interactTarget: 'baby_crib' },
      { id: 'obj_cam', label: 'Track Nicholas on the security monitors', interactTarget: 'security_monitor' },
      { id: 'obj_door', label: 'Check the snow outside the porch door', interactTarget: 'front_door' },
    ],
    supernaturalEvent: 'Chairs and tables shift position whenever you leave a room.',
    rule317Event: 'At 3:17, Nicholas giggles from behind the grandfather clock.',
  },
  {
    title: "Santa's Footprints",
    summary: 'Heavy, ash-stained boot prints appear on the snowy porch steps leading straight toward the living room fireplace.',
    variant: 'Courtyard & Hearth · Ash Trails',
    objectives: [
      { id: 'obj_door', label: 'Inspect the giant boot prints by the front door', interactTarget: 'front_door' },
      { id: 'obj_gift', label: 'Collect the charred sleigh bell near the tree', interactTarget: 'impossible_gift' },
      { id: 'obj_note', label: 'Record the discovery in the nanny log', interactTarget: 'note_desk' },
    ],
    supernaturalEvent: 'Sleigh bells jingle directly overhead on the roof slate.',
    rule317Event: 'At 3:17, soot falls down the chimney and spells a warning on the hearth.',
  },
  {
    title: 'The Midnight Visitor',
    summary: 'Survive the climax of Chapter 1 as power fails across the estate, Evil Santa peers through the storm windows, and Baby Nicholas awakens.',
    variant: 'Chapter 1 Climax · Crimson Blackout',
    objectives: [
      { id: 'obj_cam', label: 'Spot the Midnight Visitor on the porch monitor', interactTarget: 'security_monitor' },
      { id: 'obj_crib', label: 'Keep Nicholas contained until dawn without meeting his Devil Gaze', interactTarget: 'baby_crib' },
      { id: 'obj_door', label: 'Seal the estate ward at the main entrance', interactTarget: 'front_door' },
    ],
    supernaturalEvent: 'Both Baby Nicholas and Santa Claus stalk the perimeter simultaneously.',
    rule317Event: 'At 3:17, the front bell chimes thrice and all locks briefly unlatch.',
    rewardUnlock: 'Chapter 2 Unlocked · Midnight Train Pass',
  },
];

const CHAPTER_TEMPLATES: Array<{
  titles: string[];
  events: string[];
  rule317: string[];
}> = [
  { titles: [], events: [], rule317: [] }, // Chapter 1 handled above
  {
    titles: [
      'The Whispering Rattle', 'Torn Family Portrait', 'The Kitchen Freezer', 'Crimson Lullaby', 'The Attic Ladder',
      'Cold Nursery Floor', 'Shadow Under the Crib', 'Silver Spoon Omen', 'Unopened Telegram', 'The Second Awakening',
    ],
    events: [
      'Family portraits blink slowly when illuminated by the flashlight.',
      'Baby Nicholas crawls along ceilings in peripheral shadows.',
      'Refrigerator frost whispers Mr. Daniel’s initials.',
    ],
    rule317: [
      'At 3:17, every mirror in the mansion mists over with tiny handprints.',
      'At 3:17, the nursery crib rotates to face the hallway door.',
    ],
  },
  {
    titles: [
      'The Shifting Corridor', 'Mrs. Evelyn’s Knock', 'Broken Clockwork', 'The Living Room Hearth', 'Wreath of Thorns',
      'Secret Passage Behind Books', 'The Porcelain Angel', 'Snowed-In Windows', 'Dining Hall Vigil', 'Heart of the Estate',
    ],
    events: [
      'The Living House alters hallway doors behind you.',
      'Mrs. Evelyn calls on the rotary phone from across the street.',
    ],
    rule317: [
      'At 3:17, the grand staircase lengthens and candles ignite on their own.',
      'At 3:17, red ornaments shatter simultaneously across the parlor.',
    ],
  },
  {
    titles: [
      'Grand Station Static', 'The Midnight Train Whistle', 'Winter Mall Blackout', 'Avenue Shopfront Reflections', 'Northside Dispatch',
      'Rooftop Sleigh Marks', 'The Crimson Coat', 'City Park Snowman', 'The Golden Heights Key', 'Santa Walks Christmas Avenue',
    ],
    events: [
      'Streetlamps along Christmas Avenue flicker red as Santa passes.',
      'Shop mannequins turn their heads toward the nanny.',
    ],
    rule317: [
      'At 3:17, the Midnight Train halts outside Christmas City without passengers.',
      'At 3:17, car radios broadcast an old 1974 Christmas Eve recording.',
    ],
  },
  {
    titles: [
      'Arrival at Silent Town', 'The Frozen Fountain', 'Forgotten Nursery Gate', 'Abandoned School Bells', 'Silent Church Pews',
      'Old Hotel Registry', 'Frostbitten Mailbox', 'The Town Square Tree', 'Lanterns in the Mist', 'The Keeper’s Warning',
    ],
    events: [
      'The Silent Children appear along snowbanks pointing toward the schoolhouse.',
      'Church bells ring backward without wind.',
    ],
    rule317: [
      'At 3:17, street signs in Silent Town rewrite themselves.',
      'At 3:17, footprints circle the town square fountain.',
    ],
  },
  {
    titles: [
      'Hatch Beneath the Pantry', 'Coal Chute Descent', 'The Boiler Room Ledger', 'Sealed Vault Door', 'Rusting Toy Press',
      'Mr. Daniel’s Workbench', 'Flooded Wine Cellar', 'Carved Pillar Symbols', 'The Ash Furnace', 'Echoes Below the Estate',
    ],
    events: [
      'Steam pipes hiss in rhythmic breathing patterns.',
      'Red tally marks cover the cellar stonework.',
    ],
    rule317: [
      'At 3:17, cellar doors slam shut unless propped with iron.',
      'At 3:17, Baby Nicholas’s laughter echoes from beneath the floorboards.',
    ],
  },
  {
    titles: [
      'Ward 4 Admission Log', 'The Pediatric Wing', 'Flickering X-Ray Room', 'Missing Birth Records', 'Nurse Clara’s Tape',
      'The Frozen Waiting Room', 'Seven Empty Cots', 'Silent Children’s Choir', 'The Quarantine Stairwell', 'Truth in Ward Zero',
    ],
    events: [
      'Hospital intercoms announce names from decades ago.',
      'Wheelchairs roll across frosted linoleum corridors.',
    ],
    rule317: [
      'At 3:17, patient monitors flatline in unison across the abandoned wing.',
      'At 3:17, blood-red emergency lights bathe the surgical theater.',
    ],
  },
  {
    titles: [
      'Into the Frozen Woods', 'Lantern Trail Markers', 'The Frozen Lake Crack', 'Pine Grove Shrine', 'Whispering Snowdrifts',
      'The Ice-Locked Cabin', 'Ritual Wreath Altar', 'Crimson Snowfall', 'The Keeper’s Bargain', 'Breaking the First Seal',
    ],
    events: [
      'Blizzard winds carry distorted sleigh bells from all directions.',
      'Dark shapes watch from behind snow-laden evergreens.',
    ],
    rule317: [
      'At 3:17, snow begins falling upward toward the canopy.',
      'At 3:17, the frozen lake cracks in the shape of a massive star.',
    ],
  },
  {
    titles: [
      'Gates of Santa’s Territory', 'The Old Toy Factory', 'Clockwork Conveyor', 'Workshop Ledger 1923', 'The Reindeer Stables',
      'Chamber of Impossible Gifts', 'Santa’s Throne Room', 'The Father’s Last Recording', 'Confronting the Keeper', 'Countdown to Midnight',
    ],
    events: [
      'Mechanical elves twitch to life inside glass display cases.',
      'Santa’s heavy boots stalk the catwalk above the workshop.',
    ],
    rule317: [
      'At 3:17, the workshop sirens wail across the frozen valley.',
      'At 3:17, every gift box opens to reveal glowing embers.',
    ],
  },
  {
    titles: [
      'Return to Blackwood Manor', 'The Crimson Eve', 'Shattered Ornaments', 'The Basement Altar', 'Evelyn’s Final Confession',
      'The Child’s True Name', 'Banishing the Shadow', 'Escape Through the Storm', 'Dawn Over Silent Town', 'The Last Christmas',
    ],
    events: [
      'All seven districts converge under a blood-red winter moon.',
      'Baby Nicholas switches rapidly between innocent cries and Devil’s Gaze.',
    ],
    rule317: [
      'At 3:17, the final curse ritual reaches peak intensity across the Estate.',
      'At 3:17, sunrise stalls until the final seal is broken.',
    ],
  },
];

const TARGET_ROTATION = [
  'note_desk',
  'kitchen_bottle',
  'baby_crib',
  'security_monitor',
  'christmas_tree',
  'impossible_gift',
  'front_door',
];

export function buildAll100Levels(): LevelDefinition[] {
  const levels: LevelDefinition[] = [];

  for (let i = 1; i <= 100; i++) {
    const chapter = Math.ceil(i / 10);
    const indexInChapter = (i - 1) % 10;
    const chapterTitle = CHAPTER_TITLES[chapter - 1];
    const district = CHAPTER_DISTRICTS[chapter - 1];

    if (i <= 10) {
      const def = LEVEL_1_TO_10[i - 1];
      levels.push({
        level: i,
        chapter,
        chapterTitle,
        title: def.title,
        district,
        environmentVariant: def.variant,
        summary: def.summary,
        objectives: def.objectives,
        supernaturalEvent: def.supernaturalEvent,
        rule317Event: def.rule317Event,
        hiddenClueId: `clue_${String(i).padStart(3, '0')}`,
        rewardCoins: 100 + i * 25,
        rewardUnlock: def.rewardUnlock,
        difficultyRating: i,
        eyeGazeThresholdSec: Math.max(0.85, 1.75 - i * 0.02),
      });
    } else {
      const tpl = CHAPTER_TEMPLATES[chapter - 1];
      const title = tpl.titles[indexInChapter];
      const t1 = TARGET_ROTATION[(i + 0) % TARGET_ROTATION.length];
      const t2 = TARGET_ROTATION[(i + 2) % TARGET_ROTATION.length];
      const t3 = TARGET_ROTATION[(i + 4) % TARGET_ROTATION.length];

      const objectiveLabel = (target: string, step: number): string => {
        switch (target) {
          case 'note_desk':
            return `Decode archival ledger entry #${i} at the desk`;
          case 'kitchen_bottle':
            return `Prepare ritual warm milk & inspect cold storage (Stage ${step})`;
          case 'baby_crib':
            return `Monitor Baby Nicholas in containment without triggering Devil's Gaze`;
          case 'security_monitor':
            return `Audit CCTV feeds for anomaly signature #${i}`;
          case 'christmas_tree':
            return `Neutralize cursed ornament resonance on the tree`;
          case 'impossible_gift':
            return `Unseal the Impossible Gift parcel for clue #${i}`;
          default:
            return `Secure perimeter ward & verify exit route (${district.replace('_', ' ')})`;
        }
      };

      levels.push({
        level: i,
        chapter,
        chapterTitle,
        title,
        district,
        environmentVariant: `${chapterTitle} · Phase ${indexInChapter + 1}`,
        summary: `Level ${i} of Chapter ${chapter} (${chapterTitle}). Investigate ${title} while surviving heightened supernatural presence and avoiding Baby Nicholas's Devil Gaze.`,
        objectives: [
          { id: `l${i}_o1`, label: objectiveLabel(t1, 1), interactTarget: t1 },
          { id: `l${i}_o2`, label: objectiveLabel(t2, 2), interactTarget: t2 },
          { id: `l${i}_o3`, label: objectiveLabel(t3, 3), interactTarget: t3 },
        ],
        supernaturalEvent: tpl.events[i % tpl.events.length],
        rule317Event: tpl.rule317[i % tpl.rule317.length],
        hiddenClueId: `clue_${String(i).padStart(3, '0')}`,
        rewardCoins: 120 + i * 25,
        rewardUnlock: indexInChapter === 9 ? `Chapter ${chapter} Relic Unlocked` : undefined,
        difficultyRating: i,
        eyeGazeThresholdSec: Math.max(0.7, 1.75 - i * 0.009),
      });
    }
  }

  return levels;
}

export const ALL_100_LEVELS: LevelDefinition[] = buildAll100Levels();
