import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Save } from "lucide-react";
import ActionConfig, {
  defaultActionConfig,
  type BuilderAction,
} from "@/components/playbooks/ActionConfig";
import TriggerConfig, {
  defaultTriggerConfig,
  type TriggerConfigValue,
} from "@/components/playbooks/TriggerConfig";
import {
  playbooksApi,
  type CreatePlaybookPayload,
  type PlaybookActionType,
  type PlaybookTriggerType,
} from "@/lib/api";

interface PlaybookBuilderViewProps {
  saving: boolean;
  error: string;
  onSave: (payload: CreatePlaybookPayload) => Promise<void>;
}

const triggerLabels: Record<PlaybookTriggerType, string> = {
  score_threshold: "health score drops below 40",
  customer_event: "payment failed",
  schedule: "scheduled interval",
};

const actionLabels: Record<PlaybookActionType, string> = {
  send_email: "send email",
  internal_alert: "create internal alert",
  tag_customer: "tag customer",
  webhook: "call webhook",
};

export function PlaybookBuilderView({
  saving,
  error,
  onSave,
}: PlaybookBuilderViewProps) {
  const [name, setName] = useState("At-risk customer recovery");
  const [description, setDescription] = useState(
    "Coordinate follow-up when customer health changes.",
  );
  const [triggerType, setTriggerType] =
    useState<PlaybookTriggerType>("score_threshold");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfigValue>(
    defaultTriggerConfig("score_threshold"),
  );
  const [actions, setActions] = useState<BuilderAction[]>([
    {
      id: crypto.randomUUID(),
      action_type: "internal_alert",
      action_config: defaultActionConfig("internal_alert"),
    },
  ]);
  const [validationError, setValidationError] = useState("");

  function changeTriggerType(nextType: PlaybookTriggerType) {
    setTriggerType(nextType);
    setTriggerConfig(defaultTriggerConfig(nextType));
  }

  function addAction(type: PlaybookActionType = "send_email") {
    setActions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        action_type: type,
        action_config: defaultActionConfig(type),
      },
    ]);
  }

  function updateAction(index: number, next: BuilderAction) {
    setActions((current) =>
      current.map((action, actionIndex) => (actionIndex === index ? next : action)),
    );
  }

  function moveAction(index: number, direction: -1 | 1) {
    setActions((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function removeAction(index: number) {
    setActions((current) => current.filter((_, actionIndex) => actionIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Playbook name is required.");
      return;
    }
    if (actions.length === 0) {
      setValidationError("Add at least one action before saving.");
      return;
    }

    await onSave({
      name: trimmedName,
      description: description.trim(),
      trigger_type: triggerType,
      trigger_config: compactConfig(triggerConfig),
      actions: actions.map((action) => ({
        action_type: action.action_type,
        action_config: compactConfig(action.action_config),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="galdr-card overflow-hidden p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--galdr-fg-muted)]">
              Visual builder
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--galdr-fg)]">
              Build a playbook
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--galdr-fg-muted)]">
              Define the trigger on the left, compose ordered actions on the right,
              then save the automation for future customer health events.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/playbooks" className="galdr-button-secondary px-4 py-2 text-sm">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="galdr-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save playbook"}
            </button>
          </div>
        </div>
      </div>

      {(validationError || error) && (
        <div role="alert" className="galdr-alert-danger p-4 text-sm">
          {validationError || error}
        </div>
      )}

      <section className="galdr-card grid gap-4 p-5 lg:grid-cols-2">
        <label className="block text-sm font-medium text-[var(--galdr-fg)]">
          Playbook name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="galdr-input mt-2 w-full px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-[var(--galdr-fg)]">
          Description
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="galdr-input mt-2 w-full px-3 py-2 text-sm"
          />
        </label>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(360px,1.15fr)]">
        <TriggerConfig
          triggerType={triggerType}
          config={triggerConfig}
          onTypeChange={changeTriggerType}
          onConfigChange={setTriggerConfig}
        />

        <section className="galdr-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--galdr-fg-muted)]">
                Actions
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--galdr-fg)]">
                What should happen next?
              </h2>
            </div>
            <button
              type="button"
              onClick={() => addAction()}
              className="galdr-button-secondary inline-flex items-center gap-2 px-3 py-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Add action
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {actions.map((action, index) => (
              <ActionConfig
                key={action.id}
                action={action}
                index={index}
                total={actions.length}
                onTypeChange={(type) =>
                  updateAction(index, {
                    ...action,
                    action_type: type,
                    action_config: defaultActionConfig(type),
                  })
                }
                onConfigChange={(config) => updateAction(index, { ...action, action_config: config })}
                onRemove={() => removeAction(index)}
                onMoveUp={() => moveAction(index, -1)}
                onMoveDown={() => moveAction(index, 1)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="galdr-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--galdr-fg-muted)]">
          Summary preview
        </p>
        <p className="mt-3 text-lg font-semibold text-[var(--galdr-fg)]">
          When {summaryTrigger(triggerType, triggerConfig)} → Do {summaryActions(actions)}
        </p>
      </section>
    </form>
  );
}

export default function PlaybookBuilderPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function savePlaybook(payload: CreatePlaybookPayload) {
    setSaving(true);
    setError("");
    try {
      await playbooksApi.create(payload);
      navigate("/playbooks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save playbook.");
    } finally {
      setSaving(false);
    }
  }

  return <PlaybookBuilderView saving={saving} error={error} onSave={savePlaybook} />;
}

function compactConfig(config: object) {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== "" && value !== undefined),
  );
}

function summaryTrigger(type: PlaybookTriggerType, config: TriggerConfigValue) {
  if (type === "score_threshold") {
    return `health score ${config.direction === "above" ? "rises above" : "drops below"} ${config.threshold ?? 40}`;
  }
  if (type === "customer_event") {
    return `${humanize(String(config.event_type ?? "customer_event"))} occurs`;
  }
  if (config.cron) return `cron ${config.cron} runs`;
  return `every ${config.interval_minutes ?? 1440} minutes`;
}

function summaryActions(actions: BuilderAction[]) {
  if (actions.length === 0) return "nothing yet";
  return actions.map((action) => actionLabels[action.action_type]).join(" → ");
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export { triggerLabels, actionLabels };
