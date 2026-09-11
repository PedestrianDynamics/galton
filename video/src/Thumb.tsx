import { AbsoluteFill, Img, staticFile } from "remotion";

const FONT = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const Thumb = () => (
  <AbsoluteFill style={{ background: "#0b0d2a", fontFamily: FONT, color: "white", overflow: "hidden" }}>
    <Img src={staticFile("galton_box.jpg")}
      style={{ position: "absolute", left: 0, top: 0, width: 420, height: 720, objectFit: "cover", objectPosition: "50% 45%" }} />
    <Img src={staticFile("thumb_hist.png")}
      style={{ position: "absolute", right: 0, top: 0, width: 500, height: 720, objectFit: "cover", objectPosition: "50% 100%", opacity: 0.85 }} />
    <div style={{ position: "absolute", left: 420, top: 0, width: 360, height: 720,
      background: "linear-gradient(90deg, rgba(11,13,42,0), #0b0d2a 25%, #0b0d2a 75%, rgba(11,13,42,0))" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 40px" }}>
      <div style={{ fontSize: 34, letterSpacing: 6, color: "#8fb3ff", textTransform: "uppercase", textShadow: "0 2px 12px #000" }}>
        Galton board
      </div>
      <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.0, marginTop: 10, textShadow: "0 4px 24px #000" }}>
        walked by<br />pedestrians
      </div>
      <div style={{ fontSize: 40, marginTop: 28, background: "#ffd54a", color: "#0b0d2a", fontWeight: 800,
        padding: "8px 22px", borderRadius: 10 }}>
        800 agents → one bell curve
      </div>
    </div>
  </AbsoluteFill>
);
