import { useState } from "react";
import {
  useWatch,
  useFormState,
  type Control,
  type FieldValues,
} from "react-hook-form";

/**
 * Lightweight alternative to @hookform/devtools for forms using useFieldArray.
 *
 * RHF DevTools relies on `register()` / `Controller` to discover fields, but
 * `useFieldArray` (v7.50+) freezes its internal array, making any call to
 * `register` on those paths throw "N is read-only". This panel uses `useWatch`
 * instead, which reads values without registering fields.
 */
export const FormDebugPanel = <T extends FieldValues>({
  control,
}: {
  control: Control<T>;
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const values = useWatch({ control });
  const { isDirty, isValid, isSubmitting, isSubmitted, errors } = useFormState({
    control,
  });

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 99999,
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        style={{
          display: "block",
          marginLeft: "auto",
          padding: "4px 10px",
          background: "#ec5990",
          color: "#fff",
          border: "none",
          borderRadius: collapsed ? 4 : "4px 4px 0 0",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        {collapsed ? "Form Debug" : "Collapse"}
      </button>
      {!collapsed && (
        <div
          style={{
            maxHeight: "50vh",
            width: 420,
            overflow: "auto",
            background: "#1e1e2f",
            color: "#e0e0e0",
            padding: 12,
            borderRadius: "4px 0 4px 4px",
          }}
        >
          <div style={{ marginBottom: 8, display: "flex", gap: 12 }}>
            <span>
              Valid:{" "}
              <span style={{ color: isValid ? "#4caf50" : "#f44336" }}>
                {String(isValid)}
              </span>
            </span>
            <span>
              Dirty:{" "}
              <span style={{ color: isDirty ? "#ff9800" : "#4caf50" }}>
                {String(isDirty)}
              </span>
            </span>
            <span>
              Submitting:{" "}
              <span style={{ color: isSubmitting ? "#ff9800" : "#4caf50" }}>
                {String(isSubmitting)}
              </span>
            </span>
            <span>
              Submitted:{" "}
              <span style={{ color: isSubmitted ? "#ff9800" : "#e0e0e0" }}>
                {String(isSubmitted)}
              </span>
            </span>
          </div>
          {Object.keys(errors).length > 0 && (
            <details style={{ marginBottom: 8 }}>
              <summary style={{ color: "#f44336", cursor: "pointer" }}>
                Errors
              </summary>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(errors, null, 2)}
              </pre>
            </details>
          )}
          <details open>
            <summary style={{ cursor: "pointer", marginBottom: 4 }}>
              Values
            </summary>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(values, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
