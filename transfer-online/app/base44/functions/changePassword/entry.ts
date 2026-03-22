import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Usuário não autenticado' 
      }, { status: 401 });
    }

    // Obter dados do corpo da requisição
    const { currentPassword, newPassword } = await req.json();

    // Validações básicas
    if (!currentPassword || !newPassword) {
      return Response.json({ 
        success: false, 
        error: 'Senha atual e nova senha são obrigatórias' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ 
        success: false, 
        error: 'A nova senha deve ter pelo menos 6 caracteres' 
      }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return Response.json({ 
        success: false, 
        error: 'A nova senha deve ser diferente da senha atual' 
      }, { status: 400 });
    }

    // Tentar fazer login com a senha atual para validá-la
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Configuração do Supabase não encontrada');
      }

      // Primeiro, validar a senha atual fazendo login
      const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: user.email,
          password: currentPassword
        })
      });

      if (!loginResponse.ok) {
        return Response.json({ 
          success: false, 
          error: 'Senha atual incorreta' 
        }, { status: 400 });
      }

      // Agora atualizar a senha
      const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          password: newPassword
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        return Response.json({ 
          success: false, 
          error: errorData.msg || 'Erro ao atualizar senha' 
        }, { status: 400 });
      }

      return Response.json({ 
        success: true, 
        message: 'Senha alterada com sucesso' 
      });

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return Response.json({ 
        success: false, 
        error: 'Erro ao processar alteração de senha. Verifique sua senha atual.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro geral:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});