export default function LinhaTempo() {
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
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "5vw", fontWeight: 900, color: "#F5F5F5", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
          Linha do Tempo da Carreira
        </div>
      </div>

      {/* 3 columns */}
      <div className="absolute flex gap-[2vw]" style={{ top: "28vh", left: "5vw", right: "5vw", height: "58vh" }}>
        {/* 1° ANO */}
        <div className="flex-1 flex flex-col" style={{ background: "#1a1200", border: "2px solid #F97316", borderRadius: "6px", padding: "3vh 2.5vw", overflow: "hidden" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#F97316", marginBottom: "1.5vh" }}>1° ANO</div>

          <div style={{ borderTop: "1px solid #F9731640", paddingTop: "1.5vh", marginBottom: "1.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 700, color: "#F97316" }}>0–6 meses</span>
              <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", color: "#9CA3AF", background: "#F9731620", padding: "0 0.6vw", borderRadius: "4px" }}>Início</span>
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Aprendizado e treinamento</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Primeiros atendimentos</div>
          </div>

          <div style={{ borderTop: "1px solid #F9731640", paddingTop: "1.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 700, color: "#F97316" }}>6–12 meses</span>
              <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", color: "#9CA3AF", background: "#F9731620", padding: "0 0.6vw", borderRadius: "4px" }}>Evolução</span>
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Primeiras vendas</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Construção de rede</div>
          </div>

          <div style={{ marginTop: "auto", fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 700, color: "#F97316", textAlign: "center", letterSpacing: "0.05em" }}>
            Estágio
          </div>
        </div>

        {/* 2° ANO */}
        <div className="flex-1 flex flex-col" style={{ background: "#001220", border: "2px solid #3B82F6", borderRadius: "6px", padding: "3vh 2.5vw", overflow: "hidden" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#3B82F6", marginBottom: "1.5vh" }}>2° ANO</div>

          <div style={{ borderTop: "1px solid #3B82F640", paddingTop: "1.5vh", marginBottom: "1.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 700, color: "#3B82F6" }}>12–18 meses</span>
              <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", color: "#9CA3AF", background: "#3B82F620", padding: "0 0.6vw", borderRadius: "4px" }}>Avanço</span>
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Consolidação de processos</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Aumento de captações</div>
          </div>

          <div style={{ borderTop: "1px solid #3B82F640", paddingTop: "1.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 700, color: "#3B82F6" }}>18–24 meses</span>
              <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", color: "#9CA3AF", background: "#3B82F620", padding: "0 0.6vw", borderRadius: "4px" }}>Consistência</span>
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Estabilidade financeira</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Crescimento consistente</div>
          </div>

          <div style={{ marginTop: "auto", fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 700, color: "#3B82F6", textAlign: "center", letterSpacing: "0.05em" }}>
            Maturação
          </div>
        </div>

        {/* 3° ANO */}
        <div className="flex-1 flex flex-col" style={{ background: "#001a08", border: "2px solid #22C55E", borderRadius: "6px", padding: "3vh 2.5vw", overflow: "hidden" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "3vw", fontWeight: 900, color: "#22C55E", marginBottom: "1.5vh" }}>3° ANO</div>

          <div style={{ borderTop: "1px solid #22C55E40", paddingTop: "1.5vh", marginBottom: "1.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 700, color: "#22C55E" }}>24–30 meses</span>
              <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", color: "#9CA3AF", background: "#22C55E20", padding: "0 0.6vw", borderRadius: "4px" }}>Domínio</span>
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Domínio do mercado</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Expansão de negócios</div>
          </div>

          <div style={{ borderTop: "1px solid #22C55E40", paddingTop: "1.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "1.9vw", fontWeight: 700, color: "#22C55E" }}>30–36 meses</span>
              <span style={{ fontFamily: "Barlow", fontSize: "1.4vw", color: "#9CA3AF", background: "#22C55E20", padding: "0 0.6vw", borderRadius: "4px" }}>Liderança</span>
            </div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Alta produtividade</div>
            <div style={{ fontFamily: "Barlow", fontSize: "1.75vw", color: "#D1D5DB", lineHeight: 1.5 }}>Liderança e mentoria</div>
          </div>

          <div style={{ marginTop: "auto", fontFamily: "Barlow Condensed", fontSize: "2.2vw", fontWeight: 700, color: "#22C55E", textAlign: "center", letterSpacing: "0.05em" }}>
            Colheita
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
