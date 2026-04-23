import { describeGameProtocol } from "tabletop-engine";
import { success, type RunResult } from "../lib/command-result.ts";
import { createGenerationContext } from "../lib/generation-context.ts";
import { parseCommandArguments } from "../lib/parse-args.ts";
import {
  renderSchemaTypeString,
  renderTypeDeclaration,
} from "../lib/render-typescript.ts";
import { writeOutputFile } from "../lib/write-output.ts";

interface GenerateClientSdkOptions {
  cwd: string;
}

export async function runGenerateClientSdkCommand(
  args: string[],
  options: GenerateClientSdkOptions,
): Promise<RunResult> {
  const parsed = parseCommandArguments(args);
  const context = await createGenerationContext(parsed, {
    cwd: options.cwd,
  });
  const protocol = describeGameProtocol(context.game);
  const commandUnion = renderCommandRequestUnion(protocol.commands);
  const discoveryRequestUnion = renderDiscoveryRequestUnion(protocol.commands);
  const discoveryResultUnion = renderDiscoveryResultUnion(protocol.commands);
  const output = [
    renderTypeDeclaration(
      "VisibleState",
      protocol.viewSchema as Record<string, unknown>,
    ),
    `export type CommandRequest = ${commandUnion || "never"};\n`,
    `export type DiscoveryRequest = ${discoveryRequestUnion || "never"};\n`,
    `export type DiscoveryResult = ${discoveryResultUnion || "never"};\n`,
  ].join("\n");
  const outputPath = `${context.outputDirectory}/client-sdk.generated.ts`;

  await writeOutputFile(outputPath, output);

  return success(`generated client sdk:${outputPath}`);
}

function renderCommandRequestUnion(
  commands: Record<
    string,
    { commandSchema: { schema?: Record<string, unknown> } }
  >,
): string {
  return renderUnion(
    Object.entries(commands).map(([commandId, command]) => {
      const commandSchema = command.commandSchema.schema as Record<
        string,
        unknown
      >;

      return `{
  type: ${JSON.stringify(commandId)};
  actorId: string;
  input: ${renderSchemaTypeString(commandSchema)};
}`;
    }),
  );
}

function renderDiscoveryRequestUnion(
  commands: Record<
    string,
    {
      commandSchema: { schema?: Record<string, unknown> };
      discovery?: {
        steps: Array<{
          stepId: string;
          inputSchema: { schema?: Record<string, unknown> };
        }>;
      };
    }
  >,
): string {
  return renderUnion(
    Object.entries(commands).flatMap(([commandId, command]) =>
      (command.discovery?.steps ?? []).map((step) => {
        const inputSchema = step.inputSchema.schema as Record<string, unknown>;

        return `{
  type: ${JSON.stringify(commandId)};
  actorId: string;
  step: ${JSON.stringify(step.stepId)};
  input: ${renderSchemaTypeString(inputSchema)};
}`;
      }),
    ),
  );
}

function renderDiscoveryResultUnion(
  commands: Record<
    string,
    {
      commandSchema: { schema?: Record<string, unknown> };
      discovery?: {
        steps: Array<{
          stepId: string;
          inputSchema: { schema?: Record<string, unknown> };
          outputSchema: { schema?: Record<string, unknown> };
          defaultNextStep?: string;
        }>;
      };
    }
  >,
): string {
  return renderUnion(
    Object.entries(commands).flatMap(([, command]) => {
      const completeResult = `{
  complete: true;
  input: ${renderSchemaTypeString(
    command.commandSchema.schema as Record<string, unknown>,
  )};
}`;

      const stepResults = (command.discovery?.steps ?? []).map((step) => {
        const inputSchema = step.inputSchema.schema as Record<string, unknown>;
        const outputSchema = step.outputSchema.schema as Record<
          string,
          unknown
        >;

        return `{
  complete: false;
  step: ${JSON.stringify(step.stepId)};
  options: Array<{
    id: string;
    output: ${renderSchemaTypeString(outputSchema)};
    nextStep: string;
    nextInput: ${renderSchemaTypeString(inputSchema)};
  }>;
}`;
      });

      return [...stepResults, completeResult];
    }),
  );
}

function renderUnion(members: string[]): string {
  if (members.length === 0) {
    return "";
  }

  return members.join(" |\n");
}
