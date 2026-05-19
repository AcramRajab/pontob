export default function FaturamentoAnual() {
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
      <div className="absolute" style={{ top: "13vh", left: "6vw", right: "6vw" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "4.5vw", fontWeight: 900, color: "#F5F5F5", textTransform: "uppercase" }}>
          Faturamento Anual — Corretores
        </div>
        <div style={{ fontFamily: "Barlow", fontSize: "1.8vw", color: "#9CA3AF", marginTop: "0.5vh" }}>
          Top performers RE/MAX Santa Catarina (acumulado na carreira)
        </div>
      </div>

      {/* Table */}
      <div className="absolute" style={{ top: "30vh", left: "5vw", right: "5vw" }}>
        {/* Header row */}
        <div className="flex" style={{ borderBottom: "2px solid #DC1C2E", paddingBottom: "1vh", marginBottom: "1vh" }}>
          <div style={{ flex: 3, fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 700, color: "#DC1C2E", letterSpacing: "0.05em" }}>CORRETOR(A)</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 700, color: "#9CA3AF", textAlign: "center" }}>2023</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 700, color: "#9CA3AF", textAlign: "center" }}>2024</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 700, color: "#9CA3AF", textAlign: "center" }}>2025</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 700, color: "#F5F5F5", textAlign: "right" }}>TOTAL CARREIRA</div>
        </div>

        {/* Row 1 */}
        <div className="flex items-center" style={{ padding: "1.1vh 0", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ flex: 3, fontFamily: "Barlow", fontSize: "1.8vw", fontWeight: 500, color: "#F5F5F5" }}>Fabrina Trentini Team</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$1,2M</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$1,2M</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#F97316", textAlign: "center" }}>R$967K</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "right" }}>R$5.077.185</div>
        </div>

        {/* Row 2 */}
        <div className="flex items-center" style={{ padding: "1.1vh 0", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ flex: 3, fontFamily: "Barlow", fontSize: "1.8vw", fontWeight: 500, color: "#F5F5F5" }}>Rocio Rodrigues Team</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$370K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$486K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#F97316", textAlign: "center" }}>R$1.126K</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "right" }}>R$2.565.413</div>
        </div>

        {/* Row 3 */}
        <div className="flex items-center" style={{ padding: "1.1vh 0", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ flex: 3, fontFamily: "Barlow", fontSize: "1.8vw", fontWeight: 500, color: "#F5F5F5" }}>Venicio G.</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$577K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$815K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#F97316", textAlign: "center" }}>R$320K</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "right" }}>R$2.135.422</div>
        </div>

        {/* Row 4 */}
        <div className="flex items-center" style={{ padding: "1.1vh 0", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ flex: 3, fontFamily: "Barlow", fontSize: "1.8vw", fontWeight: 500, color: "#F5F5F5" }}>Isabela Mosca Pereira</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$346K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$513K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#F97316", textAlign: "center" }}>R$721K</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "right" }}>R$1.815.266</div>
        </div>

        {/* Row 5 */}
        <div className="flex items-center" style={{ padding: "1.1vh 0", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ flex: 3, fontFamily: "Barlow", fontSize: "1.8vw", fontWeight: 500, color: "#F5F5F5" }}>Lilian Taina</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$289K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$477K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#F97316", textAlign: "center" }}>R$419K</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "right" }}>R$1.662.260</div>
        </div>

        {/* Row 6 */}
        <div className="flex items-center" style={{ padding: "1.1vh 0", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ flex: 3, fontFamily: "Barlow", fontSize: "1.8vw", fontWeight: 500, color: "#F5F5F5" }}>Renatto Roseno</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$655K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#D1D5DB", textAlign: "center" }}>R$499K</div>
          <div style={{ flex: 1, fontFamily: "Barlow Condensed", fontSize: "1.7vw", color: "#F97316", textAlign: "center" }}>R$367K</div>
          <div style={{ flex: 1.5, fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 800, color: "#22C55E", textAlign: "right" }}>R$1.539.670</div>
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
