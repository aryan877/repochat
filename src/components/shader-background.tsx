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
            "radial-gradient(ellipse at 50% 0%, #0a1628 0%, transparent 50%)",
            "radial-gradient(ellipse at 80% 80%, #1a0a2e 0%, transparent 50%)",
            "radial-gradient(ellipse at 20% 60%, #0a2a3a 0%, transparent 40%)",
          ].join(", "),
        }}
      />
      {/* Animated aurora streaks */}
      <div
        className="absolute inset-0 opacity-40 animate-aurora"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(100deg, #0a1628 0%, #0a1628 7%, transparent 10%, transparent 12%, #0a1628 16%)",
            "repeating-linear-gradient(100deg, #1a0a2e 10%, #0a2a3a 15%, #0d1f3c 20%, #1a0a2e 25%, #0a1628 30%)",
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
