Help me implement a new endpoint using the <method> HTTP method at the path: <path>`
The body should have the following structure: <requestBody>
The response should have the following structure: <responseBody>

The endpoint must do: <functionality>

The files modifications should include:

- The feature folder at apps/api/src/features/carbonInventories/<folderName> including the handler, the route and the service
- The .rest file for calling the endpoint for debug purposes, at apps/api/src/rest
- Attaching the route to the fastify app, at apps/api/src/routes/api/carbon-inventories/index.ts
- The integration tests at apps/api/test/features/carbonInventories/<folderName>.integration.test.ts
- The response schema and typescript at packages/types/src/carbonInventories/<folderName>.ts. Export it at packages/types/src/carbonInventories/index.ts

Replacements:
<method>: POST
<path>: carbon-inventory/1/subcategories/add
<requestBody>: { "subcategoryIds": [1,2,3,4] }
<responseBody>: { "added": number; "removed": number; "skipped": number; }
<functionality>: Add one or many subcategories to the carbon inventory referenced on the path. The service should ignore the subcategoryIds from the body that already has ACTIVE lines at the database. For the remaining subcategories, it should create an empty ACTIVE line.
<folderName>: addSubcategoriesToCarbonInventory
