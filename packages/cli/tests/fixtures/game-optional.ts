import {
  createStageFactory,
  field,
  GameDefinitionBuilder,
  State,
  t,
} from "tabletop-engine";

@State()
class OptionalFactoryGameState {
  @field(t.number())
  counter = 0;
}

export default function createOptionalFixtureGame(
  ...args: [{ verbose?: boolean }?]
) {
  void args;
  const stageFactory = createStageFactory<OptionalFactoryGameState>();

  return new GameDefinitionBuilder("fixture-optional")
    .rootState(OptionalFactoryGameState)
    .initialStage(stageFactory("done").automatic().build())
    .build();
}
