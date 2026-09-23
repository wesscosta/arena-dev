package br.com.arenadev.integration.provider.google;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;

@Service
public class GoogleDelegatedOAuthService {
    private static final String STATE_KEY="arena.google.oauth.state";
    private final GoogleClassroomSettings settings;
    private final IntegrationCredentialStore credentials;
    private final IntegrationConnectionService connections;
    private final String frontendUrl, encryptionKey;
    private final SecureRandom random=new SecureRandom();
    private final RestClient oauth=RestClient.builder().baseUrl("https://oauth2.googleapis.com").build();
    private final RestClient userinfo=RestClient.builder().baseUrl("https://openidconnect.googleapis.com").build();

    public GoogleDelegatedOAuthService(GoogleClassroomSettings settings, IntegrationCredentialStore credentials, IntegrationConnectionService connections,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
            @Value("${app.integrations.credential-encryption-key:}") String encryptionKey){
        this.settings=settings; this.credentials=credentials; this.connections=connections;
        this.frontendUrl=frontendUrl.replaceAll("/+$",""); this.encryptionKey=encryptionKey==null?"":encryptionKey.trim();
    }

    public String authorizationUrl(HttpSession session){
        settings.requireOAuthConfigured();
        if(encryptionKey.isBlank()) throw new IllegalStateException("Configure APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY antes de conectar o Google Classroom.");
        byte[] bytes=new byte[24]; random.nextBytes(bytes); String state=HexFormat.of().formatHex(bytes); session.setAttribute(STATE_KEY,state);
        return "https://accounts.google.com/o/oauth2/v2/auth?client_id="+enc(settings.requiredClientId())
                +"&response_type=code&redirect_uri="+enc(settings.requiredRedirectUri())
                +"&scope="+enc(settings.delegatedScopes())
                +"&access_type=offline&include_granted_scopes=true&prompt=consent&state="+enc(state);
    }

    public CallbackResult complete(String code,String state,HttpSession session){
        settings.requireOAuthConfigured();
        Object expected=session.getAttribute(STATE_KEY); session.removeAttribute(STATE_KEY);
        if(!(expected instanceof String s)||!s.equals(state)) throw new IllegalArgumentException("State OAuth Google inválido ou expirado.");
        var form=new LinkedMultiValueMap<String,String>();
        form.add("client_id",settings.requiredClientId()); form.add("client_secret",settings.requiredClientSecret());
        form.add("code",required(code,"code")); form.add("redirect_uri",settings.requiredRedirectUri()); form.add("grant_type","authorization_code");
        TokenResponse token;
        try { token=oauth.post().uri("/token").contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(TokenResponse.class); }
        catch(RuntimeException e){ throw new GoogleClassroomConnectionException("Falha ao concluir OAuth do Google Classroom.",e); }
        if(token==null||token.access_token()==null) throw new GoogleClassroomConnectionException("Google OAuth não retornou access token.");
        if(token.refresh_token()==null||token.refresh_token().isBlank()) throw new GoogleClassroomConnectionException("Google OAuth não retornou refresh token. Autorize novamente com acesso offline.");
        UserInfo u;
        try { u=userinfo.get().uri("/v1/userinfo").headers(h->h.setBearerAuth(token.access_token())).retrieve().body(UserInfo.class); }
        catch(RuntimeException e){ throw new GoogleClassroomConnectionException("Não foi possível identificar a conta Google conectada.",e); }
        if(u==null||u.sub()==null||u.sub().isBlank()) throw new GoogleClassroomConnectionException("Google não retornou identificador estável da conta.");
        String label=first(u.email(),u.name(),"Conta Google");
        var c=connections.create(LearningPlatformProvider.GOOGLE_CLASSROOM,"Google Classroom · "+label,u.sub());
        String ref=credentials.store(c.getId(),new IntegrationCredentialStore.CredentialMaterial(token.access_token(),token.refresh_token(),null,OffsetDateTime.now().plusSeconds(Math.max(60,token.expires_in()))));
        connections.attachCredentialReference(c.getId(),ref); connections.activate(c.getId());
        return new CallbackResult(c.getId(),u.sub(),label,frontendUrl+"/?google=connected");
    }

    private static String enc(String v){ return URLEncoder.encode(v,StandardCharsets.UTF_8); }
    private static String required(String v,String f){ if(v==null||v.isBlank()) throw new IllegalArgumentException(f+" é obrigatório."); return v.trim(); }
    private static String first(String...v){ for(String s:v) if(s!=null&&!s.isBlank()) return s.trim(); return "Conta Google"; }
    public record CallbackResult(java.util.UUID connectionId,String googleSubject,String user,String redirectUrl){}
    record TokenResponse(String access_token,String refresh_token,long expires_in,String token_type,String scope,String id_token){}
    record UserInfo(String sub,String email,String name){}
}
