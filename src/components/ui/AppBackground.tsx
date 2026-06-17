type AppBackgroundProps = {
  variant?: "admin" | "customer";
};

export default function AppBackground({
  variant = "admin",
}: AppBackgroundProps) {
  const isCustomer = variant === "customer";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050914]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#030712_0%,#071426_48%,#0c1224_100%)]" />
      <div className="absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(125,211,252,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.24)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(251,191,36,0.20)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.20)_1px,transparent_1px)] [background-size:160px_160px]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.28)_1px,transparent_1px)] [background-size:80px_80px]" />

      <div
        className={`absolute -left-28 top-20 h-80 w-80 rounded-full blur-3xl ${
          isCustomer ? "bg-cyan-400/24" : "bg-sky-400/24"
        }`}
      />
      <div
        className={`absolute right-[-7rem] top-1/4 h-96 w-96 rounded-full blur-3xl ${
          isCustomer ? "bg-emerald-400/18" : "bg-orange-400/24"
        }`}
      />
      <div
        className={`absolute bottom-[-10rem] left-1/3 h-[28rem] w-[28rem] rounded-full blur-3xl ${
          isCustomer ? "bg-orange-300/16" : "bg-cyan-300/16"
        }`}
      />

      <div className="absolute left-[-10%] top-[34%] h-px w-[120%] rotate-[-5deg] bg-gradient-to-r from-transparent via-cyan-200/34 to-transparent" />
      <div className="absolute left-[-10%] top-[68%] h-px w-[120%] rotate-[4deg] bg-gradient-to-r from-transparent via-orange-200/28 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-transparent to-slate-950/34" />
    </div>
  );
}
