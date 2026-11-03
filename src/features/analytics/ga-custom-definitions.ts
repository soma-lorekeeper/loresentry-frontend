import { USAGE_EVENTS } from "./usage-schema";

/** Keep five event-dimension slots free; raw diagnostic flags do not need report definitions. */
export const UNREGISTERED_USAGE_DIMENSIONS = [
  "schema_version",
  "had_input",
  "body_changed",
  "title_changed",
  "properties_changed",
  "has_reason",
  "operation_group",
] as const;
export const EXISTING_USAGE_DIMENSIONS = ["start_choice"] as const;
export const EXISTING_USAGE_METRICS = ["duration_seconds"] as const;

const dimensions = new Set<string>(["schema_version", "ui_locale"]);
const metrics = new Map<string, "count" | "seconds">();
for (const schema of Object.values(USAGE_EVENTS)) {
  for (const [name, rule] of Object.entries(schema)) {
    if (Array.isArray(rule)) dimensions.add(name);
    else metrics.set(name, rule as "count" | "seconds");
  }
}

export const USAGE_CUSTOM_DIMENSIONS = [...dimensions].filter(
  (name) =>
    !(UNREGISTERED_USAGE_DIMENSIONS as readonly string[]).includes(name) &&
    !(EXISTING_USAGE_DIMENSIONS as readonly string[]).includes(name),
);
export const USAGE_CUSTOM_METRICS = [...metrics]
  .filter(
    ([name]) => !(EXISTING_USAGE_METRICS as readonly string[]).includes(name),
  )
  .map(([parameter, unit]) => ({ parameter, unit }));
