## Modifications for TrustDAI 

Prototype decryption sample:
```
./start-with-decrypted.js -k <key> -i https://0xfbaf585140b7017a06a428c4f65fa227800eefd9.3337.w3link.io/0x6969eea2f225e64c0857d07a9a9752f57fb61d56-basicDetails -c mediaexpert
```
Usage:
```
./start-with-decrypted.js -k <key> -i <url-to-decrypt> -c <character>
```
Characters are statically defined in the js, but reference characters listed in `./characters/` 

## Quick setup for TrustDAI on Linux
```
git pull https://github.com/vhspace/eliza
cd eliza
git switch develop
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm use 23.3.0
nvm use default 23.3.0
## you may need to reload your shell
pnpm install
pnpm build
# make sure the trustdai-helper is started and running on port 3000 https://github.com/0xbala-k/TrustDAI-helper
```
 - Start a tmux or screen session, you'll need two processes, one to host the chatbot on 5371, and one that runs the llm.
 - Make sure to configure an llm in the .env (copy from .env-sample).  There are some additional configs after this section you need to make
 - Start the chatbot frontend: 
`SERVER_PORT=3001 pnpm start:client`
 - The default port is 3000, but since the TrustDAI-helper needs to run on port 3000, we'll need to use 3001. The chatbot won't connect otherwise and you'll have a empty chat window. 
 - Start the eliza backend: 
` NODE_OPTIONS="--max-old-space-size=8192" pnpm start  --characters="characters/mediaexpert.character.json"`
 - NODE_OPTIONS is optional, but increasing the memory prevents eliza from crashing at startup due to errors in the characterfile or injected data from Lit -- misconfigurations cause the indexer to struggle with memory. 

```
WALLET_PRIVATE_KEY=<key>
ETH_STORAGE_CONTRACT_ADDRESS=0x65a819551be75e1b0959411378a3b09e97b39a4f #ethstorage contract
DATA_REGISTRY_CONTRACT=0x65a819551be75e1b0959411378a3b09e97b39a4f # eth contract
HELPER_API_URL=http://localhost:3000 # where TrustDAI-helper runs
CHAIN=sepolia
LIT_NETWORK=datil-test
OUTPUT_DIR=./decrypted-files
RPC_URL=https://sepolia.infura.io/v3/<get this from metamask developer>
# Setting to false to use real data
USE_MOCK_DATA=false
# Wallet credentials
WALLET_ADDRESS=<wallet address>
# Lit Protocol config
LIT_NETWORK=datil
CHAIN=sepolia
```

# Eliza 🤖

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">

