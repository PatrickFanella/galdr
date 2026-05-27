import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { PlaybookActionType } from "@/lib/api";

export interface BuilderAction {
  id: string;
  action_type: PlaybookActionType;
  action_config: Record<string, unknown>;
}

const ACTIONS: Array<{ value: PlaybookActionType; label: string }> = [
  { value: "send_email", label: "Send email" },
  { value: "internal_alert", label: "Internal alert" },
  { value: "tag_customer", label: "Tag customer" },
  { value: "webhook", label: "Webhook" },
];

interface ActionConfigProps {
  action: BuilderAction;
  index: number;
  total: number;
  onTypeChange: (type: PlaybookActionType) => void;
  onConfigChange: (config: Record<string, unknown>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function ActionConfig({
  action,
  index,
  total,
  onTypeChange,
  onConfigChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ActionConfigProps) {
  const config = action.action_config;

  return (
    <article className="rounded-2xl border border-[var(--galdr-border)] bg-[color:rgb(255_255_255_/_0.03)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--galdr-fg-muted)]">
            Action {index + 1}
          </p>
          <label className="mt-2 block text-sm font-medium text-[var(--galdr-fg)]">
            Action type
            <select
              value={action.action_type}
              onChange={(event) => onTypeChange(event.target.value as PlaybookActionType)}
              className="galdr-input mt-2 w-full px-3 py-2 text-sm sm:min-w-56"
            >
              {ACTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="galdr-icon-button p-2 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move action ${index + 1} up`}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="galdr-icon-button p-2 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move action ${index + 1} down`}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="galdr-icon-button p-2 text-red-300"
            aria-label={`Remove action ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-[var(--galdr-border)] pt-4 md:grid-cols-2">
        {action.action_type === "send_email" && (
          <>
            <TextField
              label="Subject"
              value={stringValue(config.subject)}
              onChange={(value) => onConfigChange({ ...config, subject: value })}
              placeholder="Quick check-in about your account"
            />
            <TextField
              label="Template name"
              value={stringValue(config.template)}
              onChange={(value) => onConfigChange({ ...config, template: value })}
              placeholder="at-risk-customer"
            />
            <TextAreaField
              label="Fallback body"
              value={stringValue(config.body)}
              onChange={(value) => onConfigChange({ ...config, body: value })}
              placeholder="Hi {{customer.name}}, we noticed..."
            />
          </>
        )}

        {action.action_type === "internal_alert" && (
          <>
            <TextField
              label="Alert message"
              value={stringValue(config.message)}
              onChange={(value) => onConfigChange({ ...config, message: value })}
              placeholder="Customer needs attention"
            />
            <TextField
              label="Channel optional"
              value={stringValue(config.channel)}
              onChange={(value) => onConfigChange({ ...config, channel: value })}
              placeholder="#customer-success"
            />
          </>
        )}

        {action.action_type === "tag_customer" && (
          <TextField
            label="Tag"
            value={stringValue(config.tag)}
            onChange={(value) => onConfigChange({ ...config, tag: value })}
            placeholder="at-risk"
          />
        )}

        {action.action_type === "webhook" && (
          <>
            <TextField
              label="Webhook URL"
              value={stringValue(config.url)}
              onChange={(value) => onConfigChange({ ...config, url: value })}
              placeholder="https://example.com/playbook-webhook"
            />
            <TextField
              label="HTTP method"
              value={stringValue(config.method) || "POST"}
              onChange={(value) => onConfigChange({ ...config, method: value.toUpperCase() })}
              placeholder="POST"
            />
            <TextField
              label="Signing secret"
              value={stringValue(config.signing_secret)}
              onChange={(value) => onConfigChange({ ...config, signing_secret: value })}
              placeholder="Used to sign webhook payloads"
            />
          </>
        )}
      </div>
    </article>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-medium text-[var(--galdr-fg)]">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="galdr-input mt-2 w-full px-3 py-2 text-sm"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-medium text-[var(--galdr-fg)] md:col-span-2">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="galdr-input mt-2 w-full px-3 py-2 text-sm"
      />
    </label>
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function defaultActionConfig(type: PlaybookActionType): Record<string, unknown> {
  if (type === "internal_alert") return { message: "Customer needs attention" };
  if (type === "tag_customer") return { tag: "at-risk" };
  if (type === "webhook") return { url: "", method: "POST", signing_secret: "" };
  return { subject: "Customer health changed", template: "health-score-alert", body: "" };
}
