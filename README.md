# DeadReplica — 2D Co-op Survival Game Client

A 1–4 player 2D co-op survival/crafting game client built in TypeScript and Vite with a server-authoritative architecture.

## Architecture

The rendering and input layer contains **zero authoritative game logic**. Everything flows through a command queue and driver abstraction:

```text
Input (WASD / Mouse / Hotbar 1-0)
  ↓
Client API / Commands
  ↓
OutgoingCommandQueue (prints [OUTGOING COMMAND] to console)
  ↓
GameDriver Interface
  ↓
LocalGameDriver (local authoritative simulation)
  ↓
GameState
  ↓
Renderer & Camera (pure projection)
```

This design ensures seamless replacement of `LocalGameDriver` with a future `NetworkGameDriver` without modifying renderer, camera, entities, or input systems.

## Features

- **Continuous 2D Coordinates & Hitboxes**: Unconstrained by tile grids; circular hitboxes separated from sprite visual dimensions.
- **Natural Resources**: Trees (Wood), Rocks (Stone), Gold Nodes (Gold) distributed across the world with minimum spacing.
- **Tools & Infinite Upgrades**: Axe, Pickaxe, Sword, and Bow with configurable curves (`statCurve`, `costCurve`) and procedural visual upgrade glints/tints (`hueShift`, `glow`, `glint`).
- **Items**: Apples (heal), Wrench (repair buildings), Revive Kits (revive downed teammates).
- **Buildings**: Walls, Auto Turrets (targets zombies), and Miners (extracts Wood, Stone, or Gold).
- **Zombies**: Same silhouette and equipment system as players with hostile AI behaviors.
- **Developer Debug API**: Global `window.game` and `window.debug` APIs, interactive in-game dev drawer (`~` or `F1`).

## Setup & Running

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run automated verification suite
npx tsx test/verify.ts

# Production build
npm run build
```

## Controls

- **Move**: `W`, `A`, `S`, `D` or Arrow Keys
- **Aim**: Mouse pointer
- **Action / Attack / Mine / Place**: Left Click or `Space`
- **Hotbar**: Keys `1` - `0`
- **Upgrade Held Tool**: `U` or `E`
- **Cycle Miner Resource**: `R`
- **Developer Console**: `~` (Backquote) or `F1`
