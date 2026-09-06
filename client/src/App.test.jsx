import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import App from "./App";

test("shows the parent sign-in experience", () => {
  sessionStorage.clear();
  render(<MemoryRouter initialEntries={["/login"]}><App/></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /sign in to your family space/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
});
