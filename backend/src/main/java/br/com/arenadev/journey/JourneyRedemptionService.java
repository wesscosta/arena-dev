package br.com.arenadev.journey;

import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.study.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.util.UUID;

@Service
public class JourneyRedemptionService {
 private static final char[] ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
 private final SecureRandom random=new SecureRandom();
 private final JourneyRepository journeys; private final JourneyRedemptionCodeRepository codes;
 private final StudentJourneyAccessRepository accesses; private final StudentRepository students;
 public JourneyRedemptionService(JourneyRepository journeys,JourneyRedemptionCodeRepository codes,StudentJourneyAccessRepository accesses,StudentRepository students){
  this.journeys=journeys;this.codes=codes;this.accesses=accesses;this.students=students;
 }
 @Transactional public CodeView enable(UUID journeyId){
  Journey journey=requirePublished(journeyId); requireRedeemable(journey);
  JourneyRedemptionCode entity=codes.findByJourneyId(journeyId).orElseGet(()->new JourneyRedemptionCode(journey,nextCode()));
  if(!entity.isActive()) entity.regenerate(nextCode());
  return view(codes.save(entity));
 }
 @Transactional public CodeView regenerate(UUID journeyId){
  Journey journey=requirePublished(journeyId); requireRedeemable(journey);
  JourneyRedemptionCode entity=codes.findByJourneyId(journeyId).orElseGet(()->new JourneyRedemptionCode(journey,nextCode()));
  entity.regenerate(nextCode()); return view(codes.save(entity));
 }
 @Transactional public void disable(UUID journeyId){codes.findByJourneyId(journeyId).ifPresent(JourneyRedemptionCode::disable);}
 @Transactional(readOnly=true) public CodeView status(UUID journeyId){return codes.findByJourneyId(journeyId).map(this::view).orElse(new CodeView(null,false,0));}
 @Transactional public RedemptionView redeem(String rawCode,StudyPrincipal principal){
  String code=normalize(rawCode);
  JourneyRedemptionCode redemption=codes.findByCodeIgnoreCaseAndActiveTrue(code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Código de Jornada inválido ou desativado."));
  Journey journey=redemption.getJourney(); requirePublished(journey.getId()); requireRedeemable(journey);
  var student=students.findById(principal.userId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Perfil do aluno não encontrado."));
  boolean existed=accesses.findByStudentIdAndJourneyId(student.getId(),journey.getId()).isPresent();
  accesses.findByStudentIdAndJourneyId(student.getId(),journey.getId()).orElseGet(()->accesses.save(new StudentJourneyAccess(student,journey)));
  return new RedemptionView(journey.getId(),journey.getTitle(),journey.getDescription(),existed);
 }
 private Journey requirePublished(UUID id){Journey j=journeys.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Jornada não encontrada."));if(j.getStatus()!=JourneyStatus.PUBLISHED)throw new ResponseStatusException(HttpStatus.CONFLICT,"A Jornada precisa estar publicada.");return j;}
 private void requireRedeemable(Journey j){if(j.getStages().stream().anyMatch(s->s.getCompletionRule()!=JourneyCompletionRule.MANUAL))throw new ResponseStatusException(HttpStatus.CONFLICT,"Jornadas com conclusão dependente de atividades da turma ainda não podem ser distribuídas por código.");}
 private String nextCode(){String value;do{StringBuilder b=new StringBuilder("J-");for(int i=0;i<6;i++)b.append(ALPHABET[random.nextInt(ALPHABET.length)]);value=b.toString();}while(codes.existsByCodeIgnoreCase(value));return value;}
 private String normalize(String value){return value==null?"":value.trim().toUpperCase();}
 private CodeView view(JourneyRedemptionCode c){return new CodeView(c.getCode(),c.isActive(),(int)accesses.countByJourneyId(c.getJourney().getId()));}
 public record CodeView(String code,boolean active,int redeemedCount){} public record RedemptionView(UUID journeyId,String title,String description,boolean alreadyAdded){}
}
