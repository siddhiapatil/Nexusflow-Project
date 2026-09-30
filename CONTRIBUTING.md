# Contributing to NexusFlow

Thank you for contributing to NexusFlow! This document outlines the process and standards for contributing.

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/siddhiapatil/Nexusflow-Project.git
   cd Nexusflow-Project
   git checkout Siddhi
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/bug-description
   ```

3. **Install & Setup**
   ```bash
   cd nexusflow
   docker compose up -d
   
   cd server && npm install && npm run setup:db
   cd ../client && npm install
   ```

## Code Style

### Server (Node.js / ES modules)
- Use ES6+ syntax (no CommonJS)
- Import statements at the top
- Use meaningful variable names
- Add JSDoc comments for exported functions
- Keep functions focused and testable
- Use async/await (no callback hell)

**Example:**
```javascript
/**
 * Fetch telemetry for a device.
 * @param {string} deviceId - Device identifier
 * @param {number} limit - Maximum records to fetch
 * @returns {Promise<Array>} Array of telemetry measurements
 */
export async function getTelemetry(deviceId, limit = 100) {
  // Implementation
}
```

### Client (React / Vite)
- Use functional components + React Hooks
- One component per file in `src/components/`
- Extract custom hooks to `src/hooks/`
- Use meaningful class names for CSS
- Keep components focused and reusable

**Example:**
```jsx
export function MetricCard({ label, value, hint }) {
  return (
    <div className="card metric-card">
      <h3>{label}</h3>
      <p className="value">{value}</p>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
```

## Commit Messages

Use clear, descriptive commit messages following this format:

```
<type>: <description>

<optional body>
<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature change
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add rule-engine endpoint for flow validation
fix: handle WebSocket reconnection timeout
docs: update quick-start guide
refactor: extract database logic into repository pattern
perf: optimize telemetry query with composite index
chore: update dependencies
```

## Pull Request Process

1. **Before Creating a PR:**
   - Ensure all tests pass: `npm run test` (if applicable)
   - Run linting: `npm run lint` (if configured)
   - Test your changes locally
   - Update documentation if needed

2. **Create a PR:**
   - Clear title describing the change
   - Detailed description of what and why
   - Link any related issues (`Closes #123`)
   - List key changes as a checklist

3. **PR Description Template:**
   ```markdown
   ## Description
   Brief description of the changes.

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   How to test these changes:
   ```bash
   npm run setup:db
   npm run dev
   ```

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] No new warnings generated
   ```

4. **Review & Merge:**
   - Address review feedback
   - Resolve conflicts if any
   - Rebase on latest `Siddhi` before merging

## Testing

### Server Tests
```bash
cd nexusflow/server

# Setup database
npm run setup:db

# Seed sample data
npm run seed

# Run simulated load
npm run simulate -- --rate=1000 --duration=30

# Full audit
npm run audit -- --rate=5000 --duration=60
```

### Client Tests
```bash
cd nexusflow/client

# Manual testing during development
npm run dev

# Production build test
npm run build && npm run preview
```

## Documentation

- Update `README.md` for major feature changes
- Add `.md` files in `nexusflow/docs/` for detailed technical docs
- Include inline code comments for complex logic
- Keep the API endpoints list in `README.md` up to date
- Document environment variables with defaults and purposes

## Reporting Issues

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs. actual behavior
- Environment info (Node version, OS, MongoDB version)
- Relevant logs or error messages
- Screenshots if UI-related

## Questions or Discussions

- Open a GitHub Discussion for questions
- Use Issues only for bugs and feature requests
- Check existing issues before opening duplicates

## Performance Considerations

- Server: Keep request handlers async and non-blocking
- Database: Use indexes; avoid N+1 queries
- Client: Minimize re-renders; use React.memo for expensive components
- Ingestion: Maintain bounded queues to prevent memory leaks

## Branch Protection & CI

The `Siddhi` branch has:
- Automated tests (if configured)
- Linting checks
- Code review requirements
- Protection against force-pushes

Always create PRs for any changes; never push directly to `Siddhi`.

## Questions?

Contact the project maintainer or open a discussion thread.

---

Thank you for making NexusFlow better! 🚀
