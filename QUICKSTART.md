# Quick Start Guide

Get up and running with Scrummaster in minutes using one of our installation methods.

## One-Click Installation (Recommended)

The fastest way to install Scrummaster is using our universal installer:

### Unix/macOS

```bash
curl -fsSL install.cat/harris-azmon/conductor | sh
```

### Windows (PowerShell)

```powershell
irm install.cat/harris-azmon/conductor | iex
```

This installer uses [mise](https://mise.jdx.dev/) to manage dependencies and provides the most consistent experience across platforms.

## Alternative Installation Methods

### Via mise directly

```bash
mise install harris-azmon/conductor
```

### Via Smithery (Coming Soon)

```bash
smithery install scrummaster
```

### Manual Installation

If you prefer to install manually:

1. Clone the repository:

   ```bash
   git clone https://github.com/harris-azmon/conductor.git
   cd conductor
   ```

2. Install dependencies using mise:

   ```bash
   mise install
   ```

3. Run the installer:

   ```bash
   python scripts/scrummaster_install.py --all
   ```

## Verify Installation

After installation, verify everything is working:

```bash
# Check if mise is working
mise --version

# Verify Scrummaster components
python -c "import scrummaster_core; print('Core installed')"
```

## Next Steps

Once installed, initialize your project:

```bash
/scrummaster:setup
```

Then create your first epic and story:

```bash
/scrummaster:newepic "My first initiative"
/scrummaster:newstory "My first feature"
```

## Troubleshooting

If you encounter issues:

1. **Check prerequisites**: Ensure Fossil, Python 3.9+, and Node.js 18+ are installed
2. **Verify mise**: Run `mise doctor` to diagnose issues
3. **Check PATH**: Ensure mise and Scrummaster binaries are in your PATH
4. **Review logs**: Check the installer output for specific error messages

For more detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
