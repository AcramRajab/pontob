export default function EvoluçãoREMAX() {
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
      <div className="absolute" style={{ top: "15vh", left: "6vw", right: "6vw", textAlign: "center" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "5vw", fontWeight: 900, color: "#F5F5F5", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
          Sua Evolução na RE/MAX
        </div>
      </div>

      {/* Staircase layout — 4 steps ascending left to right */}
      {/* Step 1 — bottom left */}
      <div className="absolute flex flex-col items-center" style={{ left: "4vw", bottom: "12vh", width: "20vw" }}>
        <div className="flex items-center justify-center" style={{ width: "6vw", height: "6vw", borderRadius: "50%", background: "#F97316", marginBottom: "1.5vh" }}>
          <span style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#fff" }}>1</span>
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#F97316", textAlign: "center", letterSpacing: "0.03em" }}>
          CORRETOR ESTAGIÁRIO
        </div>
        <div style={{ fontFamily: "Barlow", fontSize: "1.6vw", fontWeight: 400, color: "#9CA3AF", textAlign: "center", marginTop: "1vh", lineHeight: 1.4 }}>
          Acesso à Universidade Internacional da Rede
        </div>
      </div>

      {/* Step 2 */}
      <div className="absolute flex flex-col items-center" style={{ left: "26vw", bottom: "24vh", width: "20vw" }}>
        <div className="flex items-center justify-center" style={{ width: "6vw", height: "6vw", borderRadius: "50%", background: "#22D3EE", marginBottom: "1.5vh" }}>
          <span style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#0d0d0d" }}>2</span>
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22D3EE", textAlign: "center", letterSpacing: "0.03em" }}>
          CONQUISTA DO CRECI
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "3.5vw", fontWeight: 900, color: "#22D3EE", textAlign: "center", marginTop: "0.5vh" }}>
          45%
        </div>
      </div>

      {/* Step 3 */}
      <div className="absolute flex flex-col items-center" style={{ left: "48vw", bottom: "38vh", width: "20vw" }}>
        <div className="flex items-center justify-center" style={{ width: "6vw", height: "6vw", borderRadius: "50%", background: "#22C55E", marginBottom: "1.5vh" }}>
          <span style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#0d0d0d" }}>3</span>
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "center", letterSpacing: "0.03em" }}>
          CORRETORES PREMIUM
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "3.5vw", fontWeight: 900, color: "#22C55E", textAlign: "center", marginTop: "0.5vh" }}>
          60%
        </div>
      </div>

      {/* Step 4 */}
      <div className="absolute flex flex-col items-center" style={{ left: "70vw", bottom: "51vh", width: "22vw" }}>
        <div className="flex items-center justify-center" style={{ width: "6vw", height: "6vw", borderRadius: "50%", background: "#EC4899", marginBottom: "1.5vh" }}>
          <span style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#fff" }}>4</span>
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#EC4899", textAlign: "center", letterSpacing: "0.03em" }}>
          TEAM LEADER
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "3.5vw", fontWeight: 900, color: "#EC4899", textAlign: "center", marginTop: "0.5vh" }}>
          70%
        </div>
      </div>

      {/* Ascending line */}
      <svg className="absolute" style={{ left: "4vw", top: "30vh", width: "88vw", height: "50vh" }} viewBox="0 0 880 500" preserveAspectRatio="none">
        <polyline points="100,460 300,360 500,240 700,120" stroke="#DC1C2E" strokeWidth="2" fill="none" strokeDasharray="8 4" opacity="0.4" />
      </svg>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: "1.5vh 6vw", borderTop: "1px solid #1a1a1a" }}>
        <span style={{ fontFamily: "Barlow", fontSize: "1.5vw", color: "#4B5563" }}>@acramrajab</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.5vw", color: "#4B5563" }}>RE/MAX Santa Catarina</span>
      </div>
    </div>
  );
}
