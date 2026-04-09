// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface BranchenGewerke {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    branche_name?: string;
    branche_beschreibung?: string;
  };
}

export interface BetriebsvergleichDaten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    branche_gewerk?: string; // applookup -> URL zu 'BranchenGewerke' Record
    jahr?: number;
    herausgeber?: string;
    anzahl_teilnehmer?: number;
    umsatzrentabilitaet?: number;
    materialintensitaet?: number;
    personalintensitaet?: number;
    wertschoepfung_pro_mitarbeiter?: number;
    kalk_unternehmerlohn?: number;
    pdf_datei?: string;
    jahr_fundstelle?: string;
    herausgeber_fundstelle?: string;
    anzahl_teilnehmer_fundstelle?: string;
    umsatzrentabilitaet_fundstelle?: string;
    materialintensitaet_fundstelle?: string;
    personalintensitaet_fundstelle?: string;
    wertschoepfung_pro_mitarbeiter_fundstelle?: string;
    kalk_unternehmerlohn_fundstelle?: string;
  };
}

export const APP_IDS = {
  BRANCHEN_GEWERKE: '69d7ea9e2953be1e997442da',
  BETRIEBSVERGLEICH_DATEN: '69d7eaa2c7375dc121d2d8c9',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'branchen_&_gewerke': {
    'branche_name': 'string/text',
    'branche_beschreibung': 'string/textarea',
  },
  'betriebsvergleich_daten': {
    'titel': 'string/text',
    'branche_gewerk': 'applookup/select',
    'jahr': 'number',
    'herausgeber': 'string/text',
    'anzahl_teilnehmer': 'number',
    'umsatzrentabilitaet': 'number',
    'materialintensitaet': 'number',
    'personalintensitaet': 'number',
    'wertschoepfung_pro_mitarbeiter': 'number',
    'kalk_unternehmerlohn': 'number',
    'pdf_datei': 'file',
    'jahr_fundstelle': 'string/text',
    'herausgeber_fundstelle': 'string/text',
    'anzahl_teilnehmer_fundstelle': 'string/text',
    'umsatzrentabilitaet_fundstelle': 'string/text',
    'materialintensitaet_fundstelle': 'string/text',
    'personalintensitaet_fundstelle': 'string/text',
    'wertschoepfung_pro_mitarbeiter_fundstelle': 'string/text',
    'kalk_unternehmerlohn_fundstelle': 'string/text',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBranchenGewerke = StripLookup<BranchenGewerke['fields']>;
export type CreateBetriebsvergleichDaten = StripLookup<BetriebsvergleichDaten['fields']>;