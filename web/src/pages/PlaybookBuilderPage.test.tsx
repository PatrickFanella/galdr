import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybookBuilderView } from "./PlaybookBuilderPage";
import type { CreatePlaybookPayload } from "@/lib/api";

describe("PlaybookBuilderView", () => {
  afterEach(() => {
    cleanup();
  });

  it("configures triggers, manages action order, previews, and saves", async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn<(payload: CreatePlaybookPayload) => Promise<void>>()
      .mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <PlaybookBuilderView saving={false} error="" onSave={onSave} />
      </MemoryRouter>,
    );

    expect(screen.getByText("When should this playbook run?")).toBeInTheDocument();
    expect(screen.getByText("What should happen next?")).toBeInTheDocument();
    expect(
      screen.getByText(/When health score drops below 40 → Do create internal alert/),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Trigger type"), "customer_event");
    expect(screen.getByLabelText("Event type")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Event type"), "subscription_canceled");
    expect(
      screen.getByText(/When subscription canceled occurs → Do create internal alert/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add action/i }));
    const actionCards = screen.getAllByRole("article");
    await user.selectOptions(within(actionCards[1]).getByLabelText("Action type"), "tag_customer");
    await user.clear(screen.getByLabelText("Tag"));
    await user.type(screen.getByLabelText("Tag"), "save-now");
    expect(
      screen.getByText(/Do create internal alert → tag customer/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Move action 2 up" }));
    expect(
      screen.getByText(/Do tag customer → create internal alert/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove action 2" }));
    expect(screen.getByText(/Do tag customer/)).toBeInTheDocument();
    expect(screen.queryByText(/create internal alert/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save playbook/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as CreatePlaybookPayload;
    expect(payload).toMatchObject({
      name: "At-risk customer recovery",
      trigger_type: "customer_event",
      trigger_config: { event_type: "subscription_canceled" },
      actions: [
        {
          action_type: "tag_customer",
          action_config: { tag: "save-now" },
        },
      ],
    });
  });
});
