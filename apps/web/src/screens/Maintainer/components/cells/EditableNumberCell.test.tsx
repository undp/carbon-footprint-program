import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { EditableNumberCell } from "./EditableNumberCell";

const FormWrapper = ({
  value,
  children,
}: {
  value: number | null;
  children: ReactNode;
}) => {
  const form = useForm({ defaultValues: { emissionFactors: [{ value }] } });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderCell = ({
  value,
  isEditing,
  onChange = vi.fn(),
}: {
  value: number | null;
  isEditing: boolean;
  onChange?: (value: number | null) => void;
}) =>
  render(
    <FormWrapper value={value}>
      <EditableNumberCell
        rowIndex={0}
        fieldName="value"
        isEditing={isEditing}
        onChange={onChange}
      />
    </FormWrapper>
  );

describe("EditableNumberCell", () => {
  it("reads a decimal comma and commits it on blur", () => {
    const onChange = vi.fn();
    renderCell({ value: null, isEditing: true, onChange });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0,16" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(0.16);
  });

  it("commits null when the cell is emptied", () => {
    const onChange = vi.fn();
    renderCell({ value: 0.177, isEditing: true, onChange });

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("0,177");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows a stored factor with a decimal comma in read mode", () => {
    renderCell({ value: 0.177, isEditing: false });

    expect(screen.getByText("0,177")).toBeInTheDocument();
  });

  it("groups thousands in read mode", () => {
    renderCell({ value: 1000000, isEditing: false });

    expect(screen.getByText("1.000.000")).toBeInTheDocument();
  });
});
