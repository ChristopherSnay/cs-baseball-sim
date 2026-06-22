# ⚾ Diamond Sim - Baseball Simulator

A React TypeScript single-page application that simulates a complete 162-game baseball season with team roster drafting and statistical tracking.

🚀 **[Play the Game](https://christophersnay.github.io/cs-baseball-sim/)**

## Features

- **Team Generation**: Generate 20 CPU teams + 1 user team with custom names
- **Snake Draft**: 20-round draft with intelligent CPU auto-pick logic based on team needs
- **Season Simulation**: Full 162-game schedule with realistic game outcomes
- **Player Statistics**: Track batting and pitching statistics with computed derived stats
- **Standings & Leaderboards**: View final standings and player stat leaders
- **Local Persistence**: All game state saved to localStorage with version management

## Tech Stack

- **React 18** + TypeScript
- **React Router v6** for navigation
- **MUI v5** (Material-UI) with custom baseball theme
- **React Context + useReducer** for state management
- **Vite** for fast development and building

## Project Structure

```
src/
├── data/
│   └── seeds.ts              # Team and player name seed data
├── types/
│   └── index.ts              # Global TypeScript interfaces
├── context/
│   └── GameContext.tsx        # Global game state & actions
├── utils/
│   ├── playerGenerator.ts    # ~1000 player pool generation
│   ├── draftEngine.ts        # Snake draft logic & CPU AI
│   ├── scheduleGenerator.ts  # 162-game schedule creation
│   └── simulationEngine.ts   # Game simulation & stat accumulation
├── pages/
│   ├── Home.tsx              # Team generation screen
│   ├── Draft.tsx             # Snake draft interface
│   └── Season.tsx            # Season results & leaderboards
├── components/
│   ├── DraftBoard.tsx        # Draft pick history panel
│   ├── PlayerPickerTable.tsx # Player selection interface
│   ├── StandingsTable.tsx    # Final standings display
│   └── StatsLeaderboard.tsx  # Batting/pitching leaders
├── App.tsx                   # Router & theme provider
├── main.tsx                  # React entry point
├── theme.ts                  # MUI baseball theme
└── index.css                 # Global styles
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run start
```

The app will open at `http://localhost:3000`

### Build

```bash
npm run build
```

## Game Flow

### 1. Home Screen (`/`)
- Enter your team's city and nickname
- Generates 20 random CPU teams and your user team
- Navigates to draft

### 2. Draft Screen (`/draft`)
- Snake draft order for 20 rounds (420 total picks)
- CPU teams auto-draft based on position needs
- When it's your turn, select from available players
- Sortable/filterable player table by position and attributes

### 3. Season Screen (`/season`)
- Automatic 162-game schedule generation
- Simulated games using team offensive/pitching ratings
- Final standings with win percentage and games behind
- Stat leaders for batting (AVG, HR, RBI, OPS, etc.) and pitching (ERA, WHIP, W-L, etc.)
- "Play Again" button to reset and start over

## Player Attributes

### Hitters
- **Contact** (1-99): Hit probability
- **Power** (1-99): Home run probability  
- **Speed** (1-99): Base running & stealing
- **Fielding** (1-99): Defensive ability
- **Arm** (1-99): Throwing strength

### Pitchers
- **Stuff** (1-99): Fastball velocity/effectiveness
- **Control** (1-99): Accuracy/walk rate
- **Stamina** (1-99): Innings per appearance (higher for SP)

## Roster Requirements (20 players per team)

- **1 C** (Catcher)
- **1 of each infield**: 1B, 2B, 3B, SS
- **3 Outfielders**: LF, CF, RF
- **3 Bench** (Any hitter - DH selected from bench during games)
- **4 SP** (Starting Pitchers)
- **4 RP** (Relief Pitchers)
- **1 CL** (Closer)

**Note:** The DH (Designated Hitter) position is filled during games from bench hitters, selecting the one with the best offensive ability (high contact/power) and lowest fielding liability.

## State Persistence

All game state is automatically saved to `localStorage` under the key `diamondSim_state` with version management. If the app version changes, saved state is discarded.

## Customization

### Theme Colors
Edit `src/theme.ts` to customize the baseball-inspired palette:
- Primary: Deep green (#1a6b3c)
- Secondary: Gold/tan (#c8a951)
- Background: Dark navy (#0f1923)

### Seed Data
Modify `src/data/seeds.ts` to add or change:
- Player first/last names (100+ first names, 200+ last names)
- Team names (30+ city/nickname pairs)

### Simulation Tuning
Adjust formulas in `src/utils/simulationEngine.ts`:
- Game scoring calculations
- Player stat accumulation rates
- Derived stat formulas (AVG, OBP, ERA, etc.)

## License

MIT
