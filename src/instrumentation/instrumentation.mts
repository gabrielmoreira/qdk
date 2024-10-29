import { name, version } from '#package.json';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import * as opentelemetry from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { log } from '../cli/utils.mjs';

export function startTracing({ url }: { url?: string }) {
  // Retrieve environment variables for OTLP configuration if set
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

  // Determine the final URL for traces based on environment variables or fallback options
  const finalUrl =
    url ??
    tracesEndpoint ??
    (otlpEndpoint ? `${otlpEndpoint}/v1/traces` : undefined);

  const resource = opentelemetry.resources.Resource.default().merge(
    new opentelemetry.resources.Resource({
      [ATTR_SERVICE_NAME]: name,
      [ATTR_SERVICE_VERSION]: version,
    }),
  );

  const traceExporter = new OTLPTraceExporter({
    url: finalUrl,
  });

  const sdk = new opentelemetry.NodeSDK({
    resource,
    traceExporter,
  });

  if (tracesEndpoint) {
    log(
      `Enabling OpenTelemetry tracing with OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: ${finalUrl}`,
    );
  } else if (otlpEndpoint) {
    log(
      `Enabling OpenTelemetry tracing with OTEL_EXPORTER_OTLP_ENDPOINT for traces: ${finalUrl}`,
    );
  } else if (url) {
    log(`Enabling OpenTelemetry tracing with URL: ${url}`);
  } else {
    log(
      `Enabling OpenTelemetry tracing with default URL: [http://localhost:4318/v1/traces]. The app will use the OTLP proto trace exporter. Please refer to the documentation for more details: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/`,
    );
  }

  sdk.start();
  return () => sdk.shutdown();
}
