# OpenAgent Roadmap

## Current Status: v0.1.0 (Alpha)

OpenAgent is currently in alpha stage. Core functionality is implemented but not yet battle-tested.

## Version History

### v0.1.0 (Current)

**Released Features:**
- ✅ High-level API (`OpenAgent` class)
- ✅ `chat()` method with Agent Loop
- ✅ `stream()` method for streaming responses
- ✅ Built-in tools (12 tools):
  - File operations: read, write, edit
  - Search: glob, grep
  - Execution: bash
  - Web: webfetch
  - Interaction: question
  - Agent management: task, todowrite, todoread, skill
- ✅ Smart edit with fuzzy matching (ported from OpenCode)
- ✅ Pluggable SessionStore with MemoryStore default
- ✅ Multi-provider support (Anthropic, OpenAI, Google)
- ✅ Custom tool definition API
- ✅ Agent mode (plan/build)
- ✅ Sub-agents via task tool
- ✅ Skills system for domain expertise

## Roadmap

### v0.2.0 - Stability & Testing

**Timeline:** 2-3 weeks

**Goals:**
- [ ] Comprehensive test suite
- [ ] Error handling improvements
- [ ] Documentation and examples
- [ ] npm package publication

**Tasks:**
1. **Testing**
   - Unit tests for all core modules
   - Integration tests for Agent Loop
   - E2E tests with real LLM calls
   
2. **Error Handling**
   - Better error messages
   - Retry logic for transient failures
   - Rate limit handling
   
3. **Documentation**
   - API reference documentation
   - More examples (CLI app, web server, etc.)
   - Migration guide from low-level API

### v0.3.0 - MCP Integration

**Timeline:** 3-4 weeks

**Goals:**
- [ ] Model Context Protocol (MCP) support
- [ ] Connect to external tool servers
- [ ] OAuth for MCP servers

**Tasks:**
1. **MCP Client**
   - Stdio transport (local servers)
   - HTTP/SSE transport (remote servers)
   - Tool discovery and registration
   
2. **MCP Configuration**
   ```typescript
   const agent = new OpenAgent({
     mcp: {
       servers: [
         { name: 'filesystem', command: ['npx', '-y', '@anthropic/mcp-server-filesystem'] },
         { name: 'github', url: 'https://mcp.example.com/github', token: '...' },
       ]
     }
   })
   ```

### v0.4.0 - Advanced Features

**Timeline:** 4-6 weeks

**Goals:**
- [ ] Context management (token pruning, compaction)
- [ ] Persistent sessions (SQLite store)
- [x] ~~Sub-agents (task tool)~~ ✅ Implemented in v0.1.0
- [ ] Permissions system

**Tasks:**
1. **Context Management**
   - Token counting and limits
   - Automatic message pruning
   - Summary compaction
   
2. **SQLite Store**
   - Optional dependency
   - File-based persistence
   - Migration support

### v0.5.0 - Production Ready

**Timeline:** 6-8 weeks

**Goals:**
- [ ] Performance optimizations
- [ ] Telemetry and observability
- [ ] Enterprise features

**Tasks:**
1. **Performance**
   - Streaming optimizations
   - Caching layer
   - Batch operations
   
2. **Observability**
   - OpenTelemetry integration
   - Langfuse support
   - Structured logging
   
3. **Enterprise**
   - API key management
   - Usage tracking
   - Cost estimation

## Future Ideas

### Potential Features (Not Scheduled)

- **Visual Tools**: Screenshot, browser automation
- **Code Execution**: Sandboxed code execution (E2B, Vercel)
- **Memory**: Long-term memory with vector search
- **Multi-Modal**: Image/audio input support
- **Agents Framework**: Pre-built agents for common tasks
- **CLI Tool**: Interactive command-line interface

### Integration Ideas

- **Framework Adapters**: Next.js, Express, Fastify
- **Database Stores**: PostgreSQL, MongoDB, Redis
- **Vector Stores**: Pinecone, Weaviate, Qdrant
- **Monitoring**: DataDog, New Relic, Sentry

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Priority Areas

1. **Bug fixes** - Always welcome
2. **Documentation** - Examples, tutorials, API docs
3. **Testing** - Unit tests, integration tests
4. **Tools** - New built-in tools

### How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Build and publish to npm
5. Create GitHub release

## Support

- **Issues**: [GitHub Issues](https://github.com/furioussoul/OpenAgent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/furioussoul/OpenAgent/discussions)
- **Discord**: Coming soon
