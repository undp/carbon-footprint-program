import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DimensionVariablesModal } from "./DimensionVariablesModal";

const WARNING = /más de una variable que funciona como "Otro"/i;

const renderModal = (
  props: Partial<React.ComponentProps<typeof DimensionVariablesModal>> = {}
) =>
  render(
    <DimensionVariablesModal
      open
      dimensionName="Tipo"
      variables={[{ id: "1", value: "Excavadora" }]}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );

describe("DimensionVariablesModal — several 'Otro' variables", () => {
  it("warns when the dimension holds two wordings of the escape hatch", () => {
    renderModal({
      variables: [
        { id: "1", value: "Excavadora" },
        { id: "2", value: "Otros" },
        { id: "3", value: "Otra" },
      ],
    });

    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it("stays quiet with a single escape hatch", () => {
    renderModal({
      variables: [
        { id: "1", value: "Excavadora" },
        { id: "2", value: "Otro" },
      ],
    });

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it("warns as soon as a second wording is typed", () => {
    renderModal({
      variables: [
        { id: "1", value: "Otro" },
        { id: "2", value: "Camión" },
      ],
    });
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Camión"), {
      target: { value: "Otros" },
    });

    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it("does not block saving — the warning is advisory", () => {
    const onSave = vi.fn();
    renderModal({
      variables: [
        { id: "1", value: "Otro" },
        { id: "2", value: "Otros" },
      ],
      onSave,
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("hides the warning on a read-only methodology, where it is not actionable", () => {
    renderModal({
      readOnly: true,
      variables: [
        { id: "1", value: "Otro" },
        { id: "2", value: "Otros" },
      ],
    });

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });
});
