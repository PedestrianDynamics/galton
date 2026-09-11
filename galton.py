"""Galton-board scenario in JuPedSim: narrow spawn slit, staggered pegs, wide exit.

Writes galton.sqlite (trajectories) and galton_hist.png (arrival histogram).
"""
import numpy as np
import shapely
from shapely.geometry import Polygon, box
import jupedsim as jps
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ---- geometry (metres) -----------------------------------------------------
WIDTH, HEIGHT = 24.0, 34.0
SLIT_W = 1.2                      # narrow inlet at the top centre
PEG_HALF = 0.4                    # half diagonal of diamond pegs
ROWS, DX, DY = 10, 2.0, 2.0       # staggered peg grid
Y_FIRST_ROW = HEIGHT - 6.0

outer = box(0, 0, WIDTH, HEIGHT)
# walls forming a funnel down to the slit
funnel = shapely.union_all([
    box(0, HEIGHT - 2.0, WIDTH / 2 - SLIT_W / 2, HEIGHT - 1.0),
    box(WIDTH / 2 + SLIT_W / 2, HEIGHT - 2.0, WIDTH, HEIGHT - 1.0),
])
pegs = []
for r in range(ROWS):
    y = Y_FIRST_ROW - r * DY
    offset = (DX / 2) if r % 2 else 0.0
    for x in np.arange(WIDTH / 2 - 12.0 + offset, WIDTH / 2 + 12.0 + 1e-6, DX):
        if 0.5 < x < WIDTH - 0.5:
            pegs.append(Polygon([(x, y + PEG_HALF), (x + PEG_HALF, y),
                                 (x, y - PEG_HALF), (x - PEG_HALF, y)]))
walkable = outer.difference(funnel).difference(shapely.union_all(pegs))

spawn_area = box(WIDTH / 2 - SLIT_W / 2 + 0.05, HEIGHT - 0.9,
                 WIDTH / 2 + SLIT_W / 2 - 0.05, HEIGHT - 0.1)
# one exit bin per column, so agents keep their x after the last row
# (JuPedSim steers towards the centroid of an exit polygon)
exit_bins = {k: box(WIDTH / 2 + k * DX / 2 - 0.45, 0.1, WIDTH / 2 + k * DX / 2 + 0.45, 1.0)
             for k in range(-ROWS, ROWS + 1, 2)}

# ---- simulation -------------------------------------------------------------
# Every peg row is a decision point: each agent flips a coin per row and walks
# through the left or right gap below its current gap (a random walk of
# ROWS steps), then leaves through the exit bin of the column it ends in.
N_AGENTS, SPAWN_EVERY_S = 800, 0.4
rng = np.random.default_rng(1)

sim = jps.Simulation(
    model=jps.CollisionFreeSpeedModel(),
    geometry=walkable,
    dt=0.02,
    trajectory_writer=(writer := jps.SqliteTrajectoryWriter(
        output_file="galton.sqlite", every_nth_frame=5)),
)
exit_ids = {k: sim.add_exit_stage(poly) for k, poly in exit_bins.items()}
start_id = sim.add_waypoint_stage((WIDTH / 2, Y_FIRST_ROW + 1.5), 0.5)
gaps = {}  # (row, offset) -> waypoint id; offset in units of DX/2 from centre
for r in range(ROWS):
    for k in range(-(r + 1), r + 2, 2):
        gaps[(r, k)] = sim.add_waypoint_stage(
            (WIDTH / 2 + k * DX / 2, Y_FIRST_ROW - r * DY), 0.5)

journeys = {}


def journey_for(steps):
    """Journey following the coin flips `steps` (tuple of +-1, one per row)."""
    if steps in journeys:
        return journeys[steps]
    k, path = 0, [start_id]
    for r, step in enumerate(steps):
        k += step
        path.append(gaps[(r, k)])
    path.append(exit_ids[k])
    journey = jps.JourneyDescription(path)
    for a, b in zip(path, path[1:]):
        journey.set_transition_for_stage(a, jps.Transition.create_fixed_transition(b))
    journeys[steps] = sim.add_journey(journey)
    return journeys[steps]


last_x, arrivals, spawned = {}, [], 0
spawn_period = int(SPAWN_EVERY_S / sim.delta_time())
slots = [(WIDTH / 2 - 0.3, HEIGHT - 0.5), (WIDTH / 2 + 0.3, HEIGHT - 0.5)]

while spawned < N_AGENTS or sim.agent_count() > 0:
    if spawned < N_AGENTS and sim.iteration_count() % spawn_period == 0:
        for p in slots:
            if list(sim.agents_in_range(p, 0.45)):
                continue
            steps = tuple(int(v) for v in rng.choice([-1, 1], ROWS))
            sim.add_agent(jps.CollisionFreeSpeedModelAgentParameters(
                position=p, journey_id=journey_for(steps), stage_id=start_id,
                desired_speed=float(rng.normal(1.2, 0.15)), radius=0.2))
            spawned += 1
    for a in sim.agents():
        last_x[a.id] = a.position[0]
    for aid in sim.removed_agents():
        arrivals.append(last_x.pop(aid))
    sim.iterate()
    if sim.iteration_count() % 5000 == 0:
        print(f"t={sim.elapsed_time():.0f}s spawned={spawned} in_sim={sim.agent_count()} arrived={len(arrivals)}", flush=True)
    if sim.iteration_count() > 100_000 or sim.elapsed_time() > 600:
        break
writer.close()

arrivals = np.array(arrivals)
print(f"spawned {spawned}, arrived {len(arrivals)}, t={sim.elapsed_time():.0f}s")
print(f"mean x = {arrivals.mean():.2f} m (centre {WIDTH/2}), std = {arrivals.std():.2f} m")
np.save("arrivals.npy", arrivals)

# ---- plot -------------------------------------------------------------------
fig, ax = plt.subplots(1, 2, figsize=(12, 7), gridspec_kw=dict(width_ratios=[1, 1.3]))
for geom in [walkable]:
    ax[0].fill(*geom.exterior.xy, color="#ddd")
    for hole in geom.interiors:
        ax[0].fill(*hole.xy, color="#555")
ax[0].fill(*spawn_area.exterior.xy, color="tab:green", alpha=.6)
for poly in exit_bins.values():
    ax[0].fill(*poly.exterior.xy, color="tab:red", alpha=.4)
ax[0].set_aspect("equal"); ax[0].set_title("geometry (green=slit, red=exit bins)")
bins = WIDTH / 2 + np.arange(-ROWS - 1, ROWS + 2, 2) * DX / 2  # one bin per exit column
ax[1].hist(arrivals, bins=bins, color="k", alpha=.8, density=True, label="arrivals")
xx = np.linspace(0, WIDTH, 400)
mu, sd = arrivals.mean(), arrivals.std()
ax[1].plot(xx, np.exp(-(xx - mu) ** 2 / (2 * sd ** 2)) / (sd * np.sqrt(2 * np.pi)),
           "r-", label=f"normal fit μ={mu:.1f} σ={sd:.1f}")
ax[1].set_xlabel("exit x [m]"); ax[1].set_ylabel("density"); ax[1].legend()
ax[1].set_title(f"arrival histogram at the bottom (n={len(arrivals)})")
plt.tight_layout(); plt.savefig("galton_hist.png", dpi=110)
