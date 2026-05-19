export default function FaturamentoCrescente() {
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
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "5.2vw", fontWeight: 900, color: "#F5F5F5", textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          Faturamento Crescente
        </div>
        <div style={{ fontFamily: "Barlow", fontSize: "2vw", color: "#9CA3AF", marginTop: "0.8vh" }}>
          Seu plano de carreira no setor imobiliário
        </div>
      </div>

      {/* 4 step staircase cards */}
      <div className="absolute flex items-end gap-[2vw]" style={{ left: "5vw", right: "5vw", bottom: "9vh", height: "52vh" }}>
        {/* 1° ANO */}
        <div className="flex-1 flex flex-col justify-end" style={{ height: "28%" }}>
          <div style={{ background: "#1e1000", padding: "2vh 1.5vw", borderRadius: "4px 4px 0 0", borderTop: "3px solid #F97316", borderLeft: "1px solid #F9731640", borderRight: "1px solid #F9731640" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.8vw", fontWeight: 900, color: "#F97316" }}>R$100 mil</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.7vw", color: "#D1D5DB", marginTop: "0.3vh" }}>Licenciado</div>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 700, color: "#F97316", marginTop: "0.8vh", background: "#F9731625", display: "inline-block", padding: "0.2vh 0.8vw", borderRadius: "4px" }}>1° ANO</div>
          </div>
        </div>

        {/* 2° ANO */}
        <div className="flex-1 flex flex-col justify-end" style={{ height: "50%" }}>
          <div style={{ background: "#001520", padding: "2vh 1.5vw", borderRadius: "4px 4px 0 0", borderTop: "3px solid #3B82F6", borderLeft: "1px solid #3B82F640", borderRight: "1px solid #3B82F640" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.8vw", fontWeight: 900, color: "#3B82F6" }}>R$100mil – R$300mil</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.7vw", color: "#D1D5DB", marginTop: "0.3vh" }}>O corretor produtivo</div>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 700, color: "#3B82F6", marginTop: "0.8vh", background: "#3B82F625", display: "inline-block", padding: "0.2vh 0.8vw", borderRadius: "4px" }}>2° ANO</div>
          </div>
        </div>

        {/* 3° ANO */}
        <div className="flex-1 flex flex-col justify-end" style={{ height: "72%" }}>
          <div style={{ background: "#001a08", padding: "2vh 1.5vw", borderRadius: "4px 4px 0 0", borderTop: "3px solid #22C55E", borderLeft: "1px solid #22C55E40", borderRight: "1px solid #22C55E40" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.8vw", fontWeight: 900, color: "#22C55E" }}>R$300mil – R$500mil</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.7vw", color: "#D1D5DB", marginTop: "0.3vh" }}>O corretor profissional</div>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 700, color: "#22C55E", marginTop: "0.8vh", background: "#22C55E25", display: "inline-block", padding: "0.2vh 0.8vw", borderRadius: "4px" }}>3° ANO</div>
          </div>
        </div>

        {/* 4° ANO */}
        <div className="flex-1 flex flex-col justify-end" style={{ height: "94%" }}>
          <div style={{ background: "#200010", padding: "2vh 1.5vw", borderRadius: "4px 4px 0 0", borderTop: "3px solid #DC1C2E", borderLeft: "1px solid #DC1C2E40", borderRight: "1px solid #DC1C2E40" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.8vw", fontWeight: 900, color: "#DC1C2E" }}>R$500mil – +de R$1mi</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.7vw", color: "#D1D5DB", marginTop: "0.3vh" }}>Líder do setor</div>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 700, color: "#DC1C2E", marginTop: "0.8vh", background: "#DC1C2E25", display: "inline-block", padding: "0.2vh 0.8vw", borderRadius: "4px" }}>4° ANO</div>
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
