# ClickUpCommandLine

A CLI tool for interacting with ClickUp.

## Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd ClickUpCommandLine
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Build the project:**
   ```bash
   yarn build
   ```

4. **Link the CLI globally:**
   This command ensures you can run `clk` from anywhere in your terminal.
   ```bash
   npm link
   # OR if using yarn:
   # yarn link
   ```

## Usage

After linking, you can execute the CLI directly. Note, you will need a .env file with your CLICKUP_API_KEY variable declared with your API token.

```bash
clk stop
clk tasks
```

## Development

- **Build changes:** `yarn build`
- **Run without linking:** `yarn start`
