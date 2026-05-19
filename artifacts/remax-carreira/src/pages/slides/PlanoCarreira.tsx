export default function PlanoCarreira() {
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
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "4.5vw", fontWeight: 900, color: "#F5F5F5", letterSpacing: "-0.01em", textTransform: "uppercase", textWrap: "balance" }}>
          Seu Plano de Carreira no Mercado Imobiliário
        </div>
      </div>

      {/* Staircase steps — horizontal, ascending left to right */}
      {/* Step 1 — Licenciado (bottom, orange) */}
      <div className="absolute flex flex-col justify-center" style={{ left: "5vw", bottom: "10vh", width: "20vw", height: "14vh", background: "#F97316", padding: "2vh 2vw", borderRadius: "4px" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.4vw", fontWeight: 800, color: "#fff" }}>Licenciado</div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 600, color: "#fff", opacity: 0.85, marginTop: "0.5vh" }}>1° ANO</div>
      </div>

      {/* Step 2 — O Corretor Produtivo (blue) */}
      <div className="absolute flex flex-col justify-center" style={{ left: "26vw", bottom: "22vh", width: "20vw", height: "14vh", background: "#3B82F6", padding: "2vh 2vw", borderRadius: "4px" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 800, color: "#fff" }}>O Corretor Produtivo</div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 600, color: "#fff", opacity: 0.85, marginTop: "0.5vh" }}>2° ANO</div>
      </div>

      {/* Connecting lines */}
      <div className="absolute" style={{ left: "25vw", bottom: "16.5vh", width: "1vw", height: "2px", background: "#F97316", opacity: 0.4 }} />
      <div className="absolute" style={{ left: "46vw", bottom: "28.5vh", width: "1vw", height: "2px", background: "#3B82F6", opacity: 0.4 }} />
      <div className="absolute" style={{ left: "67vw", bottom: "41.5vh", width: "1vw", height: "2px", background: "#22C55E", opacity: 0.4 }} />

      {/* Step 3 — O Corretor Profissional (green) */}
      <div className="absolute flex flex-col justify-center" style={{ left: "47vw", bottom: "35vh", width: "20vw", height: "14vh", background: "#16A34A", padding: "2vh 2vw", borderRadius: "4px" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 800, color: "#fff" }}>O Corretor Profissional</div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 600, color: "#fff", opacity: 0.85, marginTop: "0.5vh" }}>3° ANO</div>
      </div>

      {/* Step 4 — Líder do Setor (pink) */}
      <div className="absolute flex flex-col justify-center" style={{ left: "68vw", bottom: "48vh", width: "22vw", height: "14vh", background: "#EC4899", padding: "2vh 2vw", borderRadius: "4px" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.4vw", fontWeight: 800, color: "#fff" }}>Líder do Setor</div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 600, color: "#fff", opacity: 0.85, marginTop: "0.5vh" }}>4° ANO</div>
      </div>

      {/* Arrow going up */}
      <div className="absolute" style={{ right: "3.5vw", bottom: "50vh" }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <polyline points="20,35 20,5" stroke="#EC4899" strokeWidth="2.5" fill="none" />
          <polyline points="10,15 20,5 30,15" stroke="#EC4899" strokeWidth="2.5" fill="none" />
        </svg>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: "1.5vh 6vw", borderTop: "1px solid #1a1a1a" }}>
        <span style={{ fontFamily: "Barlow", fontSize: "1.5vw", color: "#4B5563" }}>@acramrajab</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.5vw", color: "#4B5563" }}>RE/MAX Santa Catarina</span>
      </div>
    </div>
  );
}
