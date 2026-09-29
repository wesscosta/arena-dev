package br.com.arenadev.integration.provider.notion;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class NotionOAuthSettings {
 private final String clientId,clientSecret,redirectUri;
 public NotionOAuthSettings(@Value("${app.integrations.notion.client-id:}") String clientId,@Value("${app.integrations.notion.client-secret:}") String clientSecret,@Value("${app.integrations.notion.redirect-uri:http://localhost:8080/api/integrations/notion/oauth/callback}") String redirectUri){this.clientId=clean(clientId);this.clientSecret=clean(clientSecret);this.redirectUri=clean(redirectUri);}
 public boolean oauthConfigured(){return clientId!=null&&clientSecret!=null&&redirectUri!=null;}
 public void requireConfigured(){if(!oauthConfigured())throw new IllegalStateException("Configure APP_INTEGRATIONS_NOTION_CLIENT_ID e APP_INTEGRATIONS_NOTION_CLIENT_SECRET antes de conectar o Notion.");}
 public String clientId(){requireConfigured();return clientId;} public String clientSecret(){requireConfigured();return clientSecret;} public String redirectUri(){requireConfigured();return redirectUri;}
 private static String clean(String v){return v==null||v.isBlank()?null:v.trim();}
}
