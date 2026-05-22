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
import { DeleteOutlined, UploadFileOutlined } from "@mui/icons-material";
import { useDropzone, ErrorCode } from "react-dropzone";
import type { Accept } from "react-dropzone";
import accepts from "attr-accept";
import type { FileUploadType } from "@repo/constants";
import { useFileUploadLimits } from "@/api/query/systemParameters";
import { mergeUniqueFiles } from "@/utils/files";
import { getPolicyAccept } from "@/utils/buildAcceptFromPolicy";

interface FileWithPreview {
  file: File;
  previewUrl: string | null;
}

interface Props {
  value: File[];
  onChange: (files: File[]) => void;
  /**
   * Use case that drives the dropzone's accept map and effective max
   * size. Resolved against FILE_UPLOAD_POLICIES. When omitted, the
   * dropzone falls back to the legacy default (PDF/images/xlsx) and
   * the global FILE_UPLOAD_MAX_BYTES.
   */
  useCase?: FileUploadType;
  accept?: Accept;
  acceptMessage?: string;
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
    <UploadFileOutlined color="disabled" sx={{ fontSize: "40px" }} />
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
  useCase,
  accept,
  acceptMessage,
  disabled = false,
  error,
  children,
}) => {
  const [dropError, setDropError] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const limits = useFileUploadLimits(useCase);
  const maxBytes = limits?.maxBytes;
  const maxSizeMB = limits?.maxMB;
  const resolvedAccept =
    accept ?? (useCase ? getPolicyAccept(useCase) : defaultAccept);

  const resolvedAcceptMessage =
    acceptMessage ??
    (maxSizeMB !== undefined ? defaultAcceptMessage(maxSizeMB) : "");
  const resolvedChildren = children ?? defaultChildren(resolvedAcceptMessage);

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

        const acceptStr = Object.entries(resolvedAccept)
          .flatMap(([mime, exts]) => [mime, ...exts])
          .join(",");

        if (!accepts(file, acceptStr)) {
          setDropError(`"${file.name}": tipo de archivo no permitido.`);
          hadRejections = true;
          return;
        }

        if (maxBytes !== undefined && file.size > maxBytes) {
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
    [disabled, resolvedAccept, maxBytes, maxSizeMB, addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejected) => addFiles(accepted, rejected.length > 0),
    accept: resolvedAccept,
    maxSize: maxBytes,
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
        {resolvedChildren}
      </div>

      {displayError && (
        <FormHelperText error role="alert" sx={{ whiteSpace: "pre-line" }}>
          {displayError}
        </FormHelperText>
      )}
    </div>
  );
};
