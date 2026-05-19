export default function CincoFases() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Top red bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "4px", background: "#DC1C2E" }} />

      {/* Header */}
      <div className="absolute flex items-center justify-between" style={{ top: "4px", left: 0, right: 0, padding: "2vh 6vw", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.8vw", fontWeight: 800, color: "#DC1C2E", letterSpacing: "0.08em" }}>RE/MAX</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", fontWeight: 400, color: "#6B7280", letterSpacing: "0.2em" }}>SANTA CATARINA</span>
      </div>

      {/* Title block */}
      <div className="absolute" style={{ top: "13vh", left: "6vw", right: "6vw", textAlign: "center" }}>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "4.2vw", fontWeight: 900, color: "#F5F5F5", textTransform: "uppercase" }}>
          As 5 Fases da Carreira do Corretor RE/MAX
        </div>
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 700, color: "#DC1C2E", marginTop: "0.8vh", letterSpacing: "0.12em" }}>
          O SUCESSO É UMA ESCALADA
        </div>
      </div>

      {/* 5 phase bar columns — ascending left to right, fills the bottom portion */}
      <div className="absolute flex items-end gap-[1.5vw]" style={{ left: "4vw", right: "4vw", top: "30vh", bottom: "7vh" }}>

        {/* 1. VISIBILIDADE */}
        <div className="flex-1 flex flex-col" style={{ height: "100%", justifyContent: "flex-end" }}>
          <div style={{ height: "22%", background: "#1e1400", border: "2px solid #F97316", borderRadius: "6px 6px 0 0", padding: "1.5vh 1.2vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 900, color: "#F97316" }}>1. VISIBILIDADE</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", marginTop: "0.4vh" }}>Posicionamento</div>
          </div>
          <div style={{ height: "78%", background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 900, color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.1em" }}>FASE 1</div>
          </div>
        </div>

        {/* 2. RENTABILIDADE */}
        <div className="flex-1 flex flex-col" style={{ height: "100%", justifyContent: "flex-end" }}>
          <div style={{ height: "30%", background: "#140a1e", border: "2px solid #A855F7", borderRadius: "6px 6px 0 0", padding: "1.5vh 1.2vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 900, color: "#A855F7" }}>2. RENTABILIDADE</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", marginTop: "0.4vh" }}>Captar o que traz ROI</div>
          </div>
          <div style={{ height: "70%", background: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 900, color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.1em" }}>FASE 2</div>
          </div>
        </div>

        {/* 3. PREVISIBILIDADE */}
        <div className="flex-1 flex flex-col" style={{ height: "100%", justifyContent: "flex-end" }}>
          <div style={{ height: "40%", background: "#001220", border: "2px solid #3B82F6", borderRadius: "6px 6px 0 0", padding: "1.5vh 1.2vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 900, color: "#3B82F6" }}>3. PREVISIBILIDADE</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", marginTop: "0.4vh", lineHeight: 1.4 }}>
              2 captações/mês · 10% conversão
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", lineHeight: 1.4 }}>10–20 representações</div>
          </div>
          <div style={{ height: "60%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 900, color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.1em" }}>FASE 3</div>
          </div>
        </div>

        {/* 4. ESCALABILIDADE */}
        <div className="flex-1 flex flex-col" style={{ height: "100%", justifyContent: "flex-end" }}>
          <div style={{ height: "50%", background: "#001a08", border: "2px solid #22C55E", borderRadius: "6px 6px 0 0", padding: "1.5vh 1.2vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 900, color: "#22C55E" }}>4. ESCALABILIDADE</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", marginTop: "0.4vh", lineHeight: 1.4 }}>Comprar tempo</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", lineHeight: 1.4 }}>Contratar assistente</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", lineHeight: 1.4 }}>Montar um time</div>
          </div>
          <div style={{ height: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 900, color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.1em" }}>FASE 4</div>
          </div>
        </div>

        {/* 5. LIBERDADE */}
        <div className="flex-1 flex flex-col" style={{ height: "100%", justifyContent: "flex-end" }}>
          <div style={{ height: "62%", background: "#200010", border: "2px solid #DC1C2E", borderRadius: "6px 6px 0 0", padding: "1.5vh 1.2vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 900, color: "#DC1C2E" }}>5. LIBERDADE</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", marginTop: "0.4vh", lineHeight: 1.4 }}>Referência no mercado</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", lineHeight: 1.4 }}>Liberdade financeira</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", lineHeight: 1.4 }}>Liberdade de tempo</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.55vw", color: "#D1D5DB", lineHeight: 1.4 }}>Liberdade geográfica</div>
          </div>
          <div style={{ height: "38%", background: "#DC1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "2vw", fontWeight: 900, color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.1em" }}>FASE 5</div>
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
