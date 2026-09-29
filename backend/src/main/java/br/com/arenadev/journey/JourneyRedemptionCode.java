package br.com.arenadev.journey;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="journey_redemption_codes")
public class JourneyRedemptionCode {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="journey_id",nullable=false,unique=true) private Journey journey;
 @Column(nullable=false,unique=true,length=24) private String code; @Column(nullable=false) private boolean active=true;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt=Instant.now();
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 protected JourneyRedemptionCode(){} public JourneyRedemptionCode(Journey journey,String code){this.journey=journey;this.code=code;}
 public void regenerate(String value){code=value;active=true;updatedAt=Instant.now();} public void disable(){active=false;updatedAt=Instant.now();}
 public Journey getJourney(){return journey;} public String getCode(){return code;} public boolean isActive(){return active;}
}
