package br.com.arenadev.integration.api;
import br.com.arenadev.integration.domain.*;import br.com.arenadev.integration.provider.notion.NotionOAuthSettings;
import br.com.arenadev.integration.provider.notion.NotionPageDiscoveryService;
import java.util.List;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/integrations/notion")
public class NotionIntegrationController {private final NotionOAuthSettings settings; private final NotionPageDiscoveryService pages; public NotionIntegrationController(NotionOAuthSettings settings, NotionPageDiscoveryService pages){this.settings=settings;this.pages=pages;}@GetMapping("/readiness") public Readiness readiness(){return new Readiness(LearningPlatformProvider.NOTION,settings.oauthConfigured());} @GetMapping("/pages") public List<NotionPageDiscoveryService.PageSummary> pages(@RequestParam(required=false,defaultValue="") String query){return pages.search(query);}public record Readiness(LearningPlatformProvider provider,boolean delegatedOAuthConfigured){} }
