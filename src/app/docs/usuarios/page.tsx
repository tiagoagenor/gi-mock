import { DocH1, Lead, H2, P, Ul, Li, Code, Callout } from "@/components/docs/doc-ui";

export default function UsuariosDoc() {
  return (
    <div>
      <DocH1>Usuários & perfis</DocH1>
      <Lead>
        O acesso ao painel e à documentação exige login. Administradores gerenciam as contas na tela
        de Usuários.
      </Lead>

      <H2 id="gerenciar">Gerenciando usuários</H2>
      <P>
        A tela <b>Usuários</b> (visível apenas para administradores) permite:
      </P>
      <Ul>
        <Li>Criar contas (usuário, senha e perfil).</Li>
        <Li>Trocar o perfil, ativar/desativar e redefinir a senha.</Li>
        <Li>Excluir contas.</Li>
      </Ul>

      <H2 id="perfis">Perfis</H2>
      <Ul>
        <Li>
          <b>Administrador</b> — acesso total, incluindo a gestão de usuários.
        </Li>
        <Li>
          <b>Editor</b> e <b>Leitor</b> — acessam o painel; a gestão de usuários fica restrita a
          administradores.
        </Li>
      </Ul>

      <Callout type="warning" title="Proteções">
        Você não pode excluir a si mesmo, nem remover/desativar o último administrador ativo — isso
        evita que o sistema fique sem acesso.
      </Callout>

      <H2 id="login">Login & sessão</H2>
      <P>
        A sessão é mantida por um cookie httpOnly (o token fica com hash no banco). Faça logout pelo
        menu do usuário no rodapé da barra lateral. As senhas são armazenadas com bcrypt.
      </P>
      <P>
        O primeiro usuário é criado pelo seed (padrão <Code>admin / admin123</Code>) e pode ser
        alterado no <Code>.env</Code>.
      </P>
    </div>
  );
}
