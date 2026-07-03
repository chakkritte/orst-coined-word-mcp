#!/usr/bin/env node
/**
 * MCP server for coined-word.orst.go.th
 * (ศัพท์บัญญัติ 40 สาขาวิชา — สำนักงานราชบัณฑิตยสภา)
 *
 * Reverse-engineered endpoints (no public API exists for this site):
 *   - GET  /index.php                         -> establishes PHPSESSID session cookie
 *   - POST /func_lookup.php                    -> word=<term>&funcName=lookupWord&book_id=0&status=lookup&loc=
 *       Confirmed response: HTML fragment, one <div class="panel panel-info"> per subject
 *       domain containing the term and its Thai translation(s).
 *   - POST /searchAutoComplete.php?book_id=0&format_search=prefix  -> q=<text>&limit=100&timestamp=<ms>
 *       Response format NOT yet confirmed by a live sample. Parser below is defensive:
 *       tries JSON first, then falls back to scraping <li>/<a>/plain-text tokens.
 *   - POST /function_All.php                    -> funcName=book_domain
 *       Response format NOT yet confirmed. Same defensive JSON/HTML fallback strategy.
 *
 * If list_domains or search_suggestions don't return sensible data against the live
 * site, capture one raw response body (DevTools -> Network -> Response tab) and the
 * parsers here can be corrected quickly.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as cheerio from "cheerio";

const BASE_URL = "https://coined-word.orst.go.th";
const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
};

// ---- Session handling -----------------------------------------------------
// The site's AJAX endpoints are called from index.php in the browser and rely
// on a PHPSESSID cookie. We bootstrap one session and reuse it for the life
// of this server process.

let sessionCookie = null;

async function ensureSession() {
  if (sessionCookie) return sessionCookie;
  const res = await fetch(`${BASE_URL}/index.php`, {
    headers: COMMON_HEADERS,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/PHPSESSID=[^;]+/);
    if (match) sessionCookie = match[0];
  }
  // Even if no cookie came back, proceed — some endpoints may not require one.
  return sessionCookie;
}

async function postForm(path, params) {
  const cookie = await ensureSession();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...COMMON_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/index.php`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  return { status: res.status, text };
}

// ---- Parsers ----------------------------------------------------------

/**
 * Parses the confirmed func_lookup.php HTML response into structured results.
 */
function parseLookupHtml(html) {
  const $ = cheerio.load(html);
  const results = [];

  $("div.panel.panel-info").each((_, el) => {
    const $el = $(el);
    const heading = $el.children(".panel-heading");
    const body = $el.children(".panel-body");
    if (!heading.length || !body.length) return; // skip the outer wrapper panel

    const domain = heading.find(".panel-title").text().replace(/\s+/g, " ").trim();
    if (!domain) return;

    const boldTexts = [];
    body.find("b").each((__, b) => {
      const t = $(b).text().replace(/\u00a0/g, " ").trim();
      if (t) boldTexts.push(t);
    });

    const word = boldTexts[0] || "";
    const translationRaw = boldTexts.find(
      (t, i) => i > 0 && !t.includes("หมวดย่อย")
    ) || "";
    const translations = translationRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let subcategory = null;
    const bodyText = body.text().replace(/\u00a0/g, " ");
    if (bodyText.includes("หมวดย่อย")) {
      const after = bodyText.split("หมวดย่อย")[1];
      if (after) subcategory = after.replace(/\s+/g, " ").trim() || null;
    }

    results.push({ domain, word, translations, subcategory });
  });

  return results;
}

/** Defensive parser for endpoints whose exact response shape is unconfirmed. */
function parseFlexible(text) {
  const trimmed = text.trim();
  if (!trimmed) return { format: "empty", data: [] };

  // Try JSON first.
  try {
    const json = JSON.parse(trimmed);
    return { format: "json", data: json };
  } catch {
    // not JSON
  }

  // Try scraping list-like HTML.
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    const $ = cheerio.load(trimmed);
    const items = [];
    $("li, option, a").each((_, el) => {
      const t = $(el).text().trim();
      if (t) items.push(t);
    });
    if (items.length) return { format: "html-list", data: items };
    return { format: "html-raw", data: trimmed };
  }

  // Fall back to newline/comma separated plain text.
  const items = trimmed
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { format: "text-list", data: items.length ? items : trimmed };
}

