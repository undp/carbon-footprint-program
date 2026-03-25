import {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  FormHelperText,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { CloudUpload, DeleteOutlined } from "@mui/icons-material";
import { useDropzone, ErrorCode } from "react-dropzone";
import type { Accept } from "react-dropzone";
import accepts from "attr-accept";

interface FileWithPreview {
  file: File;
  previewUrl: string | null;
}

interface Props {
  value: File[];
  onChange: (files: File[]) => void;
  accept?: Accept;
  acceptMessage?: string;
  maxSize?: number; // bytes
  disabled?: boolean;
  error?: string;
}

const isImage = (file: File) => file.type.startsWith("image/");

export const FileUpload: FC<PropsWithChildren<Props>> = ({
  value,
  onChange,
  accept,
  acceptMessage,
  maxSize,
  disabled = false,
  error,
  children,
}: PropsWithChildren<Props>) => {
  const [dropError, setDropError] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filesWithPreviews = useMemo<FileWithPreview[]>(
    () =>
      value.map((file) => ({
        file,
        previewUrl: isImage(file) ? URL.createObjectURL(file) : null,
      })),
    [value]
  );

  useEffect(
    () => () => {
      filesWithPreviews.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    },
    [filesWithPreviews]
  );

  const addFiles = useCallback(
    (incoming: File[], hadRejections = false) => {
      if (!incoming.length) return;
      if (!hadRejections) setDropError("");
      onChange([...value, ...incoming]);
    },
    [value, onChange]
  );

  // Clipboard paste support (scoped to this component's container)
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;
      if (!containerRef.current?.contains(document.activeElement)) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pasted: File[] = [];
      let hadRejections = false;
      Array.from(items).forEach((item) => {
        if (item.kind !== "file") return;
        const file = item.getAsFile();
        if (!file) return;

        if (accept) {
          const acceptStr = Object.entries(accept)
            .flatMap(([mime, exts]) => [mime, ...exts])
            .join(",");

          if (!accepts(file, acceptStr)) {
            setDropError("Tipo de archivo no permitido.");
            hadRejections = true;
            return;
          }
        }

        if (maxSize && file.size > maxSize) {
          setDropError(
            `El archivo es demasiado grande. Tamaño máximo: ${(maxSize / (1024 * 1024)).toFixed(0)} MB`
          );
          hadRejections = true;
          return;
        }

        pasted.push(file);
      });

      if (pasted.length) addFiles(pasted, hadRejections);
    },
    [disabled, accept, maxSize, addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejected) => addFiles(accepted, rejected.length > 0),
    accept,
    maxSize,
    multiple: true,
    disabled,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code as ErrorCode | undefined;
      if (code === ErrorCode.FileTooLarge) {
        setDropError(
          `El archivo es demasiado grande. Tamaño máximo: ${((maxSize ?? 0) / (1024 * 1024)).toFixed(0)} MB`
        );
      } else if (code === ErrorCode.FileInvalidType) {
        setDropError("Tipo de archivo no permitido.");
      } else {
        setDropError("Error al cargar el archivo.");
      }
    },
  });

  const removeFile = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
      setDropError("");
    },
    [value, onChange]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const displayError = dropError || error;

  const defaultChildren = (
    <Box className="flex w-full flex-col items-center gap-3 p-4">
      <CloudUpload sx={{ color: "text.secondary", fontSize: 40 }} />
      <Typography variant="caption" color="text.secondary" textAlign="center">
        Haz clic para seleccionar, arrastra o pega el archivo aquí
      </Typography>
      {acceptMessage && (
        <Typography variant="caption" color="text.secondary">
          {acceptMessage}
        </Typography>
      )}
    </Box>
  );

  return (
    <div ref={containerRef} className="flex w-full flex-col gap-2">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Subir archivos: haz clic, arrastra o pega"
        aria-disabled={disabled}
        className={`flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 transition-all duration-200 ${
          displayError
            ? "border-red-600!"
            : isDragActive
              ? "border-primary! bg-primary/10"
              : ""
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${!disabled && !displayError ? "hover:border-primary!" : ""}`}
      >
        <input {...getInputProps()} />
        {children ?? defaultChildren}
      </div>

      {/* File list */}
      {filesWithPreviews.length > 0 && (
        <List dense disablePadding>
          {filesWithPreviews.map(({ file, previewUrl }, index) => (
            <ListItem
              classes={{
                secondaryAction: "right-[4px]!",
              }}
              key={`${file.name}-${index}`}
              disableGutters
              secondaryAction={
                <IconButton
                  size="small"
                  aria-label={`Eliminar ${file.name}`}
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <DeleteOutlined fontSize="small" color="error" />
                </IconButton>
              }
              sx={{
                backgroundColor: "action.hover",
                borderRadius: 2,
                mb: 0.5,
                px: 1,
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: "cover",
                    borderRadius: 4,
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <ListItemText
                primary={file.name}
                slotProps={{
                  primary: {
                    variant: "caption",
                    noWrap: true,
                    title: file.name,
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Error message */}
      {displayError && (
        <FormHelperText error role="alert">
          {displayError}
        </FormHelperText>
      )}
    </div>
  );
};
