export type TelemetrySource = "admin" | "api" | "internal";

export type TelemetryContext = {
  userId: string | null;
  source: TelemetrySource;
  agent?: string | null;
  endpoint?: string | null;
};
