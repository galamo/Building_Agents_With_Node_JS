import "dotenv/config";
import jwt from "jsonwebtoken";

import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { createAgent } from "langchain";

import { tool } from "@langchain/core/tools";
import { FLIGHT_SYSTEM_PROMPT } from "./prompts.js";
import { z } from "zod";

// calude, sonet , gemini ? 
// const model = new ChatOpenAI({
//   model: "openai/gpt-4o-mini", // OpenRouter model with tool calling support
//   temperature: 0.2,
  
//   // streaming:true,
//   // IMPORTANT: OpenRouter base URL
//   configuration: {
//     baseURL: "https://openrouter.ai/api/v1", // antropic / google / openai ... 
//     apiKey: process.env.OPENROUTER_API_KEY,
//   },
// });


const model = new ChatOpenRouter({
  model: "openai/gpt-5.4",
  temperature: 0,
 
});

// Web search tool – access to the web for travel info, hotels, destinations, etc.
const webSearch = new TavilySearch({
  maxResults: 5,
  topic: "general",
  
});

const USD_TO_NIS_RATE = 3.2;

function convertUsdToNis(priceInDollar) {
  const price = parseFloat(String(priceInDollar).replace(/,/g, ""));
  if (isNaN(price)) return null;
  const priceInNIS = Math.round(price * USD_TO_NIS_RATE);
  return { usd: price, nis: priceInNIS };
}

function formatNisConversion({ usd, nis }) {
  return `${usd} USD = ${nis} NIS/ILS`;
}

function extractUsdPrices(text) {
  const matches = text.matchAll(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g);
  const prices = new Set();
  for (const match of matches) {
    const value = parseFloat(match[1].replace(/,/g, ""));
    if (!isNaN(value) && value > 0) prices.add(value);
  }
  return [...prices];
}

// change the tool to not convert to NIS.
const flightFinder = tool(
  async ({ origin, destination, date }) => {
    const query = date
      ? `flights from ${origin} to ${destination} on ${date} flight numbers departure arrival dates`
      : `flights from ${origin} to ${destination} flight numbers departure arrival dates`;
    const results = await webSearch.invoke({ query });
    console.log(JSON.stringify(results));
    let output = typeof results === "string" ? results : JSON.stringify(results);
    return output;
  },
  {
    name: "flight_finder",
    description:
      "Search for flight options between cities. Use this to find available flights, prices, airlines, flight numbers, and departure/arrival dates when planning travel. Set convertToNIS=true when the user wants prices in shekels to get NIS conversions in the same call and avoid a separate currency_exchange step.",
    schema: z.object({
      origin: z.string().describe("Departure city or airport (e.g. San Francisco)"),
      destination: z.string().describe("Arrival city or airport (e.g. Tokyo)"),
      date: z
        .string()
        .optional()
        .describe("Travel date (e.g. 2025-03-15) – optional")
    }),
  }
);

// tool is not working as expected - fix it.
const currencyExchange = tool(({ pricesInDollar }) => {
  if(!Array.isArray(pricesInDollar)) {
    return "Wrong input type"
  }
  if (!pricesInDollar?.length) {
    return "No prices provided. Pass pricesInDollar as an array, e.g. [\"450\"] for one price or [\"450\", \"520\", \"610\"] for multiple.";
  }

  const conversions = pricesInDollar.map((p) => convertUsdToNis(p));
  if (conversions.some((c) => c === null)) {
    return "Invalid price(s). Please provide numeric values in USD.";
  }

  return conversions.map(formatNisConversion).join("\n");
}, {
  name: "currency_exchange",
  description:
    "Convert USD prices to Israeli New Shekel (NIS/ILS). Always pass pricesInDollar as an array: [\"450\"] for one price or [\"450\", \"520\"] for multiple—never call this tool repeatedly. Exchange rate: 1 USD ≈ 3.2 NIS.",
  schema: z.object({
    pricesInDollar: z
      .array(z.string())
      .min(1)
      .describe('USD prices to convert, always as an array: one price ["450"] or multiple ["450", "520", "610"]'),
  }),
});



