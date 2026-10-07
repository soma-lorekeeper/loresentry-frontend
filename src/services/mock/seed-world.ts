import { LOCALE, type Locale } from "@/i18n";

import { EN_SEED } from "./seed-world.en";
import { KO_SEED } from "./seed-world.ko";
import type { MockSeed } from "./seed-types";

export const SEEDS: Record<Locale, MockSeed> = { ko: KO_SEED, en: EN_SEED };

export const SEED: MockSeed = SEEDS[LOCALE];
