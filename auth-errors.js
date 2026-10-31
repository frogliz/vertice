(function(root){
'use strict';
function message(error){const code=String(error?.code||''),text=String(error?.message||error||'');
  if(['PGRST205','PGRST202','42P01','42883'].includes(code))return 'Sua conta foi acessada, mas o banco do Avunara ainda não está pronto. O responsável precisa executar o script de configuração no projeto Supabase deste site e atualizar o cache da API.';
  if(code==='42501'||/permission denied|row.level security/i.test(text))return 'Sua conta foi acessada, mas o banco recusou o acesso aos registros. O responsável precisa conferir as permissões e políticas da tabela do Avunara.';
  if(['otp_expired','flow_state_expired','flow_state_not_found','bad_code_verifier'].includes(code)||/link.*(invalid|expired)|token.*(expired|invalid)/i.test(text))return 'Este link de confirmação ou recuperação expirou, já foi usado ou não é válido. Peça um novo link e abra somente o e-mail mais recente. Se você já confirmou a conta, tente entrar normalmente.';
  if(/exceed_storage_size_quota|restricted due|quota/i.test(text))return 'O serviço de contas está temporariamente bloqueado. O responsável pelo projeto precisa liberar a cota do Supabase.';
  if(code==='invalid_credentials')return 'E-mail ou senha incorretos. Confira e tente novamente.';
  if(code==='email_not_confirmed')return 'Seu e-mail ainda não foi confirmado. Use Reenviar confirmação e abra o e-mail mais recente.';
  if(code==='user_already_exists')return 'Não foi possível criar esta conta. Tente entrar ou recuperar a senha.';
  if(/email.*not.*authorized|email_address_not_authorized/i.test(code+' '+text))return 'O envio de e-mail ainda precisa ser configurado pelo responsável pelo site.';
  if(/rate_limit|too many|over_email_send/i.test(code+' '+text))return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.';
  if(code==='signup_disabled')return 'A criação de contas está desativada no momento.';
  if(/VERTICE_INVALID_REMOTE/.test(text))return 'Os dados online não puderam ser validados. Não substituímos sua cópia local.';
  if(/VERTICE_BUSY/.test(text))return 'Aguarde o salvamento atual terminar e tente novamente.';
  if(/fetch|network|connection/i.test(text))return 'Não foi possível conectar. Confira a internet e tente novamente.';
  if(error?.callback)return 'Não foi possível validar esse link. Solicite uma nova confirmação e abra somente o e-mail mais recente.';
  return 'Não foi possível concluir agora. Tente novamente; se continuar, fale com o responsável pelo site.';
}
function callback(href,history){const url=new URL(href),fragment=new URLSearchParams(url.hash.slice(1)),query=url.searchParams,source=fragment.has('error')||fragment.has('error_code')?fragment:query;if(!source.has('error')&&!source.has('error_code'))return null;const result={code:source.get('error_code')||source.get('error')||'',message:source.get('error_description')||'',callback:true};for(const key of ['error','error_code','error_description']){query.delete(key);fragment.delete(key)}url.hash=fragment.toString();try{history?.replaceState(null,'',url.href)}catch(e){}return result}
root.AuthErrors={message,callback};
})(typeof window!=='undefined'?window:globalThis);
