import type { Accept } from "react-dropzone";
import type { FileUploadType } from "@repo/constants";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { FileUpload } from "../FileUpload";
import { PropsWithChildren } from "react";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  useCase?: FileUploadType;
  accept?: Accept;
  acceptMessage?: string;
  disabled?: boolean;
  required?: boolean;
  requiredMessage?: string;
};

export const FormFileUpload = <T extends FieldValues>({
  name,
  control,
  required,
  requiredMessage = "Este campo es obligatorio",
  children,
  ...props
}: PropsWithChildren<Props<T>>) => (
  <Controller
    name={name}
    control={control}
    rules={{
      required: required ? requiredMessage : false,
      validate: (files) => {
        if (required && (!files || files.length === 0)) {
          return requiredMessage;
        }
        return true;
      },
    }}
    render={({ field, fieldState }) => (
      <FileUpload
        value={field.value ?? []}
        onChange={field.onChange}
        error={fieldState.error?.message}
        {...props}
      >
        {children}
      </FileUpload>
    )}
  />
);
