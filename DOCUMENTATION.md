# 📚 Documentation Guide

Complete documentation navigation for the Persistent Terminal MCP Server.

## 🚀 Quick Start

**New to this project?**
1. Read [README.md](README.md) for project overview
2. Check [docs/guides/usage.md](docs/guides/usage.md) for usage guide
3. See [docs/guides/mcp-config.md](docs/guides/mcp-config.md) for setup

**遇到问题？/ Having issues?**
1. [docs/reference/fixes/QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md) - 3-step quick fix
2. [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md) - Common problems
3. [docs/reference/fixes/README.md](docs/reference/fixes/README.md) - All fixes

---

## 📖 Documentation Structure

### Root Level Documents
- [README.md](README.md) - Project overview (English)
- [README.zh-CN.md](README.zh-CN.md) - 项目概览（中文）
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [LICENSE](LICENSE) - MIT License
- **[DOCUMENTATION.md](DOCUMENTATION.md)** - This file

### Main Documentation Hub
- **[docs/README.md](docs/README.md)** - Complete documentation index

### Organized by Category

#### 📘 Guides (`docs/guides/`)
- [usage.md](docs/guides/usage.md) - End-to-end workflow
- [troubleshooting.md](docs/guides/troubleshooting.md) - Common issues
- [mcp-config.md](docs/guides/mcp-config.md) - MCP configuration
- [spinner-compaction.md](docs/guides/spinner-compaction.md) - Animation feature
- [quick-start-spinner.md](docs/guides/quick-start-spinner.md) - Spinner quick start

#### 🔧 Reference (`docs/reference/`)
- [technical-details.md](docs/reference/technical-details.md) - Architecture
- [tools-summary.md](docs/reference/tools-summary.md) - MCP tools reference
- [bug-fixes.md](docs/reference/bug-fixes.md) - Historical fixes
- [test-response.md](docs/reference/test-response.md) - Test results
- [IMPLEMENTATION_REPORT.md](docs/reference/IMPLEMENTATION_REPORT.md) - Implementation notes
- [SPINNER_COMPACTION_SUMMARY.md](docs/reference/SPINNER_COMPACTION_SUMMARY.md) - Spinner summary

#### 🚨 Fixes (`docs/reference/fixes/`)
**Start here:** [docs/reference/fixes/README.md](docs/reference/fixes/README.md)

- [FIX_SUMMARY.md](docs/reference/fixes/FIX_SUMMARY.md) - Complete fix overview
- [STDIO_FIX.md](docs/reference/fixes/STDIO_FIX.md) - Stdio/Cursor fix (technical)
- [CURSOR_FIX_SUMMARY.md](docs/reference/fixes/CURSOR_FIX_SUMMARY.md) - Cursor fix (Chinese)
- [QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md) - 3-step quick fix
- [TERMINAL_FIXES.md](docs/reference/fixes/TERMINAL_FIXES.md) - Terminal interaction fixes

#### 💻 Clients (`docs/clients/`)
- [claude-code-setup.md](docs/clients/claude-code-setup.md) - Claude Desktop/Code setup

#### 🇨🇳 Chinese Docs (`docs/zh/`)
- [quick-start.md](docs/zh/quick-start.md) - 快速开始
- [prompt-usage.md](docs/zh/prompt-usage.md) - 提示词指南
- [test-feedback.md](docs/zh/test-feedback.md) - 测试反馈

#### 📋 Project Meta (`docs/meta/`)
- [project-prompt.md](docs/meta/project-prompt.md) - Original requirements
- [project-status.md](docs/meta/project-status.md) - Current status

#### 🧪 Tests (`tests/integration/`)
**Start here:** [tests/integration/README.md](tests/integration/README.md)

- `test-mcp-stdio.mjs` - Stdio purity test
- `test-cursor-scenario.mjs` - Cursor scenario test
- `test-terminal-fixes.mjs` - Terminal fixes test

---

## 🎯 Find What You Need

### By Role

#### 👤 User (Just want to use it)
1. [README.md](README.md) - Overview
2. [docs/guides/usage.md](docs/guides/usage.md) - How to use
3. [docs/guides/mcp-config.md](docs/guides/mcp-config.md) - Setup

#### 🐛 User (Having problems)
1. [docs/reference/fixes/QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md) - Quick fix
2. [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md) - Troubleshooting
3. [docs/reference/fixes/README.md](docs/reference/fixes/README.md) - All fixes

#### 💻 Developer (Want to understand)
1. [docs/reference/technical-details.md](docs/reference/technical-details.md) - Architecture
2. [docs/reference/fixes/FIX_SUMMARY.md](docs/reference/fixes/FIX_SUMMARY.md) - All fixes
3. [tests/integration/README.md](tests/integration/README.md) - Tests

#### 🔧 Maintainer (Need everything)
1. [CHANGELOG.md](CHANGELOG.md) - Version history
2. [docs/README.md](docs/README.md) - Complete index
3. [docs/reference/IMPLEMENTATION_REPORT.md](docs/reference/IMPLEMENTATION_REPORT.md) - Details

