export default function Capa() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Red diagonal accent */}
      <div className="absolute" style={{ top: 0, right: 0, width: "38vw", height: "100vh", background: "linear-gradient(135deg, transparent 40%, #DC1C2E22 100%)" }} />
      <div className="absolute" style={{ top: 0, right: 0, width: "6px", height: "100vh", background: "#DC1C2E" }} />

      {/* RE/MAX badge top right */}
      <div className="absolute" style={{ top: "5vh", right: "6vw" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 900, color: "#DC1C2E", letterSpacing: "0.05em" }}>RE/MAX</div>
        <div style={{ fontFamily: "Barlow", fontSize: "1.4vw", fontWeight: 400, color: "#9CA3AF", letterSpacing: "0.2em", textTransform: "uppercase" }}>Santa Catarina</div>
      </div>

      {/* Main content */}
      <div className="absolute flex flex-col justify-center" style={{ left: "8vw", top: "18vh", width: "56vw" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 600, color: "#DC1C2E", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "2vh" }}>
          Método Ponto B
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "8.5vw", fontWeight: 900, color: "#F5F5F5", lineHeight: 0.88, letterSpacing: "-0.02em", textWrap: "balance" }}>
          CARREIRA
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "8.5vw", fontWeight: 900, color: "#DC1C2E", lineHeight: 0.88, letterSpacing: "-0.02em", marginBottom: "3vh" }}>
          DE SUCESSO
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "4vw", fontWeight: 700, color: "#F5F5F5", letterSpacing: "0.05em", opacity: 0.75 }}>
          NO SETOR IMOBILIÁRIO
        </div>

        <div style={{ marginTop: "5vh", width: "12vw", height: "3px", background: "#DC1C2E" }} />

        <div style={{ marginTop: "2.5vh", fontFamily: "Barlow", fontSize: "2vw", fontWeight: 400, color: "#9CA3AF" }}>
          Do Licenciado ao Líder do Setor
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: "2vh 6vw", borderTop: "1px solid #1f1f1f" }}>
        <span style={{ fontFamily: "Barlow", fontSize: "1.6vw", color: "#6B7280" }}>@acramrajab</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.6vw", color: "#6B7280" }}>RE/MAX Santa Catarina</span>
      </div>
    </div>
  );
}
