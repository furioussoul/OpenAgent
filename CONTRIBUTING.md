# Contributing to OpenAgent

Thank you for your interest in contributing to OpenAgent!

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or pnpm

### Getting Started

```bash
# Clone the repository
git clone https://github.com/furioussoul/OpenAgent.git
cd OpenAgent

# Install dependencies
npm install

# Build
npm run build

# Run type check
npm run typecheck

# Run tests
npm test
```

### Project Structure

```
OpenAgent/
├── src/
│   ├── index.ts           # Main exports
│   ├── agent.ts           # OpenAgent class (high-level API)
│   ├── types.ts           # Type definitions
│   ├── core/              # Core modules (session, agent, llm)
│   ├── tool/              # Tool system
│   │   ├── builtin/       # Built-in tools
│   │   └── local/         # Local executors
│   ├── provider/          # LLM provider management
│   └── utils/             # Utility functions
├── examples/              # Usage examples
├── dist/                  # Build output
└── docs/                  # Documentation
```

## Making Changes

### Code Style

- Use TypeScript with strict mode
- Follow existing code conventions
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Adding a New Tool

1. Create a new file in `src/tool/builtin/`:

```typescript
// src/tool/builtin/my-tool.ts
import { z } from 'zod'
import { defineTool } from '../define'

export const myTool = defineTool({
  id: 'my-tool',
  description: 'Description of what the tool does',
  parameters: z.object({
    param1: z.string().describe('Parameter description'),
  }),
  execute: async (args, ctx) => {
    // Implementation
    return {
      title: 'Result title',
      output: 'Result output',
    }
  },
})
```

2. Export it in `src/tool/builtin/index.ts`
3. Add tests

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/tool/builtin/my-tool.test.ts
```

## Submitting Changes

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests and type check
5. Commit with a descriptive message
6. Push to your fork
7. Create a Pull Request

### Commit Messages

Follow conventional commits:

- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `refactor: refactor code`
- `test: add tests`

### Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new features
- Update documentation as needed
- Ensure all tests pass
- Request review from maintainers

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag (`git tag v0.x.x`)
4. Push tag (`git push origin v0.x.x`)
5. Publish to npm (`npm publish`)
6. Create GitHub release

## For DreamShip Maintainers

OpenAgent is developed as part of the DreamShip monorepo using Git Subtree.

### Syncing Changes

```bash
# In the DreamShip (team) repository:

# Push changes to OpenAgent repo
git subtree push --prefix=packages/openagent openagent main

# Pull external contributions (if any)
git subtree pull --prefix=packages/openagent openagent main --squash
```

### Setup (one-time)

```bash
# Add OpenAgent remote
git remote add openagent https://github.com/furioussoul/OpenAgent.git
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