// ---- Tool implementations ----------------------------------------------

async function lookupWord({ word, book_id = "0" }) {
  const { status, text } = await postForm("/func_lookup.php", {
    word,
    funcName: "lookupWord",
    book_id: String(book_id),
    status: "lookup",
    loc: "",
  });

  if (status !== 200) {
    return { error: `HTTP ${status} from func_lookup.php`, raw: text.slice(0, 500) };
  }

  const results = parseLookupHtml(text);
  if (!results.length) {
    return {
      word,
      results: [],
      note:
        "No entries parsed. Either the word has no coined-term entry, or the site's HTML changed — raw response included for debugging.",
      raw: text.slice(0, 1000),
    };
  }
  return { word, results };
}

async function searchSuggestions({ query, limit = 20 }) {
  const { status, text } = await postForm(
    "/searchAutoComplete.php?book_id=0&format_search=prefix",
    { q: query, limit: String(limit), timestamp: String(Date.now()) }
  );

  if (status !== 200) {
    return { error: `HTTP ${status} from searchAutoComplete.php`, raw: text.slice(0, 500) };
  }

  const parsed = parseFlexible(text);
  return { query, ...parsed };
}

async function listDomains() {
  const { status, text } = await postForm("/function_All.php", {
    funcName: "book_domain",
  });

  if (status !== 200) {
    return { error: `HTTP ${status} from function_All.php`, raw: text.slice(0, 500) };
  }

  const parsed = parseFlexible(text);
  return parsed;
}

// ---- MCP server wiring ---------------------------------------------------

const server = new Server(
  {
    name: "orst-coined-word-mcp",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  }
);

const TOOLS = [
  {
    name: "lookup_word",
    description:
      "Look up a term in the Royal Society of Thailand's coined-word (ศัพท์บัญญัติ) database. " +
      "Returns the Thai coined translation(s) for the given word across all 40 subject-field " +
      "dictionaries it appears in (e.g. วิทยาศาสตร์, คอมพิวเตอร์และเทคโนโลยีสารสนเทศ, คณิตศาสตร์). " +
      "Works with English or Thai input terms.",
    inputSchema: {
      type: "object",
      properties: {
        word: {
          type: "string",
          description: "The term to look up, e.g. 'computer' or 'คอมพิวเตอร์'.",
        },
        book_id: {
          type: "string",
          description:
            "Optional subject-field/book ID to restrict the search to a single field. " +
            "Defaults to '0' (search all fields). Use list_domains to discover valid IDs.",
        },
      },
      required: ["word"],
    },
  },
  {
    name: "search_suggestions",
    description:
      "Get autocomplete-style term suggestions as you type a partial word, matching the site's " +
      "live-search box. Response parsing is best-effort since the exact format wasn't confirmed " +
      "from a live sample — check the 'format' field in the result.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Partial term to get suggestions for." },
        limit: {
          type: "number",
          description: "Max number of suggestions to request (default 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_domains",
    description:
      "List the 40 subject-field dictionaries (e.g. วิทยาศาสตร์, แพทยศาสตร์, กฎหมาย) available on " +
      "the coined-word site, with their book_id values usable in lookup_word. Parsing is best-effort " +
      "since the exact response format wasn't confirmed from a live sample — check the 'format' field.",
    inputSchema: { type: "object", properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    switch (name) {
      case "lookup_word":
        result = await lookupWord(args || {});
        break;
      case "search_suggestions":
        result = await searchSuggestions(args || {});
        break;
      case "list_domains":
        result = await listDomains();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
