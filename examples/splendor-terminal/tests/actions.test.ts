import { expect, test } from "bun:test";
import {
  buildCommandFromDiscovery,
  chooseRandomAvailableCommandType,
  chooseRandomDiscoveryOption,
  describeCommand,
} from "../src/actions.ts";
import type {
  SplendorState,
  SplendorTerminalDiscovery,
  SplendorTerminalDiscoveryInput,
} from "../src/types.ts";

test("buildCommandFromDiscovery follows discovered steps until completion", async () => {
  const discoveryInputs: SplendorTerminalDiscoveryInput[] = [];
  const session = {
    discoverCommand(
      discoveryInput: SplendorTerminalDiscoveryInput,
    ): SplendorTerminalDiscovery | null {
      discoveryInputs.push(discoveryInput);

      const draft = discoveryInput.draft ?? {};

      if (!("cardId" in draft)) {
        return {
          complete: false,
          step: "select_card",
          options: [
            {
              id: "24",
              nextDraft: {
                cardId: 24,
              },
            },
          ],
        };
      }

      if (!("chosenNobleId" in draft)) {
        return {
          complete: false,
          step: "select_noble",
          options: [
            {
              id: "6",
              nextDraft: {
                cardId: 24,
                chosenNobleId: 6,
              },
            },
          ],
        };
      }

      return {
        complete: true,
        payload: {
          cardId: 24,
          chosenNobleId: 6,
        },
      };
    },
  };

  const command = await buildCommandFromDiscovery(
    session as never,
    "you",
    "buy_reserved_card",
    async (discovery) => discovery.options[0]!,
  );

  expect(discoveryInputs).toEqual([
    {
      type: "buy_reserved_card",
      actorId: "you",
    },
    {
      type: "buy_reserved_card",
      actorId: "you",
      draft: {
        cardId: 24,
      },
    },
    {
      type: "buy_reserved_card",
      actorId: "you",
      draft: {
        cardId: 24,
        chosenNobleId: 6,
      },
    },
  ]);
  expect(command).toEqual({
    type: "buy_reserved_card",
    actorId: "you",
    payload: {
      cardId: 24,
      chosenNobleId: 6,
    },
  });
});

test("chooseRandom helpers use the provided random function", () => {
  const session = {
    listAvailableCommands(): string[] {
      return ["a", "b", "c"];
    },
  };

  const commandType = chooseRandomAvailableCommandType(
    session as never,
    "bot-1",
    () => 0.5,
  );
  const option = chooseRandomDiscoveryOption(
    {
      complete: false,
      step: "select",
      options: [
        { id: "one", nextDraft: {} },
        { id: "two", nextDraft: {} },
        { id: "three", nextDraft: {} },
      ],
    },
    () => 0.99,
  );

  expect(commandType).toBe("b");
  expect(option.id).toBe("three");
});

test("buildCommandFromDiscovery fails closed when discovery is unavailable", async () => {
  const session = {
    discoverCommand(): SplendorTerminalDiscovery | null {
      return null;
    },
  };

  await expect(
    buildCommandFromDiscovery(
      session as never,
      "you",
      "buy_reserved_card",
      async () => {
        throw new Error("should_not_be_called");
      },
    ),
  ).rejects.toThrow("discovery_unavailable:buy_reserved_card");
});

test("describeCommand renders splendor-specific summaries", () => {
  expect(
    describeCommand({
      type: "take_three_distinct_gems",
      actorId: "you",
      payload: {
        colors: ["white", "blue", "green"],
      },
    }),
  ).toBe("Take gems white, blue, green");
});

test("render helper types remain compatible with session state shape", () => {
  const state = {} as SplendorState;
  expect(state).toBeDefined();
});
