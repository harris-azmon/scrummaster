# Homebrew Tap for Scrummaster

## Installation

```bash
# Add the tap
brew tap harris-azmon/scrummaster

# Install scrummaster
brew install scrummaster
```

## Creating the Formula

To create the Homebrew formula for Scrummaster, create a file named `scrummaster.rb` in the `Formula/` directory:

```ruby
class Scrummaster < Formula
  desc "Context-Driven Development tool for AI-assisted workflows"
  homepage "https://github.com/harris-azmon/conductor"
  url "https://github.com/harris-azmon/conductor/archive/v0.1.0.tar.gz"
  sha256 "TODO_REPLACE_WITH_ACTUAL_SHA256"
  license "Apache-2.0"

  depends_on "python@3.9"
  depends_on "node"
  depends_on "fossil"

  def install
    # Install core Python packages
    system "pip3", "install", *std_pip_args.add_test_deps.add_development_deps, buildpath

    # Install mise configuration
    (prefix/"etc/mise").install "mise.toml"

    # Install scripts
    bin.install Dir["scripts/*"]

    # Create launcher script
    (bin/"scrummaster").write <<~EOS
      #!/bin/bash
      exec mise run scrummaster "$@"
    EOS
  end

  test do
    system "#{bin}/scrummaster", "--version"
  end
end
```

## Publishing Process

1. Fork the [Homebrew/homebrew-core](https://github.com/Homebrew/homebrew-core) repository
2. Create the formula file in `Formula/scrummaster.rb`
3. Run `brew audit --new-formula scrummaster.rb` to check for issues
4. Submit a pull request with the formula

## Alternative: Personal Tap

For faster iteration, you can create a personal tap:

```bash
# Create your tap repository
mkdir -p ~/tap/harris-azmon/scrummaster/Formula
cp scrummaster.rb ~/tap/harris-azmon/scrummaster/Formula/
cd ~/tap/harris-azmon/scrummaster
git init
git add .
git commit -m "Add scrummaster formula"
git remote add origin https://github.com/YOUR_USERNAME/homebrew-scrummaster.git
git push -u origin main

# Users can then install with:
brew tap harris-azmon/scrummaster
brew install scrummaster
```
