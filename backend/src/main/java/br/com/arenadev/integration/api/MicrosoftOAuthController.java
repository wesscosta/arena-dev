package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftDelegatedOAuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/api/integrations/microsoft/oauth")
public class MicrosoftOAuthController {
    private final MicrosoftDelegatedOAuthService oauth;

    public MicrosoftOAuthController(MicrosoftDelegatedOAuthService oauth) {
        this.oauth = oauth;
    }

    @GetMapping("/start")
    public AuthorizationResponse start(HttpSession session) {
        return new AuthorizationResponse(oauth.authorizationUrl(session));
    }

    @GetMapping("/callback")
    public RedirectView callback(
            @RequestParam String code,
            @RequestParam String state,
            HttpSession session
    ) {
        var result = oauth.complete(code, state, session);
        return new RedirectView(result.redirectUrl());
    }

    public record AuthorizationResponse(String authorizationUrl) {}
}
