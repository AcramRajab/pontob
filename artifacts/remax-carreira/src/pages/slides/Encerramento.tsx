export default function Encerramento() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Left red stripe */}
      <div className="absolute left-0 top-0 bottom-0" style={{ width: "6px", background: "#DC1C2E" }} />

      {/* Background subtle gradient */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%, #DC1C2E08 0%, transparent 60%)" }} />

      {/* Main content - centered */}
      <div className="absolute flex flex-col items-center justify-center" style={{ inset: 0 }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 600, color: "#DC1C2E", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "3vh" }}>
          RE/MAX Santa Catarina
        </div>

        <div style={{ fontFamily: "Barlow Condensed", fontSize: "7vw", fontWeight: 900, color: "#F5F5F5", letterSpacing: "-0.03em", lineHeight: 0.9, textAlign: "center", textWrap: "balance" }}>
          O SUCESSO É
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "7vw", fontWeight: 900, color: "#DC1C2E", letterSpacing: "-0.03em", lineHeight: 0.9, textAlign: "center", marginBottom: "5vh" }}>
          UMA ESCALADA.
        </div>

        <div style={{ width: "10vw", height: "3px", background: "#DC1C2E", marginBottom: "4vh" }} />

        <div style={{ fontFamily: "Barlow", fontSize: "2.2vw", fontWeight: 400, color: "#9CA3AF", textAlign: "center" }}>
          Método Ponto B — Execução com Consistência
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: "2.5vh 6vw", borderTop: "1px solid #1f1f1f" }}>
        <span style={{ fontFamily: "Barlow", fontSize: "1.6vw", color: "#6B7280" }}>@acramrajab</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.6vw", color: "#6B7280" }}>RE/MAX Santa Catarina</span>
      </div>
    </div>
  );
}
