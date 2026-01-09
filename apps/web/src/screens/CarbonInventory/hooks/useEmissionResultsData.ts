import { useMemo } from "react";
import { useCarbonInventory } from "@/api/query";

interface EmissionDataPoint {
  label: string;
  value: number;
  category: 1 | 2 | 3;
}

interface RankingItem {
  rank: number;
  name: string;
  category: 1 | 2 | 3;
  percentage: number;
  severity: "high" | "medium" | "low";
}

interface ReductionPlan {
  title: string;
  mainGoal: string;
  actions: string[];
}

interface EmissionResultsData {
  totalEmissions: number;
  directEmissions: number;
  indirectEnergyEmissions: number;
  otherIndirectEmissions: number;
  equivalenceValue: string;
  equivalenceUnit: string;
  topEmissions: EmissionDataPoint[];
  ownRankings: RankingItem[];
  sectorRankings: RankingItem[];
  reductionPlan: ReductionPlan;
  isLoading: boolean;
}

export const useEmissionResultsData = (
  inventoryId: string
): EmissionResultsData => {
  const { data: inventory, isLoading } = useCarbonInventory(inventoryId);

  // Calculate emissions by category
  const { directEmissions, indirectEnergyEmissions, otherIndirectEmissions } =
    useMemo(() => {
      if (!inventory) {
        return {
          directEmissions: 0,
          indirectEnergyEmissions: 0,
          otherIndirectEmissions: 0,
        };
      }

      let category1 = 0;
      let category2 = 0;
      let category3 = 0;

      inventory.subcategories.forEach((subcategory) => {
        subcategory.lines.forEach((line) => {
          const emission = line.emission ?? 0;

          if (subcategory.categoryId === "1") {
            category1 += emission;
          } else if (subcategory.categoryId === "2") {
            category2 += emission;
          } else if (subcategory.categoryId === "3") {
            category3 += emission;
          }
        });
      });

      return {
        directEmissions: category1,
        indirectEnergyEmissions: category2,
        otherIndirectEmissions: category3,
      };
    }, [inventory]);

  const totalEmissions = useMemo(
    () => directEmissions + indirectEnergyEmissions + otherIndirectEmissions,
    [directEmissions, indirectEnergyEmissions, otherIndirectEmissions]
  );

  // Calculate equivalence (kg CO2e per unit)
  const { equivalenceValue, equivalenceUnit } = useMemo(() => {
    const mainActivityQuantity =
      typeof inventory?.organizationData?.mainActivityQuantity === "number"
        ? inventory.organizationData.mainActivityQuantity
        : null;

    if (!mainActivityQuantity || mainActivityQuantity === 0) {
      return {
        equivalenceValue: "0,00",
        equivalenceUnit: "kg CO₂e/unidad",
      };
    }

    const kgPerUnit = (totalEmissions * 1000) / mainActivityQuantity;

    return {
      equivalenceValue: kgPerUnit.toFixed(2).replace(".", ","),
      equivalenceUnit: "kg CO₂e/paquete",
    };
  }, [inventory, totalEmissions]);

  // Calculate top emissions by subcategory
  const topEmissions = useMemo(() => {
    if (!inventory) return [];

    const emissionsBySubcategory = new Map<
      string,
      { name: string; emission: number; categoryId: string }
    >();

    inventory.subcategories.forEach((subcategory) => {
      let totalSubcategoryEmission = 0;

      subcategory.lines.forEach((line) => {
        totalSubcategoryEmission += line.emission ?? 0;
      });

      if (totalSubcategoryEmission > 0) {
        emissionsBySubcategory.set(subcategory.id, {
          name: subcategory.name,
          emission: totalSubcategoryEmission,
          categoryId: subcategory.categoryId,
        });
      }
    });

    // Sort by emission and take top 4
    const sorted = Array.from(emissionsBySubcategory.values())
      .sort((a, b) => b.emission - a.emission)
      .slice(0, 4);

    return sorted.map((item) => ({
      label: item.name,
      value: item.emission,
      category: Number(item.categoryId) as 1 | 2 | 3,
    }));
  }, [inventory]);

  // Mock data for rankings (replace with actual API data)
  const ownRankings: RankingItem[] = useMemo(
    () => [
      {
        rank: 1,
        name: "Transporte de bienes aguas abajo",
        category: 3,
        percentage: 32,
        severity: "high",
      },
      {
        rank: 2,
        name: "Productos comprados",
        category: 3,
        percentage: 25,
        severity: "medium",
      },
      {
        rank: 3,
        name: "Combustión móvil",
        category: 1,
        percentage: 22,
        severity: "medium",
      },
      {
        rank: 4,
        name: "Electricidad",
        category: 2,
        percentage: 21,
        severity: "medium",
      },
    ],
    []
  );

  const sectorRankings: RankingItem[] = useMemo(
    () => [
      {
        rank: 1,
        name: "Transporte de bienes aguas abajo",
        category: 3,
        percentage: 35,
        severity: "high",
      },
      {
        rank: 2,
        name: "Electricidad",
        category: 2,
        percentage: 28,
        severity: "medium",
      },
      {
        rank: 3,
        name: "Combustión móvil",
        category: 1,
        percentage: 22,
        severity: "medium",
      },
      {
        rank: 4,
        name: "Productos comprados",
        category: 3,
        percentage: 14,
        severity: "low",
      },
    ],
    []
  );

  // Mock reduction plan (replace with actual API data)
  const reductionPlan: ReductionPlan = useMemo(
    () => ({
      title: "Plan de reducción sugerido",
      mainGoal:
        "Reducir el consumo de combustible en 6% el primer año, en línea con la Ley Marco de Cambio Climático y la meta de carbono neutralidad 2050 de Chile.",
      actions: [
        "Optimizar rutas con herramientas de planificación (menos km, menos consumo).",
        "Implementar un sistema de seguimiento de consumo y mantenimiento preventivo.",
        "Renovar progresivamente la flota por vehículos híbridos o eléctricos.",
        "Priorizar entregas agrupadas y rutas compartidas cuando sea posible.",
      ],
    }),
    []
  );

  return {
    totalEmissions,
    directEmissions,
    indirectEnergyEmissions,
    otherIndirectEmissions,
    equivalenceValue,
    equivalenceUnit,
    topEmissions,
    ownRankings,
    sectorRankings,
    reductionPlan,
    isLoading,
  };
};
