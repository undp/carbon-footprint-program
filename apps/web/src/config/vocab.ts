type GrammaticalNumber = "singular" | "plural";

type Noun = Record<GrammaticalNumber, string>;

type Adjective = Record<GrammaticalNumber, string>;

type Article = Record<GrammaticalNumber, string>;

type Verb = Record<GrammaticalNumber, string>;

type VocabEntry = {
  noun?: Noun;
  adjective?: Adjective;
  article?: Article;
  verb?: Verb;
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
      plural: "inscribir",
    },
  },
} as const satisfies Record<string, VocabEntry>;