📑 [Technical Report](https://arxiv.org/pdf/2501.06781) |  📖 [Documentation](https://elizaos.github.io/eliza/) | 🎯 [Examples](https://github.com/thejoven/awesome-eliza)

</div>

## 🌍 README Translations

[中文说明](i18n/readme/README_CN.md) | [日本語の説明](i18n/readme/README_JA.md) | [한국어 설명](i18n/readme/README_KOR.md) | [Persian](i18n/readme/README_FA.md) | [Français](i18n/readme/README_FR.md) | [Português](i18n/readme/README_PTBR.md) | [Türkçe](i18n/readme/README_TR.md) | [Русский](i18n/readme/README_RU.md) | [Español](i18n/readme/README_ES.md) | [Italiano](i18n/readme/README_IT.md) | [ไทย](i18n/readme/README_TH.md) | [Deutsch](i18n/readme/README_DE.md) | [Tiếng Việt](i18n/readme/README_VI.md) | [עִברִית](i18n/readme/README_HE.md) | [Tagalog](i18n/readme/README_TG.md) | [Polski](i18n/readme/README_PL.md) | [Arabic](i18n/readme/README_AR.md) | [Hungarian](i18n/readme/README_HU.md) | [Srpski](i18n/readme/README_RS.md) | [Română](i18n/readme/README_RO.md) | [Nederlands](i18n/readme/README_NL.md) | [Ελληνικά](i18n/readme/README_GR.md)

## 🚩 Overview

<div align="center">
  <img src="./docs/static/img/eliza_diagram.png" alt="Eliza Diagram" width="100%" />
</div>

## ✨ Features

- 🛠️ Full-featured Discord, X (Twitter) and Telegram connectors
- 🔗 Support for every model (Llama, Grok, OpenAI, Anthropic, Gemini, etc.)
- 👥 Multi-agent and room support
- 📚 Easily ingest and interact with your documents
- 💾 Retrievable memory and document store
- 🚀 Highly extensible - create your own actions and clients
- 📦 Just works!

## Video Tutorials

[AI Agent Dev School](https://www.youtube.com/watch?v=ArptLpQiKfI&list=PLx5pnFXdPTRzWla0RaOxALTSTnVq53fKL)

## 🎯 Use Cases

- 🤖 Chatbots
- 🕵️ Autonomous Agents
- 📈 Business Process Handling
- 🎮 Video Game NPCs
- 🧠 Trading

## 🚀 Quick Start

### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)

> **Note for Windows Users:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) is required.

### Use the Starter (Recommended for Agent Creation)

Full steps and documentation can be found in the [Eliza Starter Repository](https://github.com/elizaOS/eliza-starter).
```bash
git clone https://github.com/elizaos/eliza-starter.git
cd eliza-starter
cp .env.example .env
pnpm i && pnpm build && pnpm start
```

### Manually Start Eliza (Only recommended for plugin or platform development)

#### Checkout the latest release

```bash
# Clone the repository
git clone https://github.com/elizaos/eliza.git

# This project iterates fast, so we recommend checking out the latest release
git checkout $(git describe --tags --abbrev=0)
# If the above doesn't checkout the latest release, this should work:
# git checkout $(git describe --tags `git rev-list --tags --max-count=1`)
```

If you would like the sample character files too, then run this:
```bash
# Download characters submodule from the character repos
git submodule update --init
```

#### Edit the .env file

Copy .env.example to .env and fill in the appropriate values.

```
cp .env.example .env
```

Note: .env is optional. If you're planning to run multiple distinct agents, you can pass secrets through the character JSON

#### Start Eliza

```bash
pnpm i
pnpm build
pnpm start

# The project iterates fast, sometimes you need to clean the project if you are coming back to the project
pnpm clean
```

### Interact via Browser

Once the agent is running, you should see the message to run "pnpm start:client" at the end.

Open another terminal, move to the same directory, run the command below, then follow the URL to chat with your agent.

```bash
pnpm start:client
```

Then read the [Documentation](https://elizaos.github.io/eliza/) to learn how to customize your Eliza.

---

### Automatically Start Eliza

The start script provides an automated way to set up and run Eliza:

```bash
sh scripts/start.sh
```

For detailed instructions on using the start script, including character management and troubleshooting, see our [Start Script Guide](./docs/docs/guides/start-script.md).

> **Note**: The start script handles all dependencies, environment setup, and character management automatically.

---

### Modify Character

1. Open `packages/core/src/defaultCharacter.ts` to modify the default character. Uncomment and edit.

2. To load custom characters:
    - Use `pnpm start --characters="path/to/your/character.json"`
    - Multiple character files can be loaded simultaneously
3. Connect with X (Twitter)
    - change `"clients": []` to `"clients": ["twitter"]` in the character file to connect with X

---

### Add more plugins

1. run `npx elizaos plugins list` to get a list of available plugins or visit https://elizaos.github.io/registry/

2. run `npx elizaos plugins add @elizaos-plugins/plugin-NAME` to install the plugin into your instance

#### Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```
pnpm install --include=optional sharp
```

---

### Start Eliza with Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/elizaos/eliza/tree/main)

---

### Deploy Eliza in one click

Use [Fleek](https://fleek.xyz/eliza/) to deploy Eliza in one click. This opens Eliza to non-developers and provides the following options to build your agent:
1. Start with a template
2. Build characterfile from scratch
3. Upload pre-made characterfile

Click [here](https://fleek.xyz/eliza/) to get started!

---

### Community & contact

- [GitHub Issues](https://github.com/elizaos/eliza/issues). Best for: bugs you encounter using Eliza, and feature proposals.
- [elizaOS Discord](https://discord.gg/elizaos). Best for: hanging out with the elizaOS technical community
- [DAO Discord](https://discord.gg/ai16z). Best for: hanging out with the larger non-technical community

## Citation

We now have a [paper](https://arxiv.org/pdf/2501.06781) you can cite for the Eliza OS:
```bibtex
@article{walters2025eliza,
  title={Eliza: A Web3 friendly AI Agent Operating System},
  author={Walters, Shaw and Gao, Sam and Nerd, Shakker and Da, Feng and Williams, Warren and Meng, Ting-Chien and Han, Hunter and He, Frank and Zhang, Allen and Wu, Ming and others},
  journal={arXiv preprint arXiv:2501.06781},
  year={2025}
}
```

## Contributors

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" alt="Eliza project contributors" />
</a>


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)

## 🛠️ System Requirements

### Minimum Requirements
- CPU: Dual-core processor
- RAM: 4GB
- Storage: 1GB free space
- Internet connection: Broadband (1 Mbps+)

### Software Requirements
- Python 2.7+ (3.8+ recommended)
- Node.js 23+
- pnpm
- Git

### Optional Requirements
- GPU: For running local LLM models
- Additional storage: For document storage and memory
- Higher RAM: For running multiple agents

## 📁 Project Structure
```
eliza/
├── packages/
│   ├── core/           # Core Eliza functionality
│   ├── clients/        # Client implementations
│   └── actions/        # Custom actions
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── examples/          # Example implementations
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started
1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

### Types of Contributions
- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🌍 Translations
- 🧪 Test improvements

### Code Style
- Follow the existing code style
- Add comments for complex logic
- Update documentation for changes
- Add tests for new features
