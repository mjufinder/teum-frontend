import { ImageResponse } from "next/og";

export const alt = "틈 — 팀원 시간표로 공강을 찾아 회의 시간을 정해요";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#141517",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* neon glow blobs */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,255,163,0.18) 0%, transparent 65%)",
            top: -180,
            left: -120,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,255,163,0.10) 0%, transparent 65%)",
            bottom: -140,
            right: -100,
          }}
        />

        {/* content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 130,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-6px",
              lineHeight: 1,
            }}
          >
            틈
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#00FFA3",
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            공강 시간 교집합 찾기
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.45)",
              fontWeight: 400,
              marginTop: 4,
            }}
          >
            팀원 시간표로 공강을 찾아 회의 시간을 정해요
          </div>
        </div>

        {/* domain */}
        <div
          style={{
            position: "absolute",
            bottom: 38,
            right: 52,
            fontSize: 18,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          mju-teum.kro.kr
        </div>
      </div>
    ),
    { ...size },
  );
}
