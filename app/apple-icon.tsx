import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 132,
          fontWeight: 900,
          fontStyle: "italic",
          background: "black",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: 40,
          letterSpacing: "-0.05em",
        }}
      >
        n.
      </div>
    ),
    {
      ...size,
    }
  )
}
