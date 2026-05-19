export default function CaminhoCarreira() {
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
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "4.8vw", fontWeight: 900, color: "#F5F5F5", letterSpacing: "-0.01em", textTransform: "uppercase", textWrap: "balance" }}>
          Caminho de Carreira no Setor Imobiliário
        </div>
      </div>

      {/* 4 columns */}
      <div className="absolute flex gap-[2vw]" style={{ top: "32vh", left: "5vw", right: "5vw", height: "52vh" }}>
        {/* INICIANTE */}
        <div className="flex-1 flex flex-col" style={{ background: "#141414", borderTop: "4px solid #F97316", padding: "3vh 2vw" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.6vw", fontWeight: 800, color: "#F97316", letterSpacing: "0.05em", marginBottom: "2vh" }}>
            Iniciante
          </div>
          <div style={{ fontFamily: "Barlow", fontSize: "1.85vw", fontWeight: 400, color: "#D1D5DB", lineHeight: 1.55 }}>
            Aprendizado, certificação, treinamento inicial e primeiras transações assistidas.
          </div>
        </div>

        {/* INTERMEDIÁRIO */}
        <div className="flex-1 flex flex-col" style={{ background: "#141414", borderTop: "4px solid #3B82F6", padding: "3vh 2vw" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.6vw", fontWeight: 800, color: "#3B82F6", letterSpacing: "0.05em", marginBottom: "2vh" }}>
            Intermediário
          </div>
          <div style={{ fontFamily: "Barlow", fontSize: "1.85vw", fontWeight: 400, color: "#D1D5DB", lineHeight: 1.55 }}>
            Construção de carteira de clientes, networking, vendas independentes.
          </div>
        </div>

        {/* AVANÇADO */}
        <div className="flex-1 flex flex-col" style={{ background: "#141414", borderTop: "4px solid #22C55E", padding: "3vh 2vw" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.6vw", fontWeight: 800, color: "#22C55E", letterSpacing: "0.05em", marginBottom: "2vh" }}>
            Avançado
          </div>
          <div style={{ fontFamily: "Barlow", fontSize: "1.85vw", fontWeight: 400, color: "#D1D5DB", lineHeight: 1.55 }}>
            Especialização em nicho, alto volume de vendas, equipe própria.
          </div>
        </div>

        {/* LIDERANÇA */}
        <div className="flex-1 flex flex-col" style={{ background: "#141414", borderTop: "4px solid #A855F7", padding: "3vh 2vw" }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "2.6vw", fontWeight: 800, color: "#A855F7", letterSpacing: "0.05em", marginBottom: "2vh" }}>
            Liderança
          </div>
          <div style={{ fontFamily: "Barlow", fontSize: "1.85vw", fontWeight: 400, color: "#D1D5DB", lineHeight: 1.55 }}>
            Gestão de equipe, mentoria, desenvolvimento estratégico e expansão.
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
