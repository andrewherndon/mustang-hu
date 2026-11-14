import type { Design } from "./kit/types";
import { phosphor } from "./phosphor/Phosphor";
import { glass } from "./glass/Glass";
import { y2k } from "./y2k/Y2K";
import { showroom } from "./showroom/Showroom";
import { paper } from "./paper/Paper";
import { outrun } from "./outrun/OutRun";
import { cluster } from "./cluster/Cluster";
import { livingmap } from "./livingmap/LivingMap";
import { terminal } from "./terminal/Terminal";
import { bauhaus } from "./bauhaus/Bauhaus";
import { brutalist } from "./brutalist/Brutalist";
import { tokyo } from "./tokyo/Tokyo";
import { organic } from "./organic/Organic";
import { holo } from "./holo/Holo";
import { consoleDesign } from "./console/Console";
import { ditherField } from "./dither/DitherField";
import { dotMatrix } from "./dotmatrix/DotMatrix";
import { instrument } from "./instrument/Instrument";
import { midnight } from "./midnight/Midnight";
import { amber } from "./amber/Amber";
import { dreamscape } from "./dreamscape/Dreamscape";
import { clay } from "./clay/Clay";
import { blueprint } from "./blueprint/Blueprint";
import { rams } from "./rams/Rams";
import { topo } from "./topo/Topo";

/** All designs besides "classic" (the original shell in App.tsx), in picker order. */
export const DESIGNS: Design[] = [
  // batch 2 (Nov 2026): grounded in real product/landing-page aesthetics
  ditherField, dotMatrix, instrument, midnight, amber, dreamscape, clay, topo, rams, blueprint,
  // batch 1
  phosphor, glass, y2k, showroom, paper, outrun, cluster, livingmap, terminal, bauhaus, brutalist, tokyo, organic, holo, consoleDesign,
];

export const findDesign = (id: string) => DESIGNS.find((d) => d.id === id);
