import remaxScLogo from "@assets/WhatsApp_Image_2026-05-18_at_18.44.45_1779162530724.jpeg";

export default function Capa() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#00237D" }}>
      {/* Background subtle arcs matching the logo aesthetic */}
      <div className="absolute" style={{ right: "-8vw", top: "-8vh", width: "55vw", height: "55vw", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.08)" }} />
      <div className="absolute" style={{ right: "-14vw", top: "-14vh", width: "70vw", height: "70vw", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />
      <div className="absolute" style={{ left: "-5vw", bottom: "-10vh", width: "30vw", height: "30vw", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />

      {/* Main logo — hero element */}
      <div className="absolute flex items-center justify-center" style={{ top: "18vh", left: "5vw", right: "5vw", height: "42vh" }}>
        <img
          src={remaxScLogo}
          crossOrigin="anonymous"
          alt="RE/MAX Santa Catarina"
          style={{ maxWidth: "80vw", maxHeight: "42vh", objectFit: "contain" }}
        />
      </div>

      {/* Tagline below logo */}
      <div className="absolute flex flex-col items-center" style={{ bottom: "16vh", left: "5vw", right: "5vw", textAlign: "center" }}>
        <div style={{ width: "8vw", height: "3px", background: "#DC1C2E", marginBottom: "3vh" }} />
        <div style={{ fontFamily: "Barlow Condensed", fontSize: "3.8vw", fontWeight: 900, color: "#ffffff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Carreira de Sucesso
        </div>
        <div style={{ fontFamily: "Barlow", fontSize: "2vw", fontWeight: 400, color: "rgba(255,255,255,0.7)", marginTop: "1.2vh", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Do Licenciado ao Líder do Setor
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: "2vh 6vw", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <span style={{ fontFamily: "Barlow", fontSize: "1.6vw", color: "rgba(255,255,255,0.45)" }}>@acramrajab</span>
        <span style={{ fontFamily: "Barlow", fontSize: "1.6vw", color: "rgba(255,255,255,0.45)" }}>Método Ponto B</span>
      </div>
    </div>
  );
}
