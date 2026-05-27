import type { PlaybookTriggerType } from "@/lib/api";

export interface TriggerConfigValue {
  threshold?: number;
  direction?: "above" | "below";
  event_type?: string;
  interval_minutes?: number;
  cron?: string;
}

const TRIGGERS: Array<{ value: PlaybookTriggerType; label: string; hint: string }> = [
  {
    value: "score_threshold",
    label: "Health score threshold",
    hint: "Run when a customer's score crosses a configured level.",
  },
  {
    value: "customer_event",
    label: "Customer event",
    hint: "Run when a customer lifecycle or integration event is received.",
  },
  {
    value: "schedule",
    label: "Schedule",
    hint: "Run on a recurring interval or cron expression.",
  },
];

interface TriggerConfigProps {
  triggerType: PlaybookTriggerType;
  config: TriggerConfigValue;
  onTypeChange: (type: PlaybookTriggerType) => void;
  onConfigChange: (config: TriggerConfigValue) => void;
}

export default function TriggerConfig({
  triggerType,
  config,
  onTypeChange,
  onConfigChange,
}: TriggerConfigProps) {
  const selected = TRIGGERS.find((trigger) => trigger.value === triggerType);

  return (
    <section className="galdr-card p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--galdr-fg-muted)]">
          Trigger
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--galdr-fg)]">
          When should this playbook run?
        </h2>
      </div>

      <label className="mt-5 block text-sm font-medium text-[var(--galdr-fg)]">
        Trigger type
        <select
          value={triggerType}
          onChange={(event) => onTypeChange(event.target.value as PlaybookTriggerType)}
          className="galdr-input mt-2 w-full px-3 py-2 text-sm"
        >
          {TRIGGERS.map((trigger) => (
            <option key={trigger.value} value={trigger.value}>
              {trigger.label}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <p className="mt-2 text-sm text-[var(--galdr-fg-muted)]">{selected.hint}</p>
      )}

      <div className="mt-5 space-y-4 border-t border-[var(--galdr-border)] pt-5">
        {triggerType === "score_threshold" && (
          <>
            <label className="block text-sm font-medium text-[var(--galdr-fg)]">
              Direction
              <select
                value={config.direction ?? "below"}
                onChange={(event) =>
                  onConfigChange({ ...config, direction: event.target.value as "above" | "below" })
                }
                className="galdr-input mt-2 w-full px-3 py-2 text-sm"
              >
                <option value="below">Drops below</option>
                <option value="above">Rises above</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--galdr-fg)]">
              Health score threshold
              <input
                type="number"
                min="0"
                max="100"
                value={config.threshold ?? 40}
                onChange={(event) =>
                  onConfigChange({ ...config, threshold: Number(event.target.value) })
                }
                className="galdr-input mt-2 w-full px-3 py-2 text-sm"
              />
            </label>
          </>
        )}

        {triggerType === "customer_event" && (
          <label className="block text-sm font-medium text-[var(--galdr-fg)]">
            Event type
            <select
              value={config.event_type ?? "payment_failed"}
              onChange={(event) => onConfigChange({ ...config, event_type: event.target.value })}
              className="galdr-input mt-2 w-full px-3 py-2 text-sm"
            >
              <option value="payment_failed">Payment failed</option>
              <option value="subscription_canceled">Subscription canceled</option>
              <option value="ticket_created">Support ticket created</option>
              <option value="customer_created">Customer created</option>
            </select>
          </label>
        )}

        {triggerType === "schedule" && (
          <>
            <label className="block text-sm font-medium text-[var(--galdr-fg)]">
              Run every N minutes
              <input
                type="number"
                min="5"
                value={config.interval_minutes ?? 1440}
                onChange={(event) =>
                  onConfigChange({ ...config, interval_minutes: Number(event.target.value) })
                }
                className="galdr-input mt-2 w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--galdr-fg)]">
              Cron expression optional
              <input
                type="text"
                value={config.cron ?? ""}
                onChange={(event) => onConfigChange({ ...config, cron: event.target.value })}
                placeholder="0 9 * * 1"
                className="galdr-input mt-2 w-full px-3 py-2 text-sm"
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}

export function defaultTriggerConfig(type: PlaybookTriggerType): TriggerConfigValue {
  if (type === "customer_event") return { event_type: "payment_failed" };
  if (type === "schedule") return { interval_minutes: 1440, cron: "" };
  return { threshold: 40, direction: "below" };
}
