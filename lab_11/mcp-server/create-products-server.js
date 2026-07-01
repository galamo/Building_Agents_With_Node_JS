import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getProductsHandler, PRODUCT_TYPES } from "./data/products.js";

const productSchema = z.object({
  id: z.number().describe("Unique product identifier"),
  name: z.string().describe("Product name"),
  type: z.string().describe("Product category / type"),
  price: z.number().describe("Price in USD"),
  description: z.string().describe("Full product description"),
  image: z.string().describe("URL to product image"),
});

const getProductsOutputSchema = z.object({
  products: z.array(productSchema).describe("List of matching products"),
  total: z.number().describe("Total number of matching products"),
});

export function createProductsMcpServer() {
  const server = new McpServer(
    { name: "lab11-products-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "getProducts",
    {
      description: `Search and filter the product catalog.
Returns a list of products matching all provided filters.
Available product types: ${PRODUCT_TYPES.join(", ")}.
All filters are optional — omit to return all products.`,
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .nullable()
          .describe("Filter by product name (partial match, case-insensitive). Example: 'mac' matches 'MacBook Pro'."),
        type: z
          .string()
          .optional()
          .nullable()
          .describe(`Filter by exact product category. Must be one of: ${PRODUCT_TYPES.join(", ")}.`),
        minPrice: z
          .number()
          .optional()
          .nullable()
          .describe("Minimum price in USD (inclusive). Example: 200 returns products priced $200 and above."),
        maxPrice: z
          .number()
          .optional()
          .nullable()
          .describe("Maximum price in USD (inclusive). Example: 500 returns products priced $500 and below."),
      }),
      outputSchema: getProductsOutputSchema,
    },
    async ({ name, type, minPrice, maxPrice }) => {
      const result = getProductsHandler({
        name: name ?? undefined,
        type: type ?? undefined,
        minPrice: minPrice ?? undefined,
        maxPrice: maxPrice ?? undefined,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  return server;
}
