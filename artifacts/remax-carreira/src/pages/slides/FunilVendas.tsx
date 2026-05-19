export default function FunilVendas() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Top red bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "4px", background: "#DC1C2E" }} />

      {/* Header */}
      <div className="absolute flex items-center justify-between" style={{ top: "4px", left: 0, right: 0, padding: "2vh 6vw", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 800, color: "#DC1C2E", letterSpacing: "0.08em" }}>RE/MAX</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", fontWeight: 400, color: "#6B7280", letterSpacing: "0.2em" }}>SANTA CATARINA</span>
      </div>

      {/* Title */}
      <div className="absolute" style={{ top: "13vh", left: "6vw", right: "6vw", textAlign: "center" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "5vw", fontWeight: 900, color: "#F5F5F5", textTransform: "uppercase" }}>
          Funil de Vendas
        </div>
      </div>

      {/* Funnel + labels layout */}
      <div className="absolute flex items-center" style={{ top: "26vh", left: "5vw", right: "5vw", height: "58vh" }}>
        {/* Funnel visual */}
        <div className="flex flex-col items-center" style={{ width: "46vw" }}>
          {/* Topo */}
          <div className="flex items-center justify-center" style={{
            width: "36vw", height: "16vh",
            background: "#1e3a8a",
            clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)",
            marginBottom: "2px"
          }}>
            <span style={{ fontFamily: "Barlow Condensed", fontSize: "2.8vw", fontWeight: 900, color: "#fff" }}>TOPO DE FUNIL</span>
          </div>
          {/* Meio */}
          <div className="flex items-center justify-center" style={{
            width: "27vw", height: "14vh",
            background: "#DC1C2E",
            clipPath: "polygon(0 0, 100% 0, 80% 100%, 20% 100%)",
            marginBottom: "2px"
          }}>
            <span style={{ fontFamily: "Barlow Condensed", fontSize: "2.8vw", fontWeight: 900, color: "#fff" }}>MEIO DE FUNIL</span>
          </div>
          {/* Fundo */}
          <div className="flex items-center justify-center" style={{
            width: "18vw", height: "14vh",
            background: "#1e3a5f",
            clipPath: "polygon(0 0, 100% 0, 70% 100%, 30% 100%)"
          }}>
            <span style={{ fontFamily: "Barlow Condensed", fontSize: "2.4vw", fontWeight: 900, color: "#fff" }}>FUNDO DE FUNIL</span>
          </div>
        </div>

        {/* Labels */}
        <div className="flex flex-col justify-around" style={{ flex: 1, height: "100%", paddingLeft: "3vw" }}>
          {/* Topo labels */}
          <div style={{ borderLeft: "3px solid #3B82F6", paddingLeft: "1.5vw" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 800, color: "#3B82F6", marginBottom: "1.2vh" }}>TOPO DE FUNIL</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Prospecção Inbound</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Prospecção Outbound</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Indicações</div>
          </div>

          {/* Meio labels */}
          <div style={{ borderLeft: "3px solid #DC1C2E", paddingLeft: "1.5vw" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 800, color: "#DC1C2E", marginBottom: "1.2vh" }}>MEIO DE FUNIL</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Follow Up</div>
          </div>

          {/* Fundo labels */}
          <div style={{ borderLeft: "3px solid #60A5FA", paddingLeft: "1.5vw" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 800, color: "#60A5FA", marginBottom: "1.2vh" }}>FUNDO DE FUNIL</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Visitas</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Olho no olho</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#D1D5DB", lineHeight: 1.6 }}>Café</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: "1.5vh 6vw", borderTop: "1px solid #1a1a1a" }}>
        <span style={{ fontFamily: "Barlow", fontSize: "1.5vw", color: "#4B5563" }}>@acramrajab</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.5vw", color: "#4B5563" }}>RE/MAX Santa Catarina</span>
      </div>
    </div>
  );
}
