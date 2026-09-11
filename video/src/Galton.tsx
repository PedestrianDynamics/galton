import {
  AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import hist from "./hist.json";

export const FPS = 30;
export const W = 1080;
export const H = 1500;
const VIDEO_S = 51.7;
const PHOTO_F = 5 * FPS;
const TITLE_F = PHOTO_F + 3.5 * FPS;
const VIDEO_F = Math.round(VIDEO_S * FPS);
const OVERLAY_LEAD_F = 20 * FPS;   // histogram starts this long before the video ends
const HOLD_F = 5 * FPS;
export const TOTAL_FRAMES = TITLE_F + VIDEO_F + HOLD_F;

const FONT = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BLUE = "#3d3dd6";      // background of the heatmap
const INK = "#0b0d2a";

// arena x [m] -> canvas px (the recording shows the full 24 m width)
const xPx = (xm: number) => (xm / hist.width_m) * W;

const Photo = () => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, PHOTO_F], [1.0, 1.12], { extrapolateRight: "clamp" });
  const inA = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const textA = interpolate(f, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(f, [PHOTO_F - 15, PHOTO_F], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "black", opacity: inA * out, fontFamily: FONT, color: "white" }}>
      <Img src={staticFile("galton_box.jpg")} style={{ width: W, height: H, objectFit: "cover", transform: `scale(${zoom})` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "160px 64px 56px",
        background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.85) 45%)" }}>
        <div style={{ opacity: textA, fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>The Galton board</div>
        <div style={{ opacity: textA, fontSize: 34, marginTop: 18, lineHeight: 1.4, color: "#e6eaff" }}>
          Balls drop through rows of pins, bounce left or right at each one,
          and pile up into a bell curve.
        </div>
        <div style={{ opacity: textA, fontSize: 20, marginTop: 28, color: "#9aa3c7" }}>
          Photo: Matemateca (IME/USP), Rodrigo Argenton · CC BY-SA 4.0 · Wikimedia Commons
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Title = () => {
  const f = useCurrentFrame() - PHOTO_F;
  const inA = (d: number) => interpolate(f, [d, d + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rise = (d: number) => interpolate(f, [d, d + 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [TITLE_F - PHOTO_F - 15, TITLE_F - PHOTO_F], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inT = interpolate(f, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: INK, color: "white", fontFamily: FONT, justifyContent: "center", padding: 90, opacity: out * inT }}>
      <div style={{ opacity: inA(8), transform: `translateY(${rise(8)}px)`, fontSize: 104, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>
        A Galton board,<br />walked by pedestrians
      </div>
      <div style={{ opacity: inA(22), transform: `translateY(${rise(22)}px)`, fontSize: 34, lineHeight: 1.45, marginTop: 40, color: "#cfd6ff" }}>
        800 agents enter through a 1.2 m slit and pass 10 rows of pegs.
        At every row each agent flips a coin: left gap or right gap.
      </div>
      <div style={{ opacity: inA(34), fontSize: 26, marginTop: 40, color: "#8fb3ff" }}>
        Colour: rolling-window density heatmap · dots: agents
      </div>
      <div style={{ opacity: inA(40), fontSize: 30, marginTop: 18, color: "#ffffff", fontWeight: 600 }}>
        app.jupedsim.org
      </div>
    </AbsoluteFill>
  );
};

const Caption = ({ from, dur, children }: { from: number; dur: number; children: React.ReactNode }) => {
  const f = useCurrentFrame() - from;
  if (f < 0 || f > dur) return null;
  const a = interpolate(f, [0, 12, dur - 12, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 12], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 48, right: 48, bottom: 64, opacity: a, transform: `translateY(${y}px)`,
      background: "rgba(11,13,42,0.78)", color: "white", fontFamily: FONT, fontSize: 34, lineHeight: 1.35,
      padding: "22px 30px", borderRadius: 14, backdropFilter: "blur(6px)" }}>
      {children}
    </div>
  );
};

const Histogram = ({ t }: { t: number }) => {
  // t: frames since the overlay started
  const { fps } = useVideoConfig();
  const maxC = Math.max(...hist.counts);
  const base = H - 48;
  const maxH = 860;
  const binW = xPx(2);
  const barW = binW * 0.72;
  const scale = maxH / maxC;

  const mu = hist.mean, sd = hist.std;
  const pts: string[] = [];
  for (let i = 0; i <= 240; i++) {
    const xm = (i / 240) * hist.width_m;
    const dens = Math.exp(-((xm - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
    const y = base - dens * hist.n * 2 * scale;
    pts.push(`${i === 0 ? "M" : "L"}${xPx(xm).toFixed(1)},${y.toFixed(1)}`);
  }
  const curveA = interpolate(t, [70, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const curveDraw = interpolate(t, [70, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const textA = (d: number) => interpolate(t, [d, d + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff5c5c" />
            <stop offset="0.55" stopColor="#ffd54a" />
            <stop offset="1" stopColor="#4fe3c1" />
          </linearGradient>
        </defs>
        {hist.counts.map((c, i) => {
          const s = spring({ frame: t - 10 - i * 3, fps, config: { damping: 16, stiffness: 90, mass: 0.9 } });
          const h = c * scale * s;
          const cx = xPx(hist.centers[i]);
          return (
            <g key={i}>
              <rect x={cx - barW / 2} y={base - h} width={barW} height={h} rx={6} fill="url(#bar)" opacity={0.92} />
              <text x={cx} y={base - h - 14} textAnchor="middle" fontSize={26} fontWeight={700} fill="white" opacity={s}>{c}</text>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={base} y2={base} stroke="white" strokeWidth={3} opacity={0.8} />
        <path d={pts.join(" ")} fill="none" stroke="white" strokeWidth={6} strokeLinecap="round" opacity={curveA}
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - curveDraw} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "70px 64px 110px", color: "white",
        background: "linear-gradient(rgba(11,13,42,0.9), rgba(11,13,42,0.55) 70%, rgba(11,13,42,0))" }}>
        <div style={{ opacity: textA(150), fontSize: 34, lineHeight: 1.45, color: "#cfd6ff" }}>
          Where the {hist.n} agents left the board: one bar per exit lane, with the fitted normal curve.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Galton = () => {
  const frame = useCurrentFrame();
  const vf = frame - TITLE_F;                       // frame within the video segment
  const overlayStart = VIDEO_F - OVERLAY_LEAD_F;
  const t = vf - overlayStart;
  const dim = interpolate(t, [0, 60], [1, 0.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = interpolate(t, [0, 60], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = interpolate(vf, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const video = <OffthreadVideo src={staticFile("sim.mp4")} style={{ width: W, height: H, objectFit: "cover" }} muted />;

  return (
    <AbsoluteFill style={{ background: INK }}>
      <Sequence from={TITLE_F} layout="none">
        <AbsoluteFill style={{ opacity: fadeIn * dim, filter: `blur(${blur}px)`, background: BLUE }}>
          {vf >= VIDEO_F - 1 ? <Freeze frame={VIDEO_F - 2}>{video}</Freeze> : video}
        </AbsoluteFill>
        {t >= 0 ? <Histogram t={t} /> : null}
      </Sequence>
      {frame >= PHOTO_F && frame < TITLE_F ? <Title /> : null}
      {frame < PHOTO_F ? <Photo /> : null}
    </AbsoluteFill>
  );
};
