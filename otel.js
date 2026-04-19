import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

const provider = new WebTracerProvider({
  resource: new Resource({ 'service.name': 'payment-calculator-client' }),
});

provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: 'https://api.honeycomb.io/v1/traces',
      headers: { 'x-honeycomb-team': 'HONEYCOMB_API_KEY' },
    })
  )
);

provider.register();

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      // Inject traceparent headers into requests to the backend.
      // Update this pattern to match your backend's origin in production.
      propagateTraceHeaderCorsUrls: [/.*/],
    }),
  ],
});
