# orst-coined-word-mcp

An open-source MCP server for Thailand's academic coined-word database at
[coined-word.orst.go.th](https://coined-word.orst.go.th/), maintained by the
Royal Society of Thailand (ราชบัณฑิตยสภา).

**By:** Chakkrit Termritthikun

<a href="https://www.buymeacoffee.com/chakkritt"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=chakkritt&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>

**Disclaimer:** This project is an **unofficial, community-built, open-source MCP**
implementation. It is **not affiliated with, endorsed by, or supported by the Royal
Society of Thailand**. All data belongs to the Royal Society of Thailand and is
accessed through the same public website endpoints used by the site's own frontend.
Use it at your own discretion and in accordance with the source website's terms of use.

---

**orst-coined-word-mcp** คือ MCP server โอเพนซอร์สสำหรับเข้าถึงฐานข้อมูลศัพท์บัญญัติ
ของราชบัณฑิตยสภา ผ่านเว็บไซต์
[coined-word.orst.go.th](https://coined-word.orst.go.th/) ซึ่งครอบคลุมศัพท์บัญญัติ
กว่า 40 สาขาวิชาสากล เว็บไซต์นี้ไม่มี API สาธารณะที่เปิดเผยไว้ ดังนั้น server นี้จึงสื่อสาร
กับ internal AJAX endpoints ที่ frontend ของเว็บไซต์ใช้งานอยู่

> **หมายเหตุสำคัญ:** โปรเจกต์นี้เป็นงาน **โอเพนซอร์ส MCP ที่ไม่เป็นทางการ**
> และ **ไม่มีส่วนเกี่ยวข้องกับราชบัณฑิตยสภา** ทั้งในด้านการสนับสนุน การรับรอง
> หรือการพัฒนา ข้อมูลทั้งหมดเป็นของราชบัณฑิตยสภา

## Tools

| Tool | Status | Description |
|---|---|---|
| `lookup_word` | **Confirmed working** | Look up a term, get Thai translations per subject field. |
| `search_suggestions` | Best-effort | Autocomplete suggestions for a partial term. |
| `list_domains` | Best-effort | List the 40 subject fields and their `book_id`s. |

`lookup_word` is built against a real captured response and tested against it — reliable.

`search_suggestions` and `list_domains` hit real endpoints (`searchAutoComplete.php`,
`function_All.php`) confirmed via captured requests, but I haven't seen a live *response*
from either yet, so the parser is defensive: it tries JSON, then HTML lists, then plain
text, and returns whatever it finds under a `format` field so you can see what shape the
data actually came back in. If either tool returns something unhelpful, open DevTools →
Network on the site, trigger that action, copy the **Response** tab content, and I can
tighten the parser in a minute.

## Step-by-step install

### 1. Clone this repository

```bash
git clone https://github.com/chakkritt/orst-coined-word-mcp.git
cd orst-coined-word-mcp
```

### 2. Install Node.js dependencies

Make sure you have Node.js installed (this project targets the active LTS version).

```bash
npm install
```

This installs the runtime dependencies needed to call the Royal Society website's
internal endpoints and return the results as MCP tool responses.

### 3. (Optional) Test the server by hand

You can quickly verify the server starts without errors:

```bash
node index.js
```

The process should stay running and wait for MCP messages. Stop it with `Ctrl+C`.

### 4. Register the MCP server with Claude Code

From inside the project directory, run:

```bash
claude mcp add orst-coined-word -- node "$(pwd)/index.js"
```

This adds the server to your Claude Code user config so it is available in every
project.

If you prefer to register it only for the current project, or you are not using the
`claude` CLI, add it manually to one of these files instead:

- User-level config: `~/.claude.json`
- Project-level config: `.mcp.json` in the repo root

Example `.mcp.json` / `~/.claude.json` entry:

```json
{
  "mcpServers": {
    "orst-coined-word": {
      "command": "node",
      "args": ["/absolute/path/to/orst-coined-word-mcp/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/orst-coined-word-mcp/index.js` with the actual absolute path.

### 5. Restart Claude Code and verify

Restart Claude Code, or run `/mcp` inside Claude Code to reconnect to the MCP server.

After reconnecting, Claude Code should show three new tools:

- `lookup_word`
- `search_suggestions`
- `list_domains`

You can test by asking:

> Look up the Thai coined term for "computer" using orst-coined-word.

## Claude Code Skill

This repo also includes `SKILL.md`, a reusable Claude Code skill for Thai academic
writing. Drop it into your skills directory (e.g. `~/.claude/skills/thai-coined-term-lookup/`)
and Claude Code will use it automatically when you are writing Thai academic text that
includes English technical terms.

The skill guides Claude to:

- Look up official Royal Society coined terms (`ศัพท์บัญญัติ`) versus transliterated loan words.
- Choose the right term for formal theses, dissertations, journal papers, and research proposals.
- Present results with a short table and a one-line recommendation.

See [`SKILL.md`](./SKILL.md) for the full prompt and behavior.

## Example usage

After installing and registering the server, ask Claude Code:

> Look up the Thai coined term for "computer" using orst-coined-word.

Claude Code calls `lookup_word` with `{"word": "computer"}`. A typical result includes
multiple subject-field entries, each showing the Thai translation(s) endorsed by that
field:

| Subject field | Thai translation(s) |
|---|---|
| วิทยาศาสตร์ | คอมพิวเตอร์, คณิตกรณ์ |
| คณิตศาสตร์ | คอมพิวเตอร์, คณิตกรณ์ |
| วนศาสตร์ | คอมพิวเตอร์, คณิตกรณ์ |

You can then choose the appropriate form for your document. In a Thai academic thesis,
for instance, you might write **คณิตกรณ์** on first use with the English term in
parentheses, then use **คอมพิวเตอร์** consistently thereafter if your committee prefers
the more common transliterated form.

## Notes / limitations

- The site uses a PHP session cookie (`PHPSESSID`). This server bootstraps one session
  on first use and reuses it for the life of the process — if the server runs for a very
  long time and the session expires server-side, restart it.
- `book_id` defaults to `0` (search across all subject fields). Once `list_domains` is
  confirmed working, you can pass a specific `book_id` to `lookup_word` to restrict to
  one field.
- This is an unofficial integration against a government site's internal endpoints, not
  a documented public API — endpoint behavior could change without notice.
- All source data and terminology definitions remain the intellectual property of the
  Royal Society of Thailand (ราชบัณฑิตยสภา).
