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
import { DeleteOutlined, FileUploadOutlined } from "@mui/icons-material";
import { useDropzone, ErrorCode } from "react-dropzone";
import type { Accept } from "react-dropzone";
import accepts from "attr-accept";
import { MAX_FILE_UPLOAD_SIZE_MB } from "../config/constants";
import { mergeUniqueFiles } from "@/utils/files";

interface FileWithPreview {
  file: File;
  previewUrl: string | null;
}

interface Props {
  value: File[];
  onChange: (files: File[]) => void;
  accept?: Accept;
  acceptMessage?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  error?: string;
}

const isImage = (file: File) => file.type.startsWith("image/");

const defaultAccept = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

const defaultAcceptMessage = (maxFileSizeMB: number) =>
  `JPG, PNG, PDF, XLS, XLSX (máx. ${maxFileSizeMB}MB por archivo)`;

const defaultChildren = (acceptMessage: string) => (
  <Box className="flex cursor-pointer flex-col items-center gap-2 p-8">
    <FileUploadOutlined color="disabled" sx={{ fontSize: "40px" }} />
    <Typography variant="body2" fontWeight={500} color="text.primary">
      Adjuntar documentos
    </Typography>
    <Typography variant="body2" color="text.secondary">
      <Typography
        component="span"
        variant="body2"
        fontWeight={500}
        sx={(theme) => ({ color: theme.palette.primary.main })}
      >
        Click para cargar
      </Typography>
      {" o arrastra y suelta los archivos"}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {acceptMessage}
    </Typography>
  </Box>
);

export const FileUpload: FC<PropsWithChildren<Props>> = ({
  value,
  onChange,
  accept = defaultAccept,
  maxSizeMB = MAX_FILE_UPLOAD_SIZE_MB,
  acceptMessage = defaultAcceptMessage(maxSizeMB),
  disabled = false,
  error,
  children = defaultChildren(acceptMessage),
}) => {
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
      onChange(mergeUniqueFiles(value, incoming));
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
            setDropError(`"${file.name}": tipo de archivo no permitido.`);
            hadRejections = true;
            return;
          }
        }

        if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
          setDropError(
            `"${file.name}": excede el tamaño máximo (${maxSizeMB} MB).`
          );
          hadRejections = true;
          return;
        }

        pasted.push(file);
      });

      if (pasted.length) addFiles(pasted, hadRejections);
    },
    [disabled, accept, maxSizeMB, addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejected) => addFiles(accepted, rejected.length > 0),
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: true,
    disabled,
    onDropRejected: (rejections) => {
      const messages = rejections.map((rejection) => {
        const code = rejection.errors[0]?.code as ErrorCode | undefined;
        const reason =
          code === ErrorCode.FileTooLarge
            ? `excede el tamaño máximo (${maxSizeMB} MB)`
            : code === ErrorCode.FileInvalidType
              ? "tipo de archivo no permitido"
              : "no pudo cargarse";
        return `"${rejection.file.name}": ${reason}.`;
      });
      setDropError(messages.join("\n"));
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

  return (
    <div ref={containerRef} className="flex w-full flex-col gap-2">
      {/* File list */}
      {filesWithPreviews.length > 0 && (
        <List className="flex flex-col gap-1" dense disablePadding>
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
                    marginRight: 3,
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

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
        <input {...getInputProps()} style={{ visibility: "hidden" }} />
        {children}
      </div>

      {/* Error message */}
      {displayError && (
        <FormHelperText error role="alert" sx={{ whiteSpace: "pre-line" }}>
          {displayError}
        </FormHelperText>
      )}
    </div>
  );
};
