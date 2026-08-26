# Installation Methods for Scrummaster

Scrummaster can be installed through multiple methods to suit different environments and preferences.

## Quick Install

### Via mise (Recommended)

```bash
# Install using mise (cross-platform)
mise install harris-azmon/conductor

# Or run directly
curl -fsSL install.cat/harris-azmon/conductor | sh
```

### Via Smithery (Coming Soon)

```bash
# Once published to Smithery
smithery install scrummaster
```

## Detailed Installation Methods

### 1. Traditional Package Managers

#### pip (Python)

```bash
pip install scrummaster-core
```

#### npm (Node.js)

```bash
npm install -g @scrummaster/acid-cli
```

### 2. Cross-Platform Package Managers

#### Homebrew (macOS/Linux)

```bash
# Coming soon
brew tap harris-azmon/scrummaster
brew install scrummaster
```

#### Chocolatey (Windows)

```powershell
# Coming soon
choco install scrummaster
```

#### Scoop (Windows)

```powershell
# Coming soon
scoop bucket add scrummaster https://github.com/harris-azmon/scoop-scrummaster
scoop install scrummaster
```

### 3. Direct Download

#### GitHub Releases

1. Visit [GitHub Releases](https://github.com/harris-azmon/conductor/releases)
2. Download the appropriate binary for your platform
3. Extract and add to PATH

#### From Source

```bash
git clone https://github.com/harris-azmon/conductor.git
cd conductor
./install.sh  # Unix/macOS
# or
./install.ps1  # Windows
```

## Prerequisites

All installation methods require:

- [Fossil SCM](https://fossil-scm.org/) (>= 2.0)
- Python (>= 3.9) or Node.js (>= 18)
- Internet connection for initial setup

## Verification

After installation, verify Scrummaster is working:

```bash
# Check version
scrummaster --version

# Run setup
scrummaster:setup

# Verify installation
mise run verify  # if using mise
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Run with appropriate permissions (may require sudo on Unix)
   - Check PATH environment variable

2. **Missing Dependencies**
   - Ensure Fossil, Python/Node.js are installed
   - Check version requirements

3. **Network Issues**
   - Verify internet connection
   - Check firewall/proxy settings

## Contributing to Installation Methods

Want to add support for another package manager or marketplace?

1. Fork the repository
2. Add the necessary configuration files
3. Submit a pull request with your changes

Currently supported marketplace integrations:

- [x] mise
- [ ] Smithery
- [ ] Homebrew
- [ ] Chocolatey
- [ ] Scoop
- [ ] npm Registry
- [ ] PyPI
