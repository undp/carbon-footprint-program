import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { findOnboardingTarget } from "@/utils/onboardingHighlight";
import { EmissionEditorActionsCell } from "./EmissionEditorActionsCell";

const renderCell = (
  props: Partial<Parameters<typeof EmissionEditorActionsCell>[0]> = {}
) =>
  render(
    <EmissionEditorActionsCell
      rowId="line-1"
      uploadFiles={vi.fn()}
      updateComment={vi.fn()}
      deleteSource={vi.fn()}
      {...props}
    />
  );

describe("EmissionEditorActionsCell", () => {
  describe("onboarding targets", () => {
    // The two hints resolve their target by `data-onboarding-id`, and these
    // ids ride on MUI `Badge`s. Asserting they reach the DOM keeps the hints
    // from silently polling for five seconds and giving up.
    it("tags each action so its own hint can find it", () => {
      renderCell();

      const attachments = findOnboardingTarget(
        "emission-capture-line-attachments"
      )();
      const extraInfo = findOnboardingTarget(
        "emission-capture-line-extra-info"
      )();

      expect(attachments).toBeInTheDocument();
      expect(extraInfo).toBeInTheDocument();
      expect(attachments).not.toBe(extraInfo);
    });

    it("keeps the delete button out of both spotlights", () => {
      // `runOnboardingHighlight` listens for clicks on the resolved element,
      // so a delete button inside one would mark that hint as followed and
      // burn it for a user who never read it.
      renderCell();
      const deleteButton = screen.getByRole("button", {
        name: "Eliminar fuente",
      });

      for (const id of [
        "emission-capture-line-attachments",
        "emission-capture-line-extra-info",
      ] as const) {
        expect(findOnboardingTarget(id)()?.contains(deleteButton)).toBe(false);
      }
    });

    it("tags nothing when the actions it introduces are absent", () => {
      renderCell({ uploadFiles: undefined, updateComment: undefined });

      expect(
        findOnboardingTarget("emission-capture-line-attachments")()
      ).toBeNull();
      expect(
        findOnboardingTarget("emission-capture-line-extra-info")()
      ).toBeNull();
    });
  });

  it("routes each action to its own handler", () => {
    const uploadFiles = vi.fn();
    const updateComment = vi.fn();
    const deleteSource = vi.fn();
    renderCell({ uploadFiles, updateComment, deleteSource });

    fireEvent.click(screen.getByRole("button", { name: "Adjuntar archivos" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar información adicional" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Eliminar fuente" }));

    expect(uploadFiles).toHaveBeenCalledWith("line-1");
    expect(updateComment).toHaveBeenCalledWith("line-1");
    expect(deleteSource).toHaveBeenCalledWith("line-1");
  });
});
