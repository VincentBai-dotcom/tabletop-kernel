import { useMemo, useState } from "react";
import { developmentCardsById, nobleTilesById } from "splendor-example/client";
import "./App.css";
import { useSplendorApp } from "./hooks/use-splendor-app";

const TOKEN_ORDER = ["white", "blue", "green", "red", "black", "gold"] as const;
const COST_ORDER = ["White", "Blue", "Green", "Red", "Black"] as const;
const BONUS_COLOR_ORDER = ["White", "Blue", "Green", "Red", "Black"] as const;
type BonusColor = (typeof BONUS_COLOR_ORDER)[number];

const COMMAND_LABELS: Record<string, string> = {
  take_three_distinct_gems: "Take 3 distinct gems",
  take_two_same_gems: "Take 2 same gems",
  reserve_face_up_card: "Reserve face-up card",
  reserve_deck_card: "Reserve deck card",
  buy_face_up_card: "Buy face-up card",
  buy_reserved_card: "Buy reserved card",
  return_tokens: "Return tokens",
  choose_noble: "Choose noble",
};

function commandLabel(commandType: string): string {
  return (
    COMMAND_LABELS[commandType] ??
    commandType
      .split("_")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
    .padEnd(1, "·");
}

function GemDot({ color }: { color: string }) {
  return <span className={`gem-dot gem-dot-${color}`} />;
}

function CostChip({ color, amount }: { color: string; amount: number }) {
  if (amount <= 0) return null;
  return <span className={`cost-chip cost-chip-${color}`}>{amount}</span>;
}

function CardGemBadge({ color, size }: { color: string; size?: "sm" }) {
  return (
    <span
      className={`card-gem card-gem-${color}${size ? ` card-gem-${size}` : ""}`}
    />
  );
}

type Selectability = "selectable" | "selected" | "none";

function DevelopmentCardView({
  cardId,
  compact = false,
  selectability = "none",
  onSelect,
}: {
  cardId: number;
  compact?: boolean;
  selectability?: Selectability;
  onSelect?: () => void;
}) {
  const card = developmentCardsById[cardId];
  if (!card) return null;
  const points = card.prestigePoints ?? 0;
  const interactive = selectability !== "none";
  const className = [
    "card",
    `card-bg-${card.bonusColor}`,
    compact ? "card-compact" : "",
    interactive ? "is-interactive" : "",
    selectability === "selectable" ? "is-selectable" : "",
    selectability === "selected" ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const body = (
    <>
      <div className="card-head">
        <span
          className={`card-points ${points === 0 ? "card-points-zero" : ""}`}
        >
          {points}
        </span>
        <CardGemBadge color={card.bonusColor} />
      </div>
      <div className="card-cost">
        {COST_ORDER.map((costColor) => (
          <CostChip
            key={costColor}
            color={costColor}
            amount={card.cost?.[costColor] ?? 0}
          />
        ))}
      </div>
      {selectability === "selected" ? (
        <span className="select-check" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </>
  );
  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        onClick={onSelect}
        disabled={selectability === "selected"}
      >
        {body}
      </button>
    );
  }
  return <article className={className}>{body}</article>;
}

function NobleTileView({
  nobleId,
  compact = false,
  selectability = "none",
  onSelect,
}: {
  nobleId: number;
  compact?: boolean;
  selectability?: Selectability;
  onSelect?: () => void;
}) {
  const noble = nobleTilesById[nobleId];
  if (!noble) return null;
  const shortName = noble.name.split(",")[0] ?? noble.name;
  const interactive = selectability !== "none";
  const className = [
    "noble",
    compact ? "noble-compact" : "",
    interactive ? "is-interactive" : "",
    selectability === "selectable" ? "is-selectable" : "",
    selectability === "selected" ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const body = (
    <>
      <div className="noble-head">
        <span className="noble-points">
          <span className="noble-points-star" aria-hidden="true">
            ★
          </span>
          3
        </span>
      </div>
      {!compact ? <div className="noble-name">{shortName}</div> : null}
      <div className="noble-requirements">
        {BONUS_COLOR_ORDER.map((color) => {
          const amount = noble.requirements[color] ?? 0;
          if (amount <= 0) return null;
          return (
            <span key={color} className="noble-requirement">
              <span className={`card-gem card-gem-${color} card-gem-sm`} />
              <span className="noble-requirement-count">{amount}</span>
            </span>
          );
        })}
      </div>
      {selectability === "selected" ? (
        <span className="select-check" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </>
  );
  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        title={noble.name}
        onClick={onSelect}
        disabled={selectability === "selected"}
      >
        {body}
      </button>
    );
  }
  return (
    <article className={className} title={noble.name}>
      {body}
    </article>
  );
}

function PurchasedStacks({ cardIds }: { cardIds: number[] }) {
  const grouped: Record<BonusColor, number[]> = {
    White: [],
    Blue: [],
    Green: [],
    Red: [],
    Black: [],
  };
  for (const cardId of cardIds) {
    const card = developmentCardsById[cardId];
    const color = card?.bonusColor as BonusColor | undefined;
    if (color && color in grouped) {
      grouped[color].push(cardId);
    }
  }

  return (
    <div className="purchased-stacks">
      {BONUS_COLOR_ORDER.map((color) => {
        const ids = grouped[color];
        return (
          <div key={color} className="stack">
            <div className={`stack-header card-bg-${color}`}>
              <CardGemBadge color={color} size="sm" />
              <span className="stack-count">{ids.length}</span>
            </div>
            {ids.map((cardId) => {
              const card = developmentCardsById[cardId];
              const points = card?.prestigePoints ?? 0;
              return (
                <div key={cardId} className={`card-band card-bg-${color}`}>
                  <span
                    className={`card-band-points ${points === 0 ? "card-points-zero" : ""}`}
                  >
                    {points}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status, busy }: { status: string; busy: boolean }) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      <span>{status}</span>
      {busy ? <span className="busy">working</span> : null}
    </span>
  );
}

function App() {
  const app = useSplendorApp();
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [menuTab, setMenuTab] = useState<"create" | "join">("create");

  const playerSections = useMemo(() => {
    if (!app.game) return [];
    return app.game.view.game.playerOrder.map((playerId) => ({
      playerId,
      player: app.game?.view.game.players[playerId],
    }));
  }, [app.game]);

  const discovery = app.discovery;
  const trail = app.selectionTrail;
  const isPicking = discovery !== null;
  const isPendingConfirm = app.pendingCommandInput !== null;
  const isInDiscovery = isPicking || isPendingConfirm;
  const trailOutputs = trail.map(
    (entry) => entry.output as Record<string, unknown>,
  );

  function findOption(predicate: (output: Record<string, unknown>) => boolean) {
    return (
      discovery?.options.find((option) =>
        predicate(option.output as Record<string, unknown>),
      ) ?? null
    );
  }

  function trailCountWhere(
    predicate: (output: Record<string, unknown>) => boolean,
  ) {
    return trailOutputs.filter(predicate).length;
  }

  function gemSelectabilityForBank(color: string): {
    state: Selectability;
    onSelect: (() => void) | undefined;
    selectedCount: number;
  } {
    if (!isInDiscovery || color === "gold") {
      return { state: "none", onSelect: undefined, selectedCount: 0 };
    }
    const selectedCount = trailCountWhere((o) => o.color === color);
    if (isPicking) {
      const option = findOption(
        (o) => o.color === color && typeof o.cardId !== "number",
      );
      if (option) {
        return {
          state: "selectable",
          onSelect: () => app.chooseDiscoveryOption(option),
          selectedCount,
        };
      }
    }
    if (selectedCount > 0) {
      return { state: "selected", onSelect: undefined, selectedCount };
    }
    return { state: "none", onSelect: undefined, selectedCount: 0 };
  }

  function selectabilityForFaceUpCard(cardId: number): {
    state: Selectability;
    onSelect: (() => void) | undefined;
  } {
    if (!isInDiscovery) {
      return { state: "none", onSelect: undefined };
    }
    const isSelected = trailOutputs.some((o) => o.cardId === cardId);
    if (isSelected) {
      return { state: "selected", onSelect: undefined };
    }
    if (isPicking) {
      const option = findOption((o) => o.cardId === cardId);
      if (option) {
        return {
          state: "selectable",
          onSelect: () => app.chooseDiscoveryOption(option),
        };
      }
    }
    return { state: "none", onSelect: undefined };
  }

  function selectabilityForReservedCard(cardId: number): {
    state: Selectability;
    onSelect: (() => void) | undefined;
  } {
    if (!isInDiscovery || app.activeCommandType !== "buy_reserved_card") {
      return { state: "none", onSelect: undefined };
    }
    return selectabilityForFaceUpCard(cardId);
  }

  function selectabilityForDeckLevel(level: number): {
    state: Selectability;
    onSelect: (() => void) | undefined;
  } {
    if (!isInDiscovery || app.activeCommandType !== "reserve_deck_card") {
      return { state: "none", onSelect: undefined };
    }
    const isSelected = trailOutputs.some(
      (o) => o.level === level && typeof o.cardId !== "number",
    );
    if (isSelected) {
      return { state: "selected", onSelect: undefined };
    }
    if (isPicking) {
      const option = findOption(
        (o) => o.level === level && typeof o.cardId !== "number",
      );
      if (option) {
        return {
          state: "selectable",
          onSelect: () => app.chooseDiscoveryOption(option),
        };
      }
    }
    return { state: "none", onSelect: undefined };
  }

  function selectabilityForNoble(nobleId: number): {
    state: Selectability;
    onSelect: (() => void) | undefined;
  } {
    if (!isInDiscovery) {
      return { state: "none", onSelect: undefined };
    }
    const isSelected = trailOutputs.some((o) => o.nobleId === nobleId);
    if (isSelected) {
      return { state: "selected", onSelect: undefined };
    }
    if (isPicking) {
      const option = findOption((o) => o.nobleId === nobleId);
      if (option) {
        return {
          state: "selectable",
          onSelect: () => app.chooseDiscoveryOption(option),
        };
      }
    }
    return { state: "none", onSelect: undefined };
  }

  function selectabilityForReturnToken(color: string): {
    isSelectable: boolean;
    onSelect: (() => void) | undefined;
    selectedCount: number;
  } {
    if (!isInDiscovery || app.activeCommandType !== "return_tokens") {
      return { isSelectable: false, onSelect: undefined, selectedCount: 0 };
    }
    const selectedCount = trailCountWhere((o) => o.color === color);
    if (isPicking) {
      const option = findOption((o) => o.color === color);
      if (option) {
        return {
          isSelectable: true,
          onSelect: () => app.chooseDiscoveryOption(option),
          selectedCount,
        };
      }
    }
    return { isSelectable: false, onSelect: undefined, selectedCount };
  }

  function discoveryStatusText(): string {
    if (!isInDiscovery) return "";
    if (isPendingConfirm) {
      return "Ready to confirm";
    }
    const sample = discovery?.options[0]?.output as
      | Record<string, unknown>
      | undefined;
    if (sample && typeof sample.requiredCount === "number") {
      return `${trail.length} of ${sample.requiredCount} selected`;
    }
    if (sample && typeof sample.requiredReturnCount === "number") {
      return `Return ${trail.length} of ${sample.requiredReturnCount} tokens`;
    }
    return "Choose a target on the board";
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-brand-mark" />
          <span>Splendor</span>
        </div>
        <div className="topbar-meta">
          <StatusPill status={app.liveStatus} busy={app.busy} />
          {app.screen === "game" ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={app.backToMenu}
              disabled={app.busy}
            >
              Leave game
            </button>
          ) : null}
          {app.screen !== "menu" ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={app.resetBrowserSession}
              disabled={app.busy}
            >
              Reset session
            </button>
          ) : null}
        </div>
      </header>

      {app.error ? <div className="flash">{app.error}</div> : null}

      {app.screen === "menu" ? (
        <main className="view view-narrow">
          <h1 className="menu-title">Play Splendor</h1>
          <p className="menu-sub">
            Hosted, invite-only rooms. No accounts. Reconnect by reopening this
            page in the same browser.
          </p>

          <div className="tabs">
            <button
              className={`tab ${menuTab === "create" ? "active" : ""}`}
              onClick={() => setMenuTab("create")}
            >
              Create
            </button>
            <button
              className={`tab ${menuTab === "join" ? "active" : ""}`}
              onClick={() => setMenuTab("join")}
            >
              Join
            </button>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="display-name">
              Display name
            </label>
            <input
              id="display-name"
              className="field-input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Vincent"
            />
          </div>

          {menuTab === "join" ? (
            <div className="field">
              <label className="field-label" htmlFor="room-code">
                Room code
              </label>
              <input
                id="room-code"
                className="field-input"
                value={roomCode}
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase())
                }
                placeholder="ABC123"
                maxLength={6}
              />
            </div>
          ) : null}

          <div className="btn-row">
            {menuTab === "create" ? (
              <button
                className="btn"
                onClick={() => app.createRoomAndConnect(displayName.trim())}
                disabled={app.busy || displayName.trim().length === 0}
              >
                Create room
              </button>
            ) : (
              <button
                className="btn"
                onClick={() =>
                  app.joinRoomAndConnect(displayName.trim(), roomCode.trim())
                }
                disabled={
                  app.busy ||
                  displayName.trim().length === 0 ||
                  roomCode.trim().length === 0
                }
              >
                Join room
              </button>
            )}
          </div>
        </main>
      ) : null}

      {app.screen === "room" && app.room ? (
        <main className="view view-narrow">
          <p className="room-code-label">Room code</p>
          <h1 className="room-code">{app.room.code}</h1>
          <p className="room-help">
            Share the code with friends. Host can start once at least two seated
            players are ready.
          </p>

          <div className="seats">
            {app.room.players.map((player) => (
              <div className="seat" key={player.playerSessionId}>
                <span className="seat-avatar">
                  {initials(player.displayName)}
                </span>
                <span className="seat-name">{player.displayName}</span>
                {player.isHost ? (
                  <span className="seat-tag seat-tag-host">host</span>
                ) : null}
                {player.isReady ? (
                  <span className="seat-tag seat-tag-ready">ready</span>
                ) : (
                  <span className="seat-tag">waiting</span>
                )}
                {player.disconnectedAt ? (
                  <span className="seat-tag seat-tag-disconnected">
                    offline
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="btn-row">
            <button
              className="btn"
              onClick={() => app.setReady(true)}
              disabled={app.busy}
            >
              Ready
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => app.setReady(false)}
              disabled={app.busy}
            >
              Not ready
            </button>
            <button
              className="btn btn-accent"
              onClick={app.startGame}
              disabled={app.busy}
            >
              Start game
            </button>
            <button
              className="btn btn-ghost"
              onClick={app.leaveRoom}
              disabled={app.busy}
            >
              Leave
            </button>
          </div>
        </main>
      ) : null}

      {app.screen === "game" && app.game ? (
        <main className="view view-game">
          <div className="game">
            <aside className="actions">
              <p className="game-section-label">Actions</p>
              {app.game.availableCommands.length > 0 ? (
                app.game.availableCommands.map((commandType) => (
                  <button
                    key={commandType}
                    className={`action-btn${
                      app.activeCommandType === commandType ? " is-active" : ""
                    }`}
                    onClick={() =>
                      app.beginDiscovery(
                        commandType as Parameters<typeof app.beginDiscovery>[0],
                      )
                    }
                    disabled={app.busy || isInDiscovery}
                  >
                    {commandLabel(commandType)}
                  </button>
                ))
              ) : (
                <div className="actions-empty">Waiting for another player</div>
              )}
            </aside>

            <section className="board">
              <div>
                <p className="game-section-label">Bank</p>
                <div className="bank">
                  {TOKEN_ORDER.map((color) => {
                    const amount =
                      (app.game?.view.game.bank as Record<string, number>)[
                        color
                      ] ?? 0;
                    const { state, onSelect, selectedCount } =
                      gemSelectabilityForBank(color);
                    const className = [
                      "gem",
                      state === "selectable" ? "is-selectable" : "",
                      state === "selected" ? "is-selected" : "",
                      state !== "none" ? "is-interactive" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    if (state === "selectable") {
                      return (
                        <button
                          key={color}
                          type="button"
                          className={className}
                          onClick={onSelect}
                        >
                          <GemDot color={color} />
                          <span className="gem-count">{amount}</span>
                          {selectedCount > 0 ? (
                            <span className="gem-selected-badge">
                              ✓ {selectedCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    }
                    return (
                      <span key={color} className={className}>
                        <GemDot color={color} />
                        <span className="gem-count">{amount}</span>
                        {selectedCount > 0 ? (
                          <span className="gem-selected-badge">
                            ✓ {selectedCount}
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              </div>

              {app.game.view.game.board.nobleIds.length > 0 ? (
                <div>
                  <p className="game-section-label">Nobles</p>
                  <div className="nobles">
                    {app.game.view.game.board.nobleIds.map((nobleId) => {
                      const { state, onSelect } =
                        selectabilityForNoble(nobleId);
                      return (
                        <NobleTileView
                          key={nobleId}
                          nobleId={nobleId}
                          selectability={state}
                          onSelect={onSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="game-section-label">Development cards</p>
                <div className="levels">
                  {Object.entries(app.game.view.game.board.faceUpByLevel)
                    .slice()
                    .reverse()
                    .map(([level, cardIds]) => {
                      const levelNumber = Number(level);
                      const deckCount =
                        (
                          app.game?.view.game.board.deckByLevel.value as Record<
                            string,
                            number
                          >
                        )?.[level] ?? 0;
                      const deckSel = selectabilityForDeckLevel(levelNumber);
                      const deckClass = [
                        "deck-pile",
                        deckSel.state === "selectable" ? "is-selectable" : "",
                        deckSel.state === "selected" ? "is-selected" : "",
                        deckSel.state !== "none" ? "is-interactive" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div className="level-row" key={level}>
                          <span className="level-pill">L{level}</span>
                          {deckSel.state === "selectable" ? (
                            <button
                              type="button"
                              className={deckClass}
                              onClick={deckSel.onSelect}
                              title={`Reserve from level ${level} deck`}
                            >
                              <span className="deck-pile-count">
                                {deckCount}
                              </span>
                              <span className="deck-pile-sub">deck</span>
                            </button>
                          ) : (
                            <div
                              className={deckClass}
                              title={`${deckCount} cards in deck`}
                            >
                              <span className="deck-pile-count">
                                {deckCount}
                              </span>
                              <span className="deck-pile-sub">deck</span>
                              {deckSel.state === "selected" ? (
                                <span
                                  className="select-check"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                              ) : null}
                            </div>
                          )}
                          <div className="cards">
                            {cardIds.map((cardId: number) => {
                              const { state, onSelect } =
                                selectabilityForFaceUpCard(cardId);
                              return (
                                <DevelopmentCardView
                                  key={cardId}
                                  cardId={cardId}
                                  selectability={state}
                                  onSelect={onSelect}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </section>

            <aside className="players">
              <p className="game-section-label">Players</p>
              {playerSections.map(({ playerId, player }) => {
                const totalTokens = player
                  ? TOKEN_ORDER.reduce(
                      (sum, color) =>
                        sum +
                        ((player.tokens as Record<string, number>)[color] ?? 0),
                      0,
                    )
                  : 0;
                const reservedField = player?.reservedCardIds;
                const reservedIds = Array.isArray(reservedField)
                  ? reservedField
                  : null;
                const reservedCount = reservedIds
                  ? reservedIds.length
                  : !reservedField || Array.isArray(reservedField)
                    ? 0
                    : (reservedField.value.count ?? 0);
                const isSelf = reservedIds !== null;
                const cardPoints =
                  player?.purchasedCardIds.reduce(
                    (sum, cardId) =>
                      sum + (developmentCardsById[cardId]?.prestigePoints ?? 0),
                    0,
                  ) ?? 0;
                const noblePoints = (player?.nobleIds.length ?? 0) * 3;
                const totalPoints = cardPoints + noblePoints;
                return (
                  <div
                    className={`player${isSelf ? " is-self" : ""}`}
                    key={playerId}
                  >
                    <div className="player-head">
                      <span className="player-name">
                        {playerId}
                        {isSelf ? (
                          <span className="player-self-tag">you</span>
                        ) : null}
                      </span>
                      <span
                        className="player-score"
                        title={`${cardPoints} from cards${noblePoints > 0 ? ` + ${noblePoints} from nobles` : ""}`}
                      >
                        <span className="player-score-star" aria-hidden="true">
                          ★
                        </span>
                        <span className="player-score-value">
                          {totalPoints}
                        </span>
                      </span>
                    </div>
                    <div className="player-stats">{totalTokens}/10 tokens</div>
                    <div className="player-tokens">
                      {TOKEN_ORDER.map((color) => {
                        const amount =
                          (player?.tokens as Record<string, number>)?.[color] ??
                          0;
                        if (amount === 0) return null;
                        const returnSel = isSelf
                          ? selectabilityForReturnToken(color)
                          : {
                              isSelectable: false,
                              onSelect: undefined,
                              selectedCount: 0,
                            };
                        const remaining = amount - returnSel.selectedCount;
                        const className = [
                          "gem",
                          returnSel.isSelectable ? "is-selectable" : "",
                          returnSel.selectedCount > 0 ? "is-selected" : "",
                          returnSel.isSelectable ? "is-interactive" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");
                        if (returnSel.isSelectable) {
                          return (
                            <button
                              key={color}
                              type="button"
                              className={className}
                              onClick={returnSel.onSelect}
                            >
                              <GemDot color={color} />
                              <span className="gem-count">{remaining}</span>
                              {returnSel.selectedCount > 0 ? (
                                <span className="gem-selected-badge">
                                  ↩ {returnSel.selectedCount}
                                </span>
                              ) : null}
                            </button>
                          );
                        }
                        return (
                          <span key={color} className={className}>
                            <GemDot color={color} />
                            <span className="gem-count">{amount}</span>
                            {returnSel.selectedCount > 0 ? (
                              <span className="gem-selected-badge">
                                ↩ {returnSel.selectedCount}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>

                    <div className="player-section">
                      <div className="player-section-head">
                        <span className="player-section-label">Cards</span>
                        <span className="player-section-count">
                          {player?.purchasedCardIds.length ?? 0}
                        </span>
                      </div>
                      <PurchasedStacks
                        cardIds={player?.purchasedCardIds ?? []}
                      />
                    </div>

                    <div className="player-section">
                      <div className="player-section-head">
                        <span className="player-section-label">Reserved</span>
                        <span className="player-section-count">
                          {reservedCount}
                        </span>
                      </div>
                      {reservedIds && reservedIds.length > 0 ? (
                        <div className="reserved-cards">
                          {reservedIds.map((cardId) => {
                            const { state, onSelect } = isSelf
                              ? selectabilityForReservedCard(cardId)
                              : { state: "none" as const, onSelect: undefined };
                            return (
                              <DevelopmentCardView
                                key={cardId}
                                cardId={cardId}
                                compact
                                selectability={state}
                                onSelect={onSelect}
                              />
                            );
                          })}
                        </div>
                      ) : reservedIds ? (
                        <span className="reserved-empty">none</span>
                      ) : (
                        <span className="reserved-empty">hidden</span>
                      )}
                    </div>

                    {player?.nobleIds.length ? (
                      <div className="player-section">
                        <div className="player-section-head">
                          <span className="player-section-label">Nobles</span>
                          <span className="player-section-count">
                            {player.nobleIds.length}
                          </span>
                        </div>
                        <div className="player-nobles">
                          {player.nobleIds.map((id) => (
                            <NobleTileView key={id} nobleId={id} compact />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </aside>
          </div>

          {isInDiscovery ? (
            <div className="command-bar">
              <div className="command-bar-info">
                <div className="command-bar-title">
                  {app.activeCommandType
                    ? commandLabel(app.activeCommandType)
                    : "Action"}
                </div>
                <div className="command-bar-status">
                  {discoveryStatusText()}
                </div>
              </div>
              <div className="command-bar-actions">
                <button
                  className="btn btn-ghost"
                  onClick={app.cancelDiscovery}
                  disabled={app.busy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-accent"
                  onClick={app.confirmDiscovery}
                  disabled={app.busy || !isPendingConfirm}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : null}
        </main>
      ) : null}

      {app.screen === "ended" && app.ended ? (
        <main className="view view-narrow">
          <h1 className="ended-headline">
            {app.ended.result.reason === "completed"
              ? "Game over"
              : "Session ended"}
          </h1>
          <p className="ended-sub">
            {app.ended.result.message ?? "The game no longer exists."}
          </p>
          {app.ended.result.winnerPlayerIds?.length ? (
            <div className="ended-winners">
              Winner: {app.ended.result.winnerPlayerIds.join(", ")}
            </div>
          ) : null}
          <div className="btn-row">
            <button className="btn" onClick={app.backToMenu}>
              Back to menu
            </button>
          </div>
        </main>
      ) : null}
    </div>
  );
}

export default App;
