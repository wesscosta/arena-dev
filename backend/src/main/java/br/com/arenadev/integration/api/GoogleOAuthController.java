package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.google.GoogleDelegatedOAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/api/integrations/google/oauth")
public class GoogleOAuthController {
    private final GoogleDelegatedOAuthService oauth;
    public GoogleOAuthController(GoogleDelegatedOAuthService oauth){this.oauth=oauth;}
    @GetMapping("/start")
    public AuthorizationResponse start(HttpSession session){return new AuthorizationResponse(oauth.authorizationUrl(session));}
    @GetMapping("/callback")
    public RedirectView callback(@RequestParam String code,@RequestParam String state,HttpSession session){return new RedirectView(oauth.complete(code,state,session).redirectUrl());}
    public record AuthorizationResponse(String authorizationUrl){}
}
