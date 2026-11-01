/** Where a rule value comes from. `section` names the article/page so a reader can find it in the PDF. */
export interface Source {
  regulation: string;
  section?: string;
  url?: string;
  /**
   * Unset = read from the regulation itself (primary). 'secondary' = the value could not be read
   * from an official primary document; `section` says where it comes from.
   */
  verification?: 'primary' | 'secondary';
}

/** Every exported rule set carries the date it takes effect and its citation. */
export interface Rule {
  /** 'YYYY-MM-DD' */
  effectiveFrom: string;
  source: Source;
}

/**
 * One row of a rate table. `upTo` is the inclusive upper bound in rupiah ("sampai dengan");
 * the row starts just above the previous row's `upTo` ("di atas"). `null` = open-ended last row.
 * Rates are integer basis points (0.25% = 25, 34% = 3400).
 */
export interface Band {
  upTo: number | null;
  rateBp: number;
}
