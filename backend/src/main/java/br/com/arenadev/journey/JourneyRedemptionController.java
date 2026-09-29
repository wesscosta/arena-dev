package br.com.arenadev.journey;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/journeys/{journeyId}/redemption")
public class JourneyRedemptionController {
 private final JourneyRedemptionService service; public JourneyRedemptionController(JourneyRedemptionService service){this.service=service;}
 @GetMapping public JourneyRedemptionService.CodeView status(@PathVariable UUID journeyId){return service.status(journeyId);}
 @PostMapping("/enable") public JourneyRedemptionService.CodeView enable(@PathVariable UUID journeyId){return service.enable(journeyId);}
 @PostMapping("/regenerate") public JourneyRedemptionService.CodeView regenerate(@PathVariable UUID journeyId){return service.regenerate(journeyId);}
 @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT) public void disable(@PathVariable UUID journeyId){service.disable(journeyId);}
}
