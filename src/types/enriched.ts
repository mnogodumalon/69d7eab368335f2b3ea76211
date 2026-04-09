import type { BetriebsvergleichDaten } from './app';

export type EnrichedBetriebsvergleichDaten = BetriebsvergleichDaten & {
  branche_gewerkName: string;
};
