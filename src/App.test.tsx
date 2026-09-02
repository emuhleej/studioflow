import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { StudioProvider } from "./state/studio-store";

describe("StudioFlow application shell", () => {
  it("opens the safe fictional Creator HQ demo", async () => {
    render(
      <MemoryRouter>
        <StudioProvider>
          <App />
        </StudioProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Your studio, at a glance." })).toBeInTheDocument();
    expect(screen.getByText("Fictional demo workspace")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });
});
