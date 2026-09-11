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

## Why JuPedSim

[JuPedSim](https://www.jupedsim.org) is an open-source pedestrian dynamics
library. It provides the pieces this demo needs out of the box:

- a walkable area with obstacles (the pegs) and automatic routing around them,
- journeys built from waypoint stages with explicit transitions, which is how
  the per-row left/right decision is expressed,
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
