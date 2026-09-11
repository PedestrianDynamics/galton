"""Render galton.sqlite as an mp4: cumulative occupancy heatmap + agents + pegs."""
import sqlite3, subprocess
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPolygon
import shapely

exec(open("galton.py").read().split("# ---- simulation")[0])  # geometry only

con = sqlite3.connect("galton.sqlite")
data = np.array(con.execute("select frame, id, pos_x, pos_y from trajectory_data order by frame").fetchall())
frames = data[:, 0].astype(int)
FPS_SIM, STEP, FPS_OUT = 10, 6, 30
CELL = 0.25
nx, ny = int(WIDTH / CELL), int(HEIGHT / CELL)
occ = np.zeros((ny, nx))

fig, ax = plt.subplots(figsize=(7.2, 10.2), dpi=100)
fig.subplots_adjust(0, 0, 1, 1)
ax.set_xlim(0, WIDTH); ax.set_ylim(0, HEIGHT); ax.axis("off")
img = ax.imshow(occ, origin="lower", extent=(0, WIDTH, 0, HEIGHT), cmap="jet", vmin=0, vmax=1, zorder=1)
for hole in walkable.interiors:
    ax.add_patch(MplPolygon(np.array(hole.coords), closed=True, fc="#d9d9d9", ec="#bbb", zorder=2))
for poly in [funnel]:
    for g in getattr(poly, "geoms", [poly]):
        ax.add_patch(MplPolygon(np.array(g.exterior.coords), closed=True, fc="#d9d9d9", ec="#bbb", zorder=2))
dots = ax.scatter([], [], s=9, c="k", zorder=3)
label = ax.text(0.02, 0.985, "", transform=ax.transAxes, va="top", fontsize=11, color="w",
                bbox=dict(fc="k", alpha=.4, lw=0))

w, h = fig.canvas.get_width_height()
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
                       "-s", f"{w}x{h}", "-r", str(FPS_OUT), "-i", "-",
                       "-pix_fmt", "yuv420p", "-vcodec", "libx264", "-crf", "20", "galton.mp4"],
                      stdin=subprocess.PIPE)
last = frames.max()
starts = np.searchsorted(frames, np.arange(last + 2))
vmax = 1.0
for f in range(0, last + 1, STEP):
    rows = data[starts[f]:starts[f + 1]]
    for g in range(f, min(f + STEP, last + 1)):        # accumulate skipped frames too
        r = data[starts[g]:starts[g + 1]]
        if len(r):
            ix = np.clip((r[:, 2] / CELL).astype(int), 0, nx - 1)
            iy = np.clip((r[:, 3] / CELL).astype(int), 0, ny - 1)
            np.add.at(occ, (iy, ix), 1)
    vmax = max(vmax, np.percentile(occ[occ > 0], 90) if (occ > 0).any() else 1)
    img.set_data(occ); img.set_clim(0, vmax)
    dots.set_offsets(rows[:, 2:4] if len(rows) else np.empty((0, 2)))
    label.set_text(f"t = {f / FPS_SIM:5.0f} s   agents: {len(rows)}")
    fig.canvas.draw()
    ff.stdin.write(fig.canvas.buffer_rgba().tobytes())
ff.stdin.close(); ff.wait()
print("wrote galton.mp4", (last // STEP + 1) / FPS_OUT, "s")
