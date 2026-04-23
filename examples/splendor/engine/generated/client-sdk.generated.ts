export interface VisibleState {
  game: {
    playerOrder: string[];
    players: Record<
      string,
      {
        id: string;
        tokens: {
          white: number;
          blue: number;
          green: number;
          red: number;
          black: number;
          gold: number;
        };
        reservedCardIds:
          | number[]
          | {
              __hidden: true;
              value: {
                count: number;
              };
            };
        purchasedCardIds: number[];
        nobleIds: number[];
      }
    >;
    bank: {
      white: number;
      blue: number;
      green: number;
      red: number;
      black: number;
      gold: number;
    };
    board: {
      faceUpByLevel: Record<string, number[]>;
      deckByLevel: {
        __hidden: true;
        value: {
          "1": number;
          "2": number;
          "3": number;
        };
      };
      nobleIds: number[];
    };
    endGame?: {
      triggeredByPlayerId: string;
      endsAfterPlayerId: string;
    };
    winnerIds?: string[];
  };
  progression: {
    current: string | null;
    rootId: string | null;
    segments: Record<
      string,
      {
        id: string;
        kind?: string;
        parentId?: string;
        childIds: string[];
        active: boolean;
        ownerId?: string;
      }
    >;
  };
}

export type CommandRequest =
  | {
      type: "take_three_distinct_gems";
      actorId: string;
      input: {
        colors: string[];
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "take_two_same_gems";
      actorId: string;
      input: {
        color: string;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "reserve_face_up_card";
      actorId: string;
      input: {
        level: number;
        cardId: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "reserve_deck_card";
      actorId: string;
      input: {
        level: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "buy_face_up_card";
      actorId: string;
      input: {
        level: number;
        cardId: number;
      };
    }
  | {
      type: "buy_reserved_card";
      actorId: string;
      input: {
        cardId: number;
      };
    }
  | {
      type: "choose_noble";
      actorId: string;
      input: {
        nobleId: number;
      };
    };

export type DiscoveryRequest =
  | {
      type: "take_three_distinct_gems";
      actorId: string;
      step: "select_gem_color";
      input: {
        selectedColors?: string[];
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "take_three_distinct_gems";
      actorId: string;
      step: "select_return_token";
      input: {
        selectedColors: string[];
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "take_two_same_gems";
      actorId: string;
      step: "select_gem_color";
      input: {
        selectedColor?: string;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "take_two_same_gems";
      actorId: string;
      step: "select_return_token";
      input: {
        selectedColor: string;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "reserve_face_up_card";
      actorId: string;
      step: "select_face_up_card";
      input: {
        selectedLevel?: number;
        selectedCardId?: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "reserve_face_up_card";
      actorId: string;
      step: "select_return_token";
      input: {
        selectedLevel: number;
        selectedCardId: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "reserve_deck_card";
      actorId: string;
      step: "select_deck_level";
      input: {
        selectedLevel?: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "reserve_deck_card";
      actorId: string;
      step: "select_return_token";
      input: {
        selectedLevel: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      type: "buy_face_up_card";
      actorId: string;
      step: "select_face_up_card";
      input: {
        selectedLevel?: number;
        selectedCardId?: number;
      };
    }
  | {
      type: "buy_reserved_card";
      actorId: string;
      step: "select_reserved_card";
      input: {
        selectedCardId?: number;
      };
    }
  | {
      type: "choose_noble";
      actorId: string;
      step: "select_noble";
      input: {
        chosenNobleId?: number;
      };
    };

export type DiscoveryResult =
  | {
      complete: false;
      step: "select_gem_color";
      options: Array<{
        id: string;
        output: {
          color: string;
          selectedCount: number;
          requiredCount: number;
        };
        nextStep: string;
        nextInput: {
          selectedColors?: string[];
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: false;
      step: "select_return_token";
      options: Array<{
        id: string;
        output: {
          color: string;
          selectedCount: number;
          requiredReturnCount: number;
        };
        nextStep: string;
        nextInput: {
          selectedColors: string[];
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        colors: string[];
        returnTokens?: Record<string, number>;
      };
    }
  | {
      complete: false;
      step: "select_gem_color";
      options: Array<{
        id: string;
        output: {
          color: string;
          amount: number;
        };
        nextStep: string;
        nextInput: {
          selectedColor?: string;
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: false;
      step: "select_return_token";
      options: Array<{
        id: string;
        output: {
          color: string;
          selectedCount: number;
          requiredReturnCount: number;
        };
        nextStep: string;
        nextInput: {
          selectedColor: string;
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        color: string;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      complete: false;
      step: "select_face_up_card";
      options: Array<{
        id: string;
        output: {
          level: number;
          cardId: number;
          bonusColor: string;
          prestigePoints: number;
          source: string;
        };
        nextStep: string;
        nextInput: {
          selectedLevel?: number;
          selectedCardId?: number;
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: false;
      step: "select_return_token";
      options: Array<{
        id: string;
        output: {
          color: string;
          selectedCount: number;
          requiredReturnCount: number;
        };
        nextStep: string;
        nextInput: {
          selectedLevel: number;
          selectedCardId: number;
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        level: number;
        cardId: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      complete: false;
      step: "select_deck_level";
      options: Array<{
        id: string;
        output: {
          level: number;
          cardCount: number;
          source: string;
        };
        nextStep: string;
        nextInput: {
          selectedLevel?: number;
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: false;
      step: "select_return_token";
      options: Array<{
        id: string;
        output: {
          color: string;
          selectedCount: number;
          requiredReturnCount: number;
        };
        nextStep: string;
        nextInput: {
          selectedLevel: number;
          returnTokens?: Record<string, number>;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        level: number;
        returnTokens?: Record<string, number>;
      };
    }
  | {
      complete: false;
      step: "select_face_up_card";
      options: Array<{
        id: string;
        output: {
          level: number;
          cardId: number;
          bonusColor: string;
          prestigePoints: number;
          source: string;
        };
        nextStep: string;
        nextInput: {
          selectedLevel?: number;
          selectedCardId?: number;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        level: number;
        cardId: number;
      };
    }
  | {
      complete: false;
      step: "select_reserved_card";
      options: Array<{
        id: string;
        output: {
          cardId: number;
          level: number;
          bonusColor: string;
          prestigePoints: number;
          source: string;
        };
        nextStep: string;
        nextInput: {
          selectedCardId?: number;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        cardId: number;
      };
    }
  | {
      complete: false;
      step: "select_noble";
      options: Array<{
        id: string;
        output: {
          nobleId: number;
          name: string;
          requirements: {
            White: number;
            Blue: number;
            Black: number;
            Red: number;
            Green: number;
          };
        };
        nextStep: string;
        nextInput: {
          chosenNobleId?: number;
        };
      }>;
    }
  | {
      complete: true;
      input: {
        nobleId: number;
      };
    };
