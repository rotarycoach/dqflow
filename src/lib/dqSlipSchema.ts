export type DQPhase = "start" | "swim" | "turn" | "finish";

export type DQStroke =
  | "butterfly"
  | "backstroke"
  | "breaststroke"
  | "freestyle"
  | "individual_medley"
  | "relays"
  | "misc";

export type SlipCheck = {
  code: string;  // printed code on the slip
  label: string;
};

export type SlipText = {
  code: string;
  label: string;
  placeholder?: string;
};

export type StrokeSection = {
  stroke: DQStroke;
  title: string;
  phaseEnabled: boolean;
  defaultPhase?: DQPhase;
  checks: SlipCheck[];
  texts: SlipText[];
};

export const DQ_SLIP_SECTIONS: StrokeSection[] = [
  {
    stroke: "butterfly",
    title: "Butterfly",
    phaseEnabled: true,
    defaultPhase: "swim",
    checks: [
      { code: "1A", label: "KICK: Alternating" },
      { code: "1B", label: "KICK: Breast" },
      { code: "1C", label: "KICK: Scissors" },
      { code: "1E", label: "ARMS: Non-simultaneous" },
      { code: "1F", label: "ARMS: Underwater recovery" },
      { code: "1J", label: "TOUCH: One hand" },
      { code: "1K", label: "TOUCH: Not separated" },
      { code: "1L", label: "TOUCH: Non-simultaneous" },
      { code: "1M", label: "TOUCH: No touch" },
      { code: "1N", label: "Not toward the breast off wall" },
      { code: "1P", label: "Head did not break surface by 15m" },
      { code: "1R", label: "Re-submerged" },
    ],
    texts: [{ code: "1T", label: "OTHER (1T):", placeholder: "Type details..." }],
  },

  {
    stroke: "backstroke",
    title: "Backstroke",
    phaseEnabled: true,
    defaultPhase: "swim",
    checks: [
      { code: "2A", label: "No touch at turn (2A)#" },
      { code: "2B", label: "PAST VERTICAL AT TURN: Delay initiation arm pull (2B)" },
      { code: "2C", label: "PAST VERTICAL AT TURN: Delay initiating turn (2C)" },
      { code: "2D", label: "PAST VERTICAL AT TURN: Multiple strokes (2D)" },
      { code: "2E", label: "Toes over lip of gutter after the start (2E)" },
      { code: "2F", label: "Head did not break surface by 15m (2F)" },
      { code: "2G", label: "Re-submerged (2G)" },
      { code: "2H", label: "Not on back off wall (2H)" },
      { code: "2L", label: "Shoulders past vertical towards the breast (2L)" },
    ],
    texts: [{ code: "2T", label: "OTHER (2T):", placeholder: "Type details..." }],
  },

  {
    stroke: "breaststroke",
    title: "Breaststroke",
    phaseEnabled: true,
    defaultPhase: "swim",
    checks: [
      { code: "3A", label: "KICK: Alternating (3A)" },
      { code: "3B", label: "KICK: Butterfly (3B)" },
      { code: "3C", label: "KICK: Scissors (3C)" },
      { code: "3D", label: "ARMS: Past hipline (3D)" },
      { code: "3E", label: "ARMS: Non-simultaneous (3E)" },
      { code: "3H", label: "Elbows recovered over water (3H)" },
      { code: "3J", label: "TOUCH: One hand (3J)" },
      { code: "3K", label: "TOUCH: Not separated (3K)" },
      { code: "3L", label: "TOUCH: Non-simultaneous (3L)" },
      { code: "3M", label: "TOUCH: No touch (3M)" },
      { code: "3N", label: "Not toward the breast fore wall (3N)" },
      { code: "3S", label: "CYCLE: Double pulls/kicks (3S)" },
      { code: "3P", label: "CYCLE: Kick before pull (3P)" },
      { code: "3R", label: "Head not up before hands turn inward (3R)" },
    ],
    texts: [{ code: "3T", label: "OTHER (3T):", placeholder: "Type details..." }],
  },

  {
    stroke: "freestyle",
    title: "Freestyle",
    phaseEnabled: false,
    checks: [
      { code: "4A", label: "No touch at turn (4A)#" },
      { code: "4B", label: "Head did not break surface by 15m (4B)" },
      { code: "4C", label: "Re-submerged (4C)" },
    ],
    texts: [],
  },

  {
    stroke: "individual_medley",
    title: "Individual Medley",
    phaseEnabled: false,
    checks: [
      { code: "5A", label: "Stroke infraction(s) (5A)#" },
      { code: "5B", label: "Out of sequence (5B)" },
    ],
    texts: [{ code: "5X", label: "Details:", placeholder: "Type details..." }],
  },

  {
    stroke: "relays",
    title: "Relays",
    phaseEnabled: false,
    checks: [
      { code: "6A-D", label: "Stroke infractions (6A-D)# — Swimmer #" },
      { code: "6F-H", label: "Early take off (6F-H)# — Swimmer #" },
      { code: "6L", label: "Changed order (6L): swimmer / stroke" },
    ],
    texts: [{ code: "6T", label: "OTHER (6T):", placeholder: "Type details..." }],
  },

  {
    stroke: "misc",
    title: "Miscellaneous",
    phaseEnabled: false,
    checks: [
      { code: "7A", label: "False start (7A)" },
      { code: "7B", label: "Declared false start (7B)" },
      { code: "7C", label: "Did not finish (7C)" },
      { code: "7D", label: "Delay of meet (7D)" },
    ],
    texts: [{ code: "7T", label: "OTHER (7T):", placeholder: "Type details..." }],
  },
];

export const SLIP_NOTIFIED_OPTIONS = [
  { id: "notified_swimmer", label: "Notified: Swimmer" },
  { id: "notified_coach", label: "Notified: Coach" },
] as const;
