import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GEIBreakdownModal } from "./GEIBreakdownModal";

const EMPTY = {
  CO2_FOSSIL: 0,
  CH4: 0,
  N2O: 0,
  HFC: 0,
  PFC: 0,
  SF6: 0,
  NF3: 0,
};

const renderModal = (declaredValue: number, onSave = vi.fn()) => {
  render(
    <GEIBreakdownModal
      open
      gasDetails={EMPTY}
      declaredValue={declaredValue}
      onSave={onSave}
      onClose={vi.fn()}
    />
  );
  // Rows follow the gas order: CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃.
  const [co2Fossil, ch4] = screen.getAllByRole("textbox");
  return { co2Fossil, ch4, onSave };
};

const saveButton = () =>
  screen.getByRole("button", { name: "Guardar desglose" });

describe("GEIBreakdownModal", () => {
  it("keeps a decimal comma while typing", () => {
    const { co2Fossil } = renderModal(0);

    fireEvent.change(co2Fossil, { target: { value: "0,1" } });

    expect(co2Fossil).toHaveValue("0,1");
  });

  it("saves a breakdown that adds up to the declared value", () => {
    const { co2Fossil, ch4, onSave } = renderModal(0.16);

    fireEvent.change(co2Fossil, { target: { value: "0,15" } });
    fireEvent.change(ch4, { target: { value: "0,01" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("0,16")).toHaveLength(2);
    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({
      ...EMPTY,
      CO2_FOSSIL: 0.15,
      CH4: 0.01,
    });
  });

  it("counts an emptied gas as 0 and saves it as 0", () => {
    const { co2Fossil, ch4, onSave } = renderModal(0.16);

    fireEvent.change(co2Fossil, { target: { value: "0,16" } });
    fireEvent.change(ch4, { target: { value: "" } });

    expect(ch4).toHaveValue("");
    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({ ...EMPTY, CO2_FOSSIL: 0.16 });
  });

  it("blocks a breakdown that is off by more than 1e-4", () => {
    const { co2Fossil } = renderModal(0.16);

    fireEvent.change(co2Fossil, { target: { value: "0,15" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La suma del desglose (0,15) no coincide con el valor declarado (0,16)"
    );
    expect(saveButton()).toBeDisabled();
  });
});
