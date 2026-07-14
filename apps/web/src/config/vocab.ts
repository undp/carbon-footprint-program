type GrammaticalNumber = "singular" | "plural";

type GrammaticalForm = Record<GrammaticalNumber, string>;

type VocabEntry = {
  noun?: GrammaticalForm;
  /** Everyday clipped form of the noun (e.g. "huella" for "huella de carbono"). */
  shortNoun?: GrammaticalForm;
  adjective?: GrammaticalForm;
  article?: GrammaticalForm;
  relationalAdjective?: string;
  verb?: Pick<GrammaticalForm, "singular">;
};

export const VOCAB = {
  organization: {
    noun: {
      singular: "organización",
      plural: "organizaciones",
    },
    article: {
      singular: "la organización",
      plural: "las organizaciones",
    },
    relationalAdjective: "organizacional",
  },
  carbonInventory: {
    noun: {
      singular: "huella de carbono",
      plural: "huellas de carbono",
    },
    shortNoun: {
      singular: "huella",
      plural: "huellas",
    },
    article: {
      singular: "la huella de carbono",
      plural: "las huellas de carbono",
    },
  },
  inscription: {
    noun: {
      singular: "inscripción",
      plural: "inscripciones",
    },
    article: {
      singular: "la inscripción",
      plural: "las inscripciones",
    },
    adjective: {
      singular: "inscrita",
      plural: "inscritas",
    },
    verb: {
      singular: "inscribir",
    },
  },
} as const satisfies Record<string, VocabEntry>;
