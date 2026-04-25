<div align="center">

# GitBreaker

<!-- [INSERT YOUR SVG LINK HERE] e.g., <img src="..." alt="CommitBreaker SVG" /> -->

**An interactive arcade engine generated dynamically from GitHub contribution heatmaps.**

</div>

## Overview

GitBreaker merges gamification with GitHub activity data. It translates a developer's repository contribution heatmap into a multi-layered, fully playable brick-breaker physics simulation. The architecture serves both as a live browser-based arcade game and an autonomous, invincible SVG simulation engine designed specifically for developer profile readmes.

## Core Architecture

GitBreaker is engineered without external node modules for the client, utilizing vanilla JavaScript and native Browser APIs for maximal performance. The data pipeline leverages Vercel Serverless Functions to securely proxy GitHub GraphQL requests.

- **Multi-Year Timelines**: Aggregates up to five contiguous years of contribution history into physical gameplay layers.
- **Physical Timeline Progression**: Completing a chronological layer physically transitions the engine into the subsequent parsed year in a ping-pong chronological flow.
- **Autonomous Sub-Stepping Physics**: The headless simulation engine interpolates sub-steps for physical intersections to mathematically guarantee a flawless board clearance for SVG generation.
- **Dynamic Theming Support**: Integrates synchronized palette themes matching the GitHub ecosystem (Dark, Light, Dracula, Outrun).

## Structure

The infrastructure is split into dual execution models:

- `/game`: The front-end client interface. Contains the collision tree, HTML5 Canvas renderer, and the unified event loop.
- `/generator`: The headless simulation infrastructure. Parses historical timelines from the API proxy and synthesizes exact frame keyframes into raw animated SVG code.
- `/api`: Vercel edge endpoints handling GitHub authentication, data aggregation via GraphQL aliases, and raw SVG transmission.

## Local Development Setup

No standard package managers are required to develop or extend the core visualization engine. 

1. Clone the repository.
   ```bash
   git clone https://github.com/techno-rax/gitbreaker.git
   cd gitbreaker
   ```

2. Establish environmental variables.
   You must map a GitHub Personal Access Token to bypass unauthenticated GraphQL rate limits. Create a local `.env` file or export the variable into your terminal session.
   ```bash
   GITHUB_TOKEN=your_personal_access_token
   ```

3. Initialize the development server.
   The project is configured for Vercel's integrated local development environment.
   ```bash
   npx vercel dev
   ```

The live web game will be accessible at `http://localhost:3000`, while the unauthenticated SVG renderer endpoints are exposed at `http://localhost:3000/api/svg`.

## Production Deployment

GitBreaker is structurally configured for zero-configuration deployments via Vercel. 

1. Import the repository into the Vercel Dashboard.
2. Bind the `GITHUB_TOKEN` variable directly into your environment secrets.
3. Deploy. The `vercel.json` natively routes `/api/*` to the serverless infrastructure while statically hosting the `/game` client tree.

## Security 

The repository utilizes continuous integration pipelines leveraging native GitHub Action workflows. Pushes are statically analyzed via CodeQL to audit structural application stability prior to integration.
