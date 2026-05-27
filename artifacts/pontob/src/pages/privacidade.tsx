export default function Privacidade() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#1a1a1a", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Última atualização: maio de 2025</p>

      <p>O aplicativo <strong>Ponto B</strong> é uma plataforma de execução estratégica desenvolvida para franquias RE/MAX SC. Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações dos usuários.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>1. Informações Coletadas</h2>
      <p>Coletamos as seguintes informações para operar o serviço:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>Nome e endereço de e-mail (para autenticação)</li>
        <li>Dados de desempenho da franquia (metas, KPIs, iniciativas)</li>
        <li>Registros de check-in (diário, semanal e mensal)</li>
        <li>Token de notificação push (para alertas do aplicativo)</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>2. Uso das Informações</h2>
      <p>As informações coletadas são usadas exclusivamente para:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>Autenticar usuários e controlar o acesso ao sistema</li>
        <li>Exibir dashboards e relatórios de desempenho</li>
        <li>Enviar notificações sobre metas e check-ins</li>
        <li>Gerar relatórios de execução para a rede RE/MAX SC</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>3. Compartilhamento de Dados</h2>
      <p>Os dados dos usuários <strong>não são vendidos ou compartilhados</strong> com terceiros. Os dados de desempenho podem ser acessados pela administração regional RE/MAX SC para fins de acompanhamento estratégico.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>4. Segurança</h2>
      <p>Utilizamos criptografia (bcrypt para senhas, HTTPS para todas as comunicações) e sessões autenticadas para proteger os dados dos usuários.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>5. Retenção de Dados</h2>
      <p>Os dados são mantidos enquanto a conta estiver ativa. Usuários podem solicitar a exclusão de seus dados entrando em contato pelo e-mail abaixo.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>6. Contato</h2>
      <p>Para dúvidas sobre esta política, entre em contato:</p>
      <p><strong>RE/MAX SC</strong><br />
      E-mail: <a href="mailto:acramrajab@remax.com.br" style={{ color: "#dc2626" }}>acramrajab@remax.com.br</a></p>
    </div>
  );
}
