import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { SubcategoryHeader } from "./SubcategoryHeader";
import { SubcategoryDataGrid } from "./SubtegoryDataGrid";
import {
  Box,
  Typography,
  Button,
  Collapse,
  MenuItem,
  Select,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  EmissionFactorDimension,
  CarbonInventoryLine,
  Subcategory,
} from "@repo/types";
import { round, uniqBy } from "lodash-es";
import { useMeasurementUnits, useRateMeasurementUnits } from "@/api/query";
import { ActionsCell } from "./ActionsCell";
import { NumericInput } from "@/components";
import { CommentDialog } from "./CommentDialog";
import { useCarbonInventoryState } from "../../hooks/useCarbonInventoryState";
import { AddRounded } from "@mui/icons-material";

interface Props {
  subcategory: Subcategory;
  categoryPosition: number;
  lines: CarbonInventoryLine[];
}

export const SubcategoryContainer: FC<Props> = ({
  subcategory,
  categoryPosition,
  lines,
}) => {
  const { data: measurementUnits } = useMeasurementUnits();
  const { data: rateMeasurementUnits } = useRateMeasurementUnits();

  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [currentRowId, setCurrentRowId] = useState<string>("");

  // Zustand store
  const subcategoryState = useCarbonInventoryState(
    (state) => state.subcategories[subcategory.id]
  );

  const addLine = useCarbonInventoryState((state) => state.addLine);
  const updateLine = useCarbonInventoryState((state) => state.updateLine);
  const deleteLine = useCarbonInventoryState((state) => state.deleteLine);
  const setTotalEmission = useCarbonInventoryState(
    (state) => state.setTotalEmission
  );
  const setManualEmissionsMode = useCarbonInventoryState(
    (state) => state.setManualEmissionsMode
  );
  const initializeSubcategory = useCarbonInventoryState(
    (state) => state.initializeSubcategory
  );

  const onChangeCell = useCallback(
    (
      value: string,
      params: GridRenderCellParams<CarbonInventoryLine, string | number | null>
    ) => {
      // Update Zustand store with new dimension value
      updateLine(subcategory.id, params.id.toString(), {
        [params.field]: value,
      });
      // Update DataGrid UI to reflect the change immediately
      params.api.updateRows([
        {
          id: params.id,
          [params.field]: value,
        },
      ]);
    },
    [subcategory.id, updateLine]
  );

  const rows = useMemo(
    () => subcategoryState?.lines || [],
    [subcategoryState?.lines]
  );
  const isTotalManualEmissionsMode =
    subcategoryState?.isTotalManualEmissionsMode || false;

  const calculatedTotalEmission = useMemo(() => {
    return rows.reduce((acc, row) => {
      const quantity = row.quantity || 0;
      const factorValue = row.factorValue || 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [rows]);

  const totalEmission = isTotalManualEmissionsMode
    ? subcategoryState?.totalEmission || 0
    : calculatedTotalEmission;

  const dimensions: EmissionFactorDimension[] | undefined = useMemo(
    () => subcategory.dimensions,
    [subcategory.dimensions]
  );

  const columns: GridColDef<CarbonInventoryLine>[] = useMemo(() => {
    const firstDimension = dimensions.find((d) => d.position === 1);
    const secondDimension = dimensions.find((d) => d.position === 2);

    return [
      ...(firstDimension
        ? [
            {
              field: `dimensionValue1Id`,
              headerName: firstDimension?.name || "Dimensión 1",
              minWidth: 157,
              flex: 1,
              cellClassName: "content-center max-h-[56px]",
              renderCell: (
                params: GridRenderCellParams<CarbonInventoryLine, string>
              ) => (
                <Select
                  id={params.field}
                  value={params.value || ""}
                  fullWidth
                  size="small"
                  onChange={(e) => onChangeCell(e.target.value, params)}
                >
                  {firstDimension?.values.map(({ id, value }) => (
                    <MenuItem key={id} value={id}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              ),
            },
          ]
        : []),
      ...(secondDimension
        ? [
            {
              field: `dimensionValue2Id`,
              headerName: secondDimension?.name || "Dimensión 2",
              minWidth: 157,
              flex: 1,
              cellClassName: "content-center max-h-[56px]",
              renderCell: (
                params: GridRenderCellParams<CarbonInventoryLine, string>
              ) => (
                <Select
                  id={params.field}
                  value={params.value || ""}
                  fullWidth
                  size="small"
                  onChange={(e) => onChangeCell(e.target.value, params)}
                >
                  {secondDimension?.values
                    .filter(
                      (v) =>
                        !params.row.dimensionValue1Id ||
                        v.parentValueId === params.row.dimensionValue1Id
                    )
                    .map(({ id, value }) => (
                      <MenuItem key={id} value={id}>
                        {value}
                      </MenuItem>
                    ))}
                </Select>
              ),
            },
          ]
        : []),
      {
        headerName: "Unidad",
        field: "measurementUnitId",
        headerAlign: "center",
        minWidth: 110,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<CarbonInventoryLine, string>
        ) => (
          <Select
            id={`measurementUnitId_${params.id}`}
            value={params.value || ""}
            fullWidth
            size="small"
            onChange={(e) => onChangeCell(e.target.value, params)}
          >
            {measurementUnits?.map(({ id, name }) => (
              <MenuItem key={name} value={id}>
                {name}
              </MenuItem>
            ))}
          </Select>
        ),
      },
      {
        headerName: "Cantidad",
        field: "quantity",
        headerAlign: "center",
        minWidth: 110,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<CarbonInventoryLine, number | null>
        ) => (
          <NumericInput
            value={params.value}
            onChange={(e) => onChangeCell(e.target.value, params)}
          />
        ),
      },
      {
        headerName: "Factor",
        field: "factorValue",
        headerAlign: "center",
        align: "right",
        minWidth: 130,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<CarbonInventoryLine, number | null>
        ) => {
          const unit = rateMeasurementUnits?.find(
            (rmu) => rmu.denominatorUnit.id === params.row.measurementUnitId
          );

          return params.row.factorSource === "Factor Propio" ||
            params.row.factorSource === "Otro" ? (
            <NumericInput
              value={params.value}
              suffix={unit?.abbreviation ?? ""}
              onChange={(e) => onChangeCell(e.target.value, params)}
            />
          ) : (
            <Typography>
              {params.value} {unit?.abbreviation ?? ""}
            </Typography>
          );
        },
      },
      {
        headerName: "Fuente factor",
        field: "factorSource",
        minWidth: 157,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<CarbonInventoryLine, string>
        ) => (
          <Select
            id={`factorSource_${params.id}`}
            value={params.value || ""}
            fullWidth
            size="small"
            onChange={(e) => onChangeCell(e.target.value, params)}
          >
            {uniqBy(subcategory.emissionFactors, "source")?.map(
              ({ source }) => (
                <MenuItem key={source} value={source ?? ""}>
                  {source}
                </MenuItem>
              )
            )}
            <MenuItem value="Factor Propio">Factor Propio</MenuItem>
            <MenuItem value="Otro">Otro</MenuItem>
          </Select>
        ),
      },
      {
        headerName: "Emisiones tCO₂e",
        field: "totalEmissions",
        headerAlign: "center",
        cellClassName: "content-center",
        minWidth: 157,
        flex: 1,
        align: "right",
        renderCell: (
          params: GridRenderCellParams<CarbonInventoryLine, number | null>
        ) => {
          const quantity = params.row.quantity || 0;
          const factorValue = params.row.factorValue || 0;
          const totalEmissions = round(quantity * factorValue, 2);

          return <Typography>{totalEmissions}</Typography>;
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        headerAlign: "center",
        minWidth: 157,
        flex: 1,
        cellClassName: "content-center",
        renderCell: (params: GridRenderCellParams<CarbonInventoryLine>) => (
          <ActionsCell
            rowId={params.id}
            categoryPosition={categoryPosition}
            uploadFiles={() => {
              //TODO: Implement upload files functionality
            }}
            updateComment={() => {
              setCurrentRowId(params.id.toString());
              setCurrentComment(params.row.comment || "");
              setCommentDialogOpen(true);
            }}
            deleteSource={() => {
              deleteLine(subcategory.id, params.id.toString());
            }}
          />
        ),
      },
    ];
  }, [
    dimensions,
    subcategory.id,
    subcategory.emissionFactors,
    measurementUnits,
    rateMeasurementUnits,
    categoryPosition,
    deleteLine,
    onChangeCell,
  ]);

  // Inicializar subcategoría con datos del servidor
  useEffect(() => {
    if (!subcategoryState && lines.length > 0) {
      initializeSubcategory(subcategory.id, lines);
    }
  }, [subcategoryState, lines, subcategory.id, initializeSubcategory]);

  const onAddRow = useCallback(() => {
    const newRow: CarbonInventoryLine = {
      id: (Date.now() + Math.random()).toString(),
      subcategoryId: subcategory.id.toString(),
      isManualTotalEmissions: false,
      dimensionValue1Id: null,
      dimensionValue2Id: null,
      measurementUnitId: null,
      quantity: null,
      factorValue: null,
      factorSource: null,
      factorRateMeasurementUnitId: null,
      comment: null,
      manualTotalEmissions: null,
    };

    addLine(subcategory.id, newRow);
  }, [subcategory.id, addLine]);

  const handleCommentSave = useCallback(() => {
    if (currentRowId) {
      updateLine(subcategory.id, currentRowId, { comment: currentComment });
    }
    setCommentDialogOpen(false);
    setCurrentComment("");
    setCurrentRowId("");
  }, [currentRowId, currentComment, subcategory.id, updateLine]);

  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      <Collapse in={!isTotalManualEmissionsMode} collapsedSize={80}>
        <Box className="flex flex-col gap-2">
          {/* Header Section */}
          <SubcategoryHeader
            name={subcategory.name}
            description={subcategory.description}
            isTotalManualEmissionsMode={isTotalManualEmissionsMode}
            setIsTotalManualEmissionsMode={(isManual) =>
              setManualEmissionsMode(subcategory.id, isManual)
            }
            totalEmission={totalEmission}
            setTotalEmission={(total) => {
              setTotalEmission(subcategory.id, total);
            }}
          />
          {/* Content Section */}
          <Box className="flex flex-col gap-2">
            <Typography variant="subtitle2" fontWeight="regular">
              Agrega las fuentes consideradas. Es opcional, pero nos ayuda a
              validar tu cálculo.
            </Typography>

            {measurementUnits && rateMeasurementUnits && (
              <SubcategoryDataGrid
                rows={rows}
                columns={columns}
                categoryPosition={categoryPosition}
              />
            )}
          </Box>
          {/* Footer Section */}
          <Box className="flex flex-row-reverse">
            <Button
              sx={(theme) => ({
                color: theme.palette.category[categoryPosition].dark,
                backgroundColor: theme.palette.category[categoryPosition].light,
              })}
              variant="text"
              onClick={onAddRow}
              startIcon={
                <AddRounded
                  sx={(theme) => ({
                    color: theme.palette.category[categoryPosition].dark,
                  })}
                />
              }
            >
              Agregar Fuente
            </Button>
          </Box>
        </Box>
      </Collapse>
      <CommentDialog
        open={commentDialogOpen}
        handleClose={() => {
          setCommentDialogOpen(false);
          setCurrentComment("");
          setCurrentRowId("");
        }}
        comment={currentComment}
        setComment={setCurrentComment}
        onSave={handleCommentSave}
      />
    </Box>
  );
};
