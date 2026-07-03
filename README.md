# orst-coined-word-mcp

An open-source MCP server for Thailand's academic coined-word database at
[coined-word.orst.go.th](https://coined-word.orst.go.th/), maintained by the
Royal Society of Thailand (ราชบัณฑิตยสภา).

**By:** Chakkrit Termritthikun

[![Buy Me a Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/chakkritt)

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

## Install

```bash
cd orst-coined-word-mcp
npm install
```

## Register with Claude Code

From this directory:

```bash
claude mcp add orst-coined-word -- node "$(pwd)/index.js"
```

Or add it manually to your Claude Code MCP config (`~/.claude.json` or project-level
`.mcp.json`):

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

Restart Claude Code (or run `/mcp` to reconnect) and the three tools should show up.

## Example

Ask Claude Code something like:

> Look up the Thai coined term for "computer" using orst-coined-word.

It will call `lookup_word` with `{"word": "computer"}` and get back, per subject field,
the Thai translation(s) — e.g. วิทยาศาสตร์ → คอมพิวเตอร์, คณิตกรณ์.

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
