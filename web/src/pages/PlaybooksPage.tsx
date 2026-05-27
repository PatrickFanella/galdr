import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { playbooksApi, type Playbook } from "@/lib/api";

export function PlaybooksPageView({
  playbooks,
  loading,
  error,
  onRetry,
}: {
  playbooks: Playbook[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="galdr-card overflow-hidden p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--galdr-fg-muted)]">
              Automations
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--galdr-fg)]">
              Playbooks
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--galdr-fg-muted)]">
              Build repeatable customer health workflows from Stripe, support,
              and lifecycle signals.
            </p>
          </div>
          <Link
            to="/playbooks/new"
            className="galdr-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> New playbook
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="galdr-alert-danger p-5 text-sm">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="galdr-link mt-2 inline-flex items-center gap-2 font-medium"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      <div className="galdr-card p-5">
        {loading ? (
          <p className="text-sm text-[var(--galdr-fg-muted)]">Loading playbooks...</p>
        ) : playbooks.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-12 w-12" />}
            title="No playbooks yet"
            description="Create your first automated sequence to react to customer health changes."
          />
        ) : (
          <div className="grid gap-3">
            {playbooks.map((playbook) => (
              <article
                key={playbook.id}
                className="rounded-2xl border border-[var(--galdr-border)] bg-[color:rgb(255_255_255_/_0.03)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-[var(--galdr-fg)]">{playbook.name}</h2>
                    <p className="mt-1 text-sm text-[var(--galdr-fg-muted)]">
                      {playbook.description || "No description"}
                    </p>
                  </div>
                  <span className="galdr-badge-muted w-fit">
                    {playbook.enabled ? "Enabled" : "Paused"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--galdr-fg-muted)]">
                  Trigger: {playbook.trigger_type.replace(/_/g, " ")} · Actions: {playbook.actions.length}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPlaybooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await playbooksApi.list();
      setPlaybooks(data.playbooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playbooks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaybooks();
  }, [loadPlaybooks]);

  return (
    <PlaybooksPageView
      playbooks={playbooks}
      loading={loading}
      error={error}
      onRetry={loadPlaybooks}
    />
  );
}
