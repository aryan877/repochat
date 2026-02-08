"use client";

export function ShaderBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Static radial gradients for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse at 30% 20%, #1a0a0a 0%, transparent 50%)",
            "radial-gradient(ellipse at 80% 70%, #0a1a0a 0%, transparent 50%)",
            "radial-gradient(ellipse at 20% 80%, #0a0a2a 0%, transparent 40%)",
            "radial-gradient(ellipse at 70% 20%, #1a1a0a 0%, transparent 40%)",
          ].join(", "),
        }}
      />
      {/* Animated aurora streaks */}
      <div
        className="absolute inset-0 opacity-40 animate-aurora"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(100deg, #1a0a0a 0%, #1a0a0a 7%, transparent 10%, transparent 12%, #0a0a2a 16%)",
            "repeating-linear-gradient(100deg, #0a1a0a 10%, #0a0a2a 15%, #1a1a0a 20%, #1a0a0a 25%, #0a1a0a 30%)",
          ].join(", "),
          backgroundSize: "300%, 200%",
          filter: "blur(30px)",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 30%, transparent 70%)",
        }}
      />
    </div>
  );
}
