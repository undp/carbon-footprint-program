import { useMemo } from "react";
import { SystemParameterKeyEnum, type SystemParameterKey } from "@repo/types";
import { useSystemParameters } from "./useSystemParameters";

const FILE_UPLOAD_LIMIT_KEYS: SystemParameterKey[] = [
  SystemParameterKeyEnum.FILE_UPLOAD_MIN_BYTES,
  SystemParameterKeyEnum.FILE_UPLOAD_MAX_BYTES,
];

interface FileUploadLimits {
  minBytes: number;
  maxBytes: number;
  maxMB: number;
}

export const useFileUploadLimits = (): FileUploadLimits | undefined => {
  const { data } = useSystemParameters(FILE_UPLOAD_LIMIT_KEYS);

  return useMemo(() => {
    if (!data) return undefined;
    const byKey = new Map(data.map((p) => [p.key, p.value]));
    const minRaw = byKey.get(SystemParameterKeyEnum.FILE_UPLOAD_MIN_BYTES);
    const maxRaw = byKey.get(SystemParameterKeyEnum.FILE_UPLOAD_MAX_BYTES);
    if (minRaw === undefined || maxRaw === undefined) return undefined;
    const minBytes = Number(minRaw);
    const maxBytes = Number(maxRaw);
    return {
      minBytes,
      maxBytes,
      maxMB: maxBytes / (1024 * 1024),
    };
  }, [data]);
};
