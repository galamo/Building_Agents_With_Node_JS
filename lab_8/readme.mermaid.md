# Lab 8 — Agents Structure & Communications

Architecture of the multi-agent system in `server/agents/`. The **router** exposes each specialist agent as a LangChain tool; the router LLM picks exactly one tool per question.

## Agent dependency graph

```mermaid
flowchart TB
    subgraph entry["Server entry (outside agents/)"]
        INDEX["index.js<br/>POST /query"]
    end

    subgraph routerAgent["router-agent.js"]
        ROUTE["routeWithTools(question)"]
        ROUTER_LLM["ChatOpenAI<br/>bindTools()"]
        TOOL_HTML["answer_with_html_rag"]
        TOOL_SQL["run_sql_agent"]
        TOOL_MERMAID["use_mermaid_diagram"]
    end

    subgraph htmlAgent["html-rag-agent.js"]
        HTML_FN["answerWithHtmlRag(question)"]
        HTML_LLM["ChatOpenAI"]
    end

    subgraph sqlPipeline["sql-agent-pipeline.js"]
        SQL_FN["runSqlAgent(question)"]
    end

    subgraph sqlAgents["SQL sub-agents"]
        SCHEMA["schema-retriever.js<br/>retrieveSchemaContext()"]
        SQLGEN["sql-generator.js<br/>generateSQL()"]
        DBEXEC["db-executor.js<br/>runQuery()"]
        ANSWER["answer-agent.js<br/>answer()"]
    end

    subgraph mermaidAgent["mermaid-mcp-agent.js"]
        MERMAID_FN["runMermaidMcpAgent(question)"]
        MERMAID_LLM["ChatOpenAI + AgentExecutor"]
    end

    subgraph libs["lib/ dependencies"]
        HTML_STORE["html-vector-store.js"]
        SCHEMA_STORE["schema-vector-store.js"]
        DB_LIB["db.js"]
    end

    subgraph external["External services"]
        PG_HTML[("html_vectors<br/>(pgvector)")]
        PG_SCHEMA[("schema_vectors<br/>(pgvector)")]
        PG_DB[("PostgreSQL<br/>sso_db")]
        MCP_SRV["Mermaid MCP Server<br/>(Streamable HTTP)"]
    end

    INDEX -->|"question"| ROUTE
    ROUTE --> ROUTER_LLM
    ROUTER_LLM -->|"tool call"| TOOL_HTML
    ROUTER_LLM -->|"tool call"| TOOL_SQL
    ROUTER_LLM -->|"tool call"| TOOL_MERMAID
    ROUTER_LLM -.->|"no tool call: fallback"| HTML_FN

    TOOL_HTML --> HTML_FN
    TOOL_SQL --> SQL_FN
    TOOL_MERMAID --> MERMAID_FN

    HTML_FN --> HTML_STORE
    HTML_STORE --> PG_HTML
    HTML_FN --> HTML_LLM

    SQL_FN --> SCHEMA
    SCHEMA --> SCHEMA_STORE
    SCHEMA_STORE --> PG_SCHEMA
    SCHEMA -->|"schemaContext"| SQLGEN
    SQLGEN -->|"sql"| DBEXEC
    DBEXEC --> DB_LIB
    DB_LIB --> PG_DB
    DBEXEC -->|"rows or error"| ANSWER
    SQLGEN --> SQLGEN_LLM["ChatOpenAI"]
    ANSWER --> ANSWER_LLM["ChatOpenAI"]

    MERMAID_FN --> MERMAID_LLM
    MERMAID_LLM -->|"listTools / callTool"| MCP_SRV
```

## SQL agent pipeline (sequential flow)

```mermaid
flowchart LR
    Q["User question"] --> SR["schema-retriever"]
    SR -->|"schemaContext"| SG["sql-generator"]
    SG -->|"sql"| DE["db-executor"]
    DE -->|"rows / error"| AA["answer-agent"]
    AA --> OUT["Natural-language answer<br/>+ sql, rows, rowCount, error"]

    SR -.-> VS[("schema_vectors")]
    DE -.-> DB[("PostgreSQL")]
```

## Router communications (sequence)

```mermaid
sequenceDiagram
    participant Client
    participant Index as index.js
    participant Router as router-agent
    participant LLM as Router ChatOpenAI
    participant HTML as html-rag-agent
    participant SQL as sql-agent-pipeline
    participant Mermaid as mermaid-mcp-agent

    Client->>Index: POST /query { question }
    Index->>Router: routeWithTools(question)
    Router->>LLM: system prompt + question (bound tools)
    LLM-->>Router: tool_call (one of three)

    alt answer_with_html_rag
        Router->>HTML: answerWithHtmlRag(question)
        HTML-->>Router: answer string
        Router-->>Index: { route: html_rag, answer, ... }
    else run_sql_agent
        Router->>SQL: runSqlAgent(question)
        SQL->>SQL: schema-retriever → sql-generator → db-executor → answer-agent
        SQL-->>Router: { answer, sql, rows, rowCount, error }
        Router-->>Index: { route: sql_agent, ... }
    else use_mermaid_diagram
        Router->>Mermaid: runMermaidMcpAgent(question)
        Mermaid->>Mermaid: connect MCP, AgentExecutor + MCP tools
        Mermaid-->>Router: { answer, error? }
        Router-->>Index: { route: mermaid_diagram, ... }
    else no tool call (fallback)
        Router->>HTML: answerWithHtmlRag(question)
        HTML-->>Router: answer string
        Router-->>Index: { route: html_rag, answer, ... }
    end

    Index-->>Client: JSON response
```

## Agent modules summary

| File | Exported function | Role | Uses LLM |
|------|-------------------|------|----------|
| `router-agent.js` | `routeWithTools` | Routes via tool-calling; wraps all other agents | Yes |
| `html-rag-agent.js` | `answerWithHtmlRag` | RAG over indexed HTML documentation | Yes |
| `sql-agent-pipeline.js` | `runSqlAgent` | Orchestrates SQL sub-agents | No (orchestrator only) |
| `schema-retriever.js` | `retrieveSchemaContext` | RAG over DB schema vectors | No |
| `sql-generator.js` | `generateSQL` | Generates SELECT from question + schema | Yes |
| `db-executor.js` | `runQuery` | Runs SQL via `lib/db.js` | No |
| `answer-agent.js` | `answer` | Summarizes query results in natural language | Yes |
| `mermaid-mcp-agent.js` | `runMermaidMcpAgent` | Tool-calling agent over Mermaid MCP tools | Yes |
