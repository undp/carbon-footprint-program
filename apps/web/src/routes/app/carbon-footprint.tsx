import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces/routes";
import { useCountryOrganizationSizes } from "@/api/query";

export const Route = createFileRoute(Routes.CARBON_FOOTPRINT)({
  component: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: countryOrganizationSizes } = useCountryOrganizationSizes();
    return (
      <MainLayout>
        {/* TODO: Replace with real Organization Footprint screen component */}
        <div>
          Hello &quot;/carbon-footprint&quot;!{" "}
          {countryOrganizationSizes?.map((size) => size.name).join(", ")}
        </div>
      </MainLayout>
    );
  },
});
