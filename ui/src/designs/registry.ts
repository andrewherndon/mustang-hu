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

/** All designs besides "classic" (the original shell in App.tsx), in picker order. */
export const DESIGNS: Design[] = [phosphor, glass, y2k, showroom, paper, outrun, cluster, livingmap, terminal, bauhaus, brutalist, tokyo, organic, holo, consoleDesign];

export const findDesign = (id: string) => DESIGNS.find((d) => d.id === id);
