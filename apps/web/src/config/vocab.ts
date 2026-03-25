type GrammaticalNumber = "singular" | "plural";

type GrammaticalForm = Record<GrammaticalNumber, string>;

type VocabEntry = {
  noun?: GrammaticalForm;
  adjective?: GrammaticalForm;
  article?: GrammaticalForm;
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
