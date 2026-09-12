# A Galton board walked by pedestrians

[![Watch the video](https://img.youtube.com/vi/ekbvCdy1P3w/0.jpg)](https://www.youtube.com/shorts/ekbvCdy1P3w)

▶ https://www.youtube.com/shorts/ekbvCdy1P3w

## The problem

The [Galton board](https://en.wikipedia.org/wiki/Galton_board) is the classic
demonstration of the central limit theorem. Balls drop through staggered rows
of pins, bounce left or right at every pin, and pile up at the bottom in a
bell-shaped heap. Each ball performs a random walk, and the sum of many
independent ±1 steps is approximately normally distributed.

Here the balls are pedestrians. 800 agents enter through a 1.2 m slit at the
top of a 24 m × 34 m arena and walk through 10 staggered rows of pegs. At
every row an agent flips a coin and takes the left or right gap below its
current one. At the bottom, each column has its own exit, so the exit
position records the outcome of 10 coin flips.

Result of the run in this repository:

| quantity | value |
|---|---|
| agents arrived | 681 |
| mean exit position | 12.0 m (board centre) |
| standard deviation | 3.36 m |
| random-walk prediction | √10 · 1 m = 3.16 m |

## How the coin flip is modelled in JuPedSim

The interesting part is not the board, it is how a per-row random decision is
expressed with JuPedSim's journey system. JuPedSim has no probabilistic
transition, so the randomness lives in Python and JuPedSim does the walking.

1. **One waypoint stage per gap.** Every gap of every peg row that is
   reachable from the slit gets a waypoint stage at the gap centre with a
   0.5 m radius: 2 gaps in the first row, 3 in the second, up to 11 in the
   last, plus a start waypoint above the first row.

2. **Coin flips at spawn time.** When an agent is created, numpy draws 10
   values from {−1, +1} with equal probability. The cumulative sum of the
   first r+1 flips is the gap offset after row r, so the tuple is the agent's
   complete path.

3. **The path becomes a journey.** For that tuple the code builds a
   `JourneyDescription` whose stages are the start waypoint, the 10 chosen
   gap waypoints and the exit of the final column, with a fixed transition
   from each stage to the next. Journeys are cached by tuple, so identical
   paths share one journey.

4. **One exit per column.** JuPedSim steers towards the centroid of an exit
   polygon. A single wide exit pulled every agent back to the centre after
   the last row, so each column has its own 0.9 m exit bin.

5. **JuPedSim does the rest.** Routing takes the agent from waypoint to
   waypoint around the pegs, and the collision-free speed model handles
   queueing and interactions. The agent never decides anything during the
   run, so the probability is exactly 1/2 per row and the exit histogram is a
   true binomial(10, 1/2) sample. What the simulation adds is the physical
   walk, not the randomness.

Two alternatives were tried and rejected:

- **Round-robin transitions** inside JuPedSim, alternating left and right at
  each gap. That is a rotor-router: deterministic, far too regular, and the
  spread collapsed.
- **No waypoints, just an exit.** Shortest-path routing is deterministic, so
  every agent walked straight down the middle.

If the decision should live inside the simulation, the closest option is
`switch_agent_journey` when an agent reaches a row, rolling the die there
instead of at spawn.

## Why JuPedSim

[JuPedSim](https://www.jupedsim.org) is an open-source pedestrian dynamics
library. It provides the pieces this demo needs out of the box:

- a walkable area with obstacles (the pegs) and automatic routing around them,
- journeys built from waypoint stages with explicit transitions,
- operational models that keep agents from overlapping, so the stream really
  does split and queue at the pegs like balls on pins,
- a trajectory file that the [JuPedSim web app](https://app.jupedsim.org)
  loads directly to play back the simulation with a density heatmap.

## Files

- `galton.py`: builds the geometry, runs the simulation, writes
  `galton.sqlite`, `arrivals.npy` and the histogram `galton_hist.png`.
- `render.py`: renders `galton.sqlite` as an mp4 with a cumulative occupancy
  heatmap.
- `video/`: the [Remotion](https://www.remotion.dev) project for the
  published video (title card, screen recording from the web app, animated
  histogram, thumbnail).

## Run

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python galton.py      # simulation + histogram
.venv/bin/python render.py      # optional: heatmap video from the sqlite file
```

Open `galton.sqlite` in https://app.jupedsim.org to play it back interactively.

To rebuild the published video:

```bash
cd video && npm install
npm run render                          # video/out/galton_final.mp4
npx remotion still src/index.ts Thumb out/thumbnail.png
```

The Remotion project expects `video/public/sim.mp4`, a screen recording of
the web-app playback of `galton.sqlite`. It is not in the repository; the
finished result is on YouTube. Record your own and drop it in, or adjust
`VIDEO_S` in `video/src/Galton.tsx` to its length. `video/src/hist.json`
holds the exit-bin counts exported from `arrivals.npy`.

## Credits and license

Code: MIT, see `LICENSE`.

Galton board photo in the video and thumbnail: Matemateca (IME/USP), photo by
Rodrigo Argenton,
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), via
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Galton_box.jpg).
Galton's 1889 quincunx drawing (`video/public/galton_1889.png`) is in the
public domain.
