import { NodeTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Metadata } from "@grpc/grpc-js";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
import { AnthropicInstrumentation } from "@arizeai/openinference-instrumentation-anthropic";
import Anthropic from "@anthropic-ai/sdk";

const PROJECT_NAME = process.env.ARIZE_PROJECT_NAME ?? "previsit";

/**
 * Arize cloud tracing. Auto-instruments @anthropic-ai/sdk via OpenInference, so
 * every Claude call (extraction + summary) shows up as a trace with the full
 * prompt in / JSON out, latency, and token counts.
 *
 * Must run before any Claude call. SimpleSpanProcessor flushes per-span so the
 * trace is visible in app.arize.com immediately after a request (demo moment).
 *
 * Fails gracefully: if creds are missing it warns and leaves Claude untraced
 * rather than crashing the server.
 */
export async function initArize(): Promise<void> {
  const spaceId = process.env.ARIZE_SPACE_ID;
  const apiKey = process.env.ARIZE_API_KEY;
  if (!spaceId || !apiKey) {
    console.warn("[arize] ARIZE_SPACE_ID / ARIZE_API_KEY not set — tracing disabled");
    return;
  }

  const metadata = new Metadata();
  metadata.set("space_id", spaceId);
  metadata.set("api_key", apiKey);

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: PROJECT_NAME,
      [SEMRESATTRS_PROJECT_NAME]: PROJECT_NAME, // required — Arize rejects spans without it
    }),
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({ url: "https://otlp.arize.com/v1", metadata }),
      ),
    ],
  });
  provider.register();

  // ESM: patch the already-imported Anthropic module in place.
  new AnthropicInstrumentation().manuallyInstrument(Anthropic);

  console.log(`[arize] tracing enabled → project "${PROJECT_NAME}"`);
}
