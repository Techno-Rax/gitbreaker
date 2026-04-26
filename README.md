<div align="center">

# 🎮 GitBreaker

[![CommitBreaker](https://gitbreaker.vercel.app/api/svg?user=anoojshete&theme=github-dark)](https://gitbreaker.vercel.app)
[![CommitBreaker](https://gitbreaker.vercel.app/api/svg?user=anoojshete&theme=github-light)](https://gitbreaker.vercel.app)
**Turn GitHub contributions into a playable arcade game.**

</div>

---

## 🧠 Overview

GitBreaker transforms a developer’s GitHub contribution heatmap into an interactive brick-breaker game.

Each day becomes a brick. More contributions = stronger bricks.

It runs in two modes:

* 🎮 **Playable web game** (Canvas-based)
* 🎬 **Autonomous SVG simulation** (for READMEs & profiles)

---

## ⚙️ Core Concepts

* **Contribution → Gameplay Mapping**
  Each cell in the GitHub heatmap becomes a brick with HP based on activity.

* **Deterministic Simulation Engine**
  The generator produces a fully reproducible playthrough for SVG rendering.

* **Zero Dependency Runtime**
  Built using vanilla JavaScript and browser APIs — no frameworks, no build step.

* **Serverless Data Pipeline**
  GitHub data is fetched securely using Vercel serverless functions.

---

## 🏗️ Architecture

```id="3m3lqk"
gitbreaker/
├── game/        # Playable Canvas game
├── generator/   # SVG simulation engine
├── api/         # Vercel serverless functions
├── output/      # Generated SVG
```

### Execution Layers

* **Client (`/game`)**

  * HTML5 Canvas renderer
  * Input system (mouse, keyboard, touch)
  * Real-time physics + collision

* **Simulation (`/generator`)**

  * Headless deterministic engine
  * Frame-by-frame SVG keyframe generation

* **API (`/api`)**

  * GitHub GraphQL proxy
  * Contribution aggregation
  * SVG endpoint

---

## 🚀 Local Development

```bash id="jz9h2v"
git clone https://github.com/techno-rax/gitbreaker.git
cd gitbreaker
```

### 1. Set environment variable

```bash id="b2cn6x"
GITHUB_TOKEN=your_personal_access_token
```

### 2. Run locally

```bash id="n6fh0k"
npx vercel dev
```

* Game: http://localhost:3000
* SVG API: http://localhost:3000/api/svg

---

## 🌐 Deployment

Optimized for Vercel:

1. Import repo into Vercel
2. Add environment variable:

   ```
   GITHUB_TOKEN
   ```
3. Deploy

Routing is handled via `vercel.json`.

---

## 🔐 Security

* GitHub tokens are never exposed client-side
* All API calls are proxied through serverless functions
* CI includes static analysis (CodeQL)

---

## ✨ Highlights

* No dependencies
* Deterministic physics engine
* Works in README via SVG
* Real GitHub data as gameplay
* Lightweight and fast

---

## 🖼️ SVG Embed

Endpoint:

```text
/api/svg?user=<username>&theme=<theme>
```

### Optional Rendering Controls

* `watermarkOpacity=<0.04..0.35>` adjusts year watermark visibility

Examples:

```markdown
[![CommitBreaker](https://gitbreaker.vercel.app/api/svg?user=techno-rax&theme=github-dark)](https://gitbreaker.vercel.app)
[![CommitBreaker](https://gitbreaker.vercel.app/api/svg?user=techno-rax&theme=dracula)](https://gitbreaker.vercel.app)
[![CommitBreaker](https://gitbreaker.vercel.app/api/svg?user=techno-rax&theme=github-light&watermarkOpacity=0.16)](https://gitbreaker.vercel.app)
```

---

## 📜 License

MIT © techno-rax