// Geocoding tool – get latitude/longitude for from & to (for map positioning)
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
async function fetchCoordinates(name) {
  const params = new URLSearchParams({
    name: name.trim(),
    count: "1",
    language: "en",
    format: "json",
  });
  const res = await fetch(`${GEOCODING_BASE}?${params}`);
  if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
  const data = await res.json();
  const results = data.results;
  if (!results || results.length === 0) return null;
  const first = results[0];
  return { lat: first.latitude, lon: first.longitude, name: first.name };
}



// Country flags tool – get PNG flag URLs by ISO 3166-1 alpha-3 country code
const REST_COUNTRIES_BASE = "https://restcountries.com/v3.1/alpha";



// tool exchange to all currnecies ( MCP/openapi sepcification)


// Create ReAct agent with web and flight tools (createAgent is the replacement for deprecated createReactAgent)
const agent = createAgent({
  model,
  tools: [flightFinder, currencyExchange],
  systemPrompt: FLIGHT_SYSTEM_PROMPT,
});

function getMessageRole(msg) {
  return (msg._getType?.() ?? msg.constructor?.name ?? "Message").toLowerCase();
}

function extractToolCalls(msg) {
  const raw = msg.tool_calls ?? msg.additional_kwargs?.tool_calls ?? [];
  if (!Array.isArray(raw)) return [];

  return raw.map((tc) => {
    const name = tc.name ?? tc.function?.name ?? "unknown";
    let args = tc.args;
    if (args === undefined && tc.function?.arguments) {
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = tc.function.arguments;
      }
    }
    return { name, args: args ?? {} };
  });
}

/** Print a compact summary: iterations, tool calls, and payloads. */
export function printAgentRunSummary(result) {
  const messages = result?.messages ?? [];
  let iterations = 0;
  const toolCallLog = [];
  let toolResultCount = 0;

  for (const msg of messages) {
    const role = getMessageRole(msg);

    if (role.includes("ai")) {
      iterations += 1;
      for (const tc of extractToolCalls(msg)) {
        toolCallLog.push({ iteration: iterations, ...tc });
      }
    }

    if (role.includes("tool")) {
      toolResultCount += 1;
    }
  }

  console.log("\n========== AGENT RUN SUMMARY ==========");
  console.log(`Iterations (model turns): ${iterations}`);
  console.log(`Tool calls: ${toolCallLog.length}`);
  console.log(`Tool results received: ${toolResultCount}`);

  if (toolCallLog.length > 0) {
    console.log("\nTools called:");
    toolCallLog.forEach((tc, i) => {
      console.log(`  ${i + 1}. [iteration ${tc.iteration}] ${tc.name}`);
      console.log(`     payload: ${JSON.stringify(tc.args)}`);
    });
  } else {
    console.log("\nNo tools were called.");
  }

  console.log("========== END AGENT RUN SUMMARY ==========\n");
}

// test/main 
export async function runTravelPlanner() {

  // API keys validation
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
    // process.exit(1);
  }

  if (!process.env.TAVILY_API_KEY) {
    console.error(
      "Missing TAVILY_API_KEY. Get one at https://app.tavily.com and add to .env"
    );
    // process.exit(1);
  }

  // interact with client ? 
  const userInput = `Plan a 3-day trip from Tel Aviv to New-York. Style: food + culture, light walking. Budget: high. Interests: sails at rivers, small galleries, hidden viewpoints. Use the flight finder to check flights, show me prices in NIS/ILS`;

  const result = await agent.invoke({
    messages: [
      // { role: "system", content: "RETURN A JSON STRUCTURE FROM THE LIST FLIGHTS" },
      { role: "user", content: userInput }],
  });

  printAgentRunSummary(result);

  // Get the final AI response from messages
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content;
}

// Export agent for use by server.js
export { agent };

// Run standalone when executed directly (e.g. node agent_new.js)
const isMain = process.argv[1]?.endsWith("agent_new.js");
if (isMain) {
  runTravelPlanner()
    .then((message) => {
      console.log("#######HIS IS AI RESULT########");
      console.log(message);
      console.log("#######HIS IS AI RESULT########");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

