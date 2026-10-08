import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type LowerThirdProps = {
  name: string;
  title: string;
  accentColor: string;
  /** Render without the backdrop, for compositing over footage (ProRes 4444). */
  transparent: boolean;
};

const FONT =
  "'Inter', 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  accentColor,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Timeline (30fps, 300 frames):
  //   0–15    hold empty
  //   15–60   build in: accent bar, name plate, title plate, text
  //   60–255  hold, with a subtle shimmer pass and pulsing dot
  //   255–285 build out (reverse order)
  //   285–300 empty tail
  const inStart = 15;
  const outStart = durationInFrames - 45;

  const sp = (delay: number, damping = 18) =>
    spring({ frame: frame - inStart - delay, fps, config: { damping, mass: 0.8 } });

  // Build-in
  const barIn = sp(0, 14);
  const namePlateIn = interpolate(frame, [inStart + 4, inStart + 22], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const titlePlateIn = interpolate(frame, [inStart + 12, inStart + 30], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const nameTextIn = sp(14);
  const titleTextIn = sp(22);

  // Build-out (1 = fully visible, 0 = gone)
  const out = (delay: number) =>
    1 -
    interpolate(frame, [outStart + delay, outStart + delay + 18], [0, 1], {
      ...clamp,
      easing: easeIn,
    });
  const titleOut = out(0);
  const nameOut = out(5);
  const barOut = out(12);

  // Shimmer sweeps across the name plate once during the hold
  const shimmerX = interpolate(frame, [90, 130], [-30, 130], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });

  // Live dot pulse
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2 * 0.8);

  const left = 140;
  const bottom = 150;

  return (
    <AbsoluteFill
      style={{
        background: transparent
          ? "transparent"
          : "radial-gradient(ellipse at 30% 20%, #2b3648 0%, #121722 55%, #07090d 100%)",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left,
          bottom,
          display: "flex",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: 12,
            background: accentColor,
            transform: `scaleY(${barIn * barOut})`,
            transformOrigin: "bottom",
            boxShadow: `0 0 24px ${accentColor}88`,
            marginRight: 14,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* Name plate */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: "rgba(255,255,255,0.96)",
              padding: "18px 36px 16px 28px",
              clipPath: `inset(0 ${100 - namePlateIn * nameOut * 100}% 0 0)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                transform: `translateY(${(1 - nameTextIn) * 60}px)`,
                opacity: nameTextIn,
              }}
            >
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  color: "#0d1117",
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: accentColor,
                  boxShadow: `0 0 ${6 + pulse * 14}px ${accentColor}`,
                  opacity: 0.6 + pulse * 0.4,
                }}
              />
            </div>
            {/* Shimmer */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${shimmerX}%`,
                width: "18%",
                background:
                  "linear-gradient(100deg, transparent, rgba(255,255,255,0.85), transparent)",
                mixBlendMode: "overlay",
                transform: "skewX(-20deg)",
              }}
            />
          </div>

          {/* Title plate */}
          <div
            style={{
              background: "#0d1117",
              padding: "12px 28px 12px 28px",
              clipPath: `inset(0 ${100 - titlePlateIn * titleOut * 100}% 0 0)`,
              borderBottom: `3px solid ${accentColor}`,
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#e8ecf2",
                whiteSpace: "nowrap",
                transform: `translateX(${(1 - titleTextIn) * -40}px)`,
                opacity: titleTextIn,
              }}
            >
              {title}
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
