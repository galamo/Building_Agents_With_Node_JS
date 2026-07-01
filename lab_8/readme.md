# Lab 8: Multi-Agent — Router with Agents as Tools

Refactor of Lab 9: the **router uses each agent as a tool**. The LLM chooses which tool to call (HTML RAG, SQL agent, or Mermaid diagram agent) instead of returning a route string that the server dispatches with `if/else`.

1. **Router agent** – Chat model with three tools:
   - **answer_with_html_rag**: Answers simple/documentation questions using retrieved HTML content.
   - **run_sql_agent**: Handles database questions (schema RAG → generate SQL → execute → natural-language answer).
   - **use_mermaid_diagram**: Handles diagram requests through the Mermaid MCP agent.

2. **HTML RAG agent** – Same as Lab 9: answers from `html_vectors` content.

3. **SQL agent** – Same pipeline: schema RAG → generate SQL → execute → answer agent.

4. **Mermaid MCP agent** – Connects to the Mermaid MCP server, loads available MCP tools, and uses a tool-calling agent to generate or render diagrams.

The router invokes the model with these tools; the model returns a tool call; we execute that tool and return the result. No imperative routing in application code.

## Setup

1. Run `docker compose up` (same as Lab 9).
2. From `server/`: `npm install`, then:
   - `npm run init-db` – load schema + data
   - `npm run index-schema` – index schema for SQL RAG
   - `npm run index-html` – index HTML in `server/content/` for HTML RAG
3. Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `server/.env`.

## Run

- `npm run start` (default port 3002).
- `POST /query` with body `{ "question": "..." }`. Response includes `route` (`html_rag`, `sql_agent`, or `mermaid_diagram`), `answer`, and for SQL route also `sql`, `rows`, `rowCount`, `error`.

## API Query Flow

When a user queries the API, `server/index.js` handles the HTTP request and delegates all question handling to the router agent.

```mermaid
flowchart TD
    A[Client sends POST /query] --> B[Express receives request in server/index.js]
    B --> C[Parse JSON body]
    C --> D{Is question present and a string?}
    D -- No --> E[Return 400 JSON error]
    D -- Yes --> F[Call routeWithTools(question)]

    F --> G[Create router tools]
    G --> G1[answer_with_html_rag]
    G --> G2[run_sql_agent]
    G --> G3[use_mermaid_diagram]
    G --> H[Create ChatOpenAI router model]
    H --> I[Bind tools to model]
    I --> J[Send system prompt + user question]
    J --> K{Did model return a tool call?}

    K -- No --> L[Fallback to answerWithHtmlRag(question)]
    L --> L1[Retrieve HTML chunks]
    L1 --> L2[Ask model to answer from context]
    L2 --> Z[Return JSON response]

    K -- Yes --> M{Which tool was selected?}

    M -- answer_with_html_rag --> N[answerWithHtmlRag(question)]
    N --> N1[Load HTML retriever]
    N1 --> N2[Retrieve relevant HTML docs]
    N2 --> N3[Build context]
    N3 --> N4[Ask model for grounded answer]
    N4 --> N5[Return route html_rag with answer]
    N5 --> Z

    M -- run_sql_agent --> O[runSqlAgent(question)]
    O --> O1[retrieveSchemaContext(question)]
    O1 --> O2[generateSQL(question, schemaContext)]
    O2 --> O3{Was SQL generated?}
    O3 -- No --> O4[Return unable-to-generate answer]
    O4 --> Z
    O3 -- Yes --> O5[runQuery(sql)]
    O5 --> O6[executeQuery allows SELECT only]
    O6 --> O7[(PostgreSQL database)]
    O7 --> O8[Rows or query error]
    O8 --> O9[answer(question, execution, sql)]
    O9 --> O10[Return route sql_agent with answer, sql, rows, rowCount, error]
    O10 --> Z

    M -- use_mermaid_diagram --> P[runMermaidMcpAgent(question)]
    P --> P1{Is MCP_MERMAID_AUTH set?}
    P1 -- No --> P2[Return configuration error]
    P2 --> Z
    P1 -- Yes --> P3[Connect to Mermaid MCP server]
    P3 --> P4{Connection successful?}
    P4 -- No --> P5[Return connection error]
    P5 --> Z
    P4 -- Yes --> P6[List MCP tools]
    P6 --> P7[Convert MCP tools to LangChain tools]
    P7 --> P8[Run Mermaid tool-calling agent]
    P8 --> P9[Close MCP transport]
    P9 --> P10[Return route mermaid_diagram with answer or error]
    P10 --> Z

    F -. throws .-> Q[Catch server error]
    Q --> R[Return 500 JSON error]
```

### Response Shape

All successful tool routes return the same top-level shape:

```json
{
  "route": "html_rag | sql_agent | mermaid_diagram",
  "answer": "Natural-language answer or diagram result",
  "sql": "SELECT ... or null",
  "rows": [],
  "rowCount": 0,
  "error": null
}
```

## Adding HTML for RAG

Put `.html` files in `server/content/`. Run `npm run index-html` after adding or changing them.


flowchart TD
    A[Client POST /query] --> B[index.js Express route]
    B --> C{Valid question?}
    C -- No --> C1[Return 400 error]
    C -- Yes --> D[routeWithTools question]

    D --> E[Create router tools]
    E --> E1[answer_with_html_rag]
    E --> E2[run_sql_agent]
    E --> E3[use_mermaid_diagram]

    D --> F[ChatOpenAI router model + bound tools]
    F --> G{Model selects tool?}

    G -- No tool call --> H[Fallback: answerWithHtmlRag]
    G -- answer_with_html_rag --> H

    H --> H1[getHtmlRetriever]
    H1 --> H2[(html_vectors pgvector table)]
    H2 --> H3[Retrieve HTML chunks]
    H3 --> H4[ChatOpenAI answers from context]
    H4 --> Z[Return JSON response]

    G -- run_sql_agent --> I[runSqlAgent]

    I --> I1[retrieveSchemaContext]
    I1 --> I2[getSchemaRetriever]
    I2 --> I3[(schema_vectors pgvector table)]
    I3 --> I4[Relevant schema context]

    I4 --> I5[generateSQL]
    I5 --> I6[ChatOpenAI SQL generator]
    I6 --> I7{SQL generated?}

    I7 -- No --> I8[Return cannot-generate answer]
    I8 --> Z

    I7 -- Yes --> I9[runQuery]
    I9 --> I10[executeQuery]
    I10 --> I11{SELECT only?}
    I11 -- No --> I12[Return query error]
    I11 -- Yes --> I13[(PostgreSQL sso_db)]
    I13 --> I14[Rows + rowCount]

    I12 --> I15[answer agent]
    I14 --> I15
    I15 --> I16[ChatOpenAI summarizes result]
    I16 --> Z

    G -- use_mermaid_diagram --> M[runMermaidMcpAgent]
    M --> M1{MCP_MERMAID_AUTH set?}
    M1 -- No --> M2[Return config error]
    M1 -- Yes --> M3[Connect Streamable HTTP transport]
    M3 --> M4[Mermaid MCP server]
    M4 --> M5[List MCP tools]
    M5 --> M6[Convert MCP schemas to LangChain tools]
    M6 --> M7[Tool-calling Mermaid agent]
    M7 --> M8[Return diagram answer or tool result]
    M2 --> Z
    M8 --> Z

    Z --> R[index.js sends JSON]


