import { ImageResponse } from "next/og"

export const size = {
  width: 64,
  height: 64,
}
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          fontStyle: "italic",
          background: "black",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: 14,
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
