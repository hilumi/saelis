import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConversationComposer } from "@/components/companion/conversation-composer";

afterEach(() => {
  sessionStorage.clear();
});

describe("ConversationComposer — drafts survive", () => {
  it("mirrors the draft to sessionStorage while typing", async () => {
    const user = userEvent.setup();
    render(<ConversationComposer onSend={vi.fn()} />);
    await user.type(screen.getByLabelText("Your message"), "half a thought");
    expect(sessionStorage.getItem("saelis-composer-draft")).toBe("half a thought");
  });

  it("restores an unsent draft after a reload", () => {
    sessionStorage.setItem("saelis-composer-draft", "where was I…");
    render(<ConversationComposer onSend={vi.fn()} />);
    expect(screen.getByLabelText("Your message")).toHaveValue("where was I…");
  });

  it("clears the stored draft only after a successful send", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => true);
    render(<ConversationComposer onSend={onSend} />);
    await user.type(screen.getByLabelText("Your message"), "off it goes");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("off it goes");
    expect(sessionStorage.getItem("saelis-composer-draft")).toBeNull();
    expect(screen.getByLabelText("Your message")).toHaveValue("");
  });

  it("keeps the draft (field and storage) when sending fails", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => false);
    render(<ConversationComposer onSend={onSend} />);
    await user.type(screen.getByLabelText("Your message"), "not lost");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByLabelText("Your message")).toHaveValue("not lost");
    expect(sessionStorage.getItem("saelis-composer-draft")).toBe("not lost");
  });
});
