package br.com.arenadev.study;

import br.com.arenadev.journey.JourneyRedemptionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/learn/journeys")
public class JourneyRedemptionStudyController {
    private final JourneyRedemptionService redemption;
    private final StudyPrincipalResolver principals;

    public JourneyRedemptionStudyController(
            JourneyRedemptionService redemption,
            StudyPrincipalResolver principals
    ) {
        this.redemption = redemption;
        this.principals = principals;
    }

    @GetMapping("/redeem/{code}")
    public JourneyRedemptionService.RedemptionPreviewView preview(@PathVariable String code) {
        return redemption.preview(code);
    }

    @PostMapping("/redeem/bootstrap")
    public JourneyRedemptionService.BootstrapRedemptionView bootstrap(
            @RequestBody BootstrapRedeemRequest request
    ) {
        return redemption.redeemWithIdentity(request.code(), request.identity());
    }

    @PostMapping("/redeem")
    public JourneyRedemptionService.RedemptionView redeem(
            @RequestHeader("X-Study-Token") String token,
            @RequestBody RedeemRequest request
    ) {
        return redemption.redeem(request.code(), principals.resolve(token));
    }

    public record RedeemRequest(String code) {}
    public record BootstrapRedeemRequest(String code, String identity) {}
}