### By Problem

#### Cursor not working / 卡住
→ [docs/reference/fixes/QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md)
→ [docs/reference/fixes/CURSOR_FIX_SUMMARY.md](docs/reference/fixes/CURSOR_FIX_SUMMARY.md)

#### Commands not executing
→ [docs/reference/fixes/TERMINAL_FIXES.md](docs/reference/fixes/TERMINAL_FIXES.md) (Problem 1)

#### Interactive apps not working
→ [docs/reference/fixes/TERMINAL_FIXES.md](docs/reference/fixes/TERMINAL_FIXES.md) (Problem 2)

#### Output not accurate
→ [docs/reference/fixes/TERMINAL_FIXES.md](docs/reference/fixes/TERMINAL_FIXES.md) (Problem 3)

#### JSON parsing errors
→ [docs/reference/fixes/STDIO_FIX.md](docs/reference/fixes/STDIO_FIX.md)

### By Feature

#### MCP Tools
→ [docs/reference/tools-summary.md](docs/reference/tools-summary.md)
→ [README.md](README.md) (MCP Tools section)

#### Spinner Compaction
→ [docs/guides/spinner-compaction.md](docs/guides/spinner-compaction.md)
→ [docs/reference/SPINNER_COMPACTION_SUMMARY.md](docs/reference/SPINNER_COMPACTION_SUMMARY.md)

#### REST API
→ [docs/reference/technical-details.md](docs/reference/technical-details.md)
→ [README.md](README.md) (REST API section)

#### Testing
→ [tests/integration/README.md](tests/integration/README.md)
→ Unit tests in `src/__tests__/`

---

## 🌍 Language

### English Documentation
- [README.md](README.md)
- [docs/guides/](docs/guides/)
- [docs/reference/](docs/reference/)

### 中文文档
- [README.zh-CN.md](README.zh-CN.md)
- [docs/zh/](docs/zh/)
- [docs/reference/fixes/CURSOR_FIX_SUMMARY.md](docs/reference/fixes/CURSOR_FIX_SUMMARY.md)
- [docs/reference/fixes/QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md)

---

## 📊 Documentation Map

```
persistent-terminal-mcp/
├── README.md                    ← Start here
├── README.zh-CN.md             ← 从这里开始（中文）
├── CHANGELOG.md                ← Version history
├── CONTRIBUTING.md             ← How to contribute
├── DOCUMENTATION.md            ← This file
│
├── docs/                       ← Main documentation hub
│   ├── README.md              ← Complete index
│   ├── guides/                ← Usage guides
│   │   ├── usage.md
│   │   ├── troubleshooting.md
│   │   ├── mcp-config.md
│   │   └── spinner-compaction.md
│   ├── reference/             ← Technical references
│   │   ├── technical-details.md
│   │   ├── tools-summary.md
│   │   ├── bug-fixes.md
│   │   └── fixes/            ← All fixes ⭐
│   │       ├── README.md
│   │       ├── FIX_SUMMARY.md
│   │       ├── STDIO_FIX.md
│   │       ├── CURSOR_FIX_SUMMARY.md
│   │       ├── QUICK_FIX_GUIDE.md
│   │       └── TERMINAL_FIXES.md
│   ├── clients/               ← Client setup
│   │   └── claude-code-setup.md
│   ├── zh/                    ← Chinese docs
│   │   ├── quick-start.md
│   │   └── prompt-usage.md
│   └── meta/                  ← Project meta
│       ├── project-prompt.md
│       └── project-status.md
│
└── tests/                      ← Test suites
    └── integration/           ← Integration tests ⭐
        ├── README.md
        ├── test-mcp-stdio.mjs
        ├── test-cursor-scenario.mjs
        └── test-terminal-fixes.mjs
```

---

## 🔍 Search Tips

### Find by keyword
```bash
# Search all documentation
grep -r "keyword" docs/

# Search fixes only
grep -r "keyword" docs/reference/fixes/

# Search Chinese docs
grep -r "关键词" docs/zh/
```

### Browse on GitHub
All documentation is optimized for GitHub's markdown renderer.
Just navigate to the `docs/` directory and click through.

---

## 📝 Contributing to Documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Documentation standards:**
- Use clear, concise language
- Include code examples
- Add navigation links
- Update indexes when adding new docs
- Test all links

---

## 🆕 Recent Updates

**2025-10-06:**
- ✅ Reorganized all fix documentation into `docs/reference/fixes/`
- ✅ Moved integration tests to `tests/integration/`
- ✅ Created comprehensive documentation indexes
- ✅ Added this DOCUMENTATION.md guide

See [CHANGELOG.md](CHANGELOG.md) for complete history.

---

## 📞 Need Help?

1. **Check documentation first:**
   - [docs/README.md](docs/README.md) - Complete index
   - [docs/reference/fixes/README.md](docs/reference/fixes/README.md) - All fixes

2. **Still stuck?**
   - [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md)
   - Open an issue on GitHub

3. **Want to contribute?**
   - [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Last updated:** 2025-10-06

