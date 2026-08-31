package br.com.arenadev.session;

import br.com.arenadev.classroom.Student;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class SessionJoinService {
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Duration CODE_TTL = Duration.ofHours(12);

    private final SessionJoinCodeRepository joinCodeRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionJoinService(
            SessionJoinCodeRepository joinCodeRepository,
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository
    ) {
        this.joinCodeRepository = joinCodeRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
    }

    @Transactional
    public JoinCodeView ensureCode(ClassSession session) {
        SessionJoinCode entity = joinCodeRepository.findBySessionId(session.getId()).orElse(null);
        Instant now = Instant.now();
        if (entity != null && entity.isUsableAt(now)) {
            return JoinCodeView.from(entity);
        }

        String code = generateUniqueCode();
        Instant expiresAt = now.plus(CODE_TTL);
        if (entity == null) {
            entity = new SessionJoinCode(session, code, expiresAt);
        } else {
            entity.rotate(code, expiresAt);
        }
        return JoinCodeView.from(joinCodeRepository.save(entity));
    }

    @Transactional
    public JoinCodeView ensureCode(UUID sessionId) {
        ClassSession session = getActiveSession(sessionId);
        return ensureCode(session);
    }

    @Transactional
    public JoinCodeView rotate(UUID sessionId) {
        ClassSession session = getActiveSession(sessionId);
        SessionJoinCode entity = joinCodeRepository.findBySessionId(sessionId).orElse(null);
        String code = generateUniqueCode();
        Instant expiresAt = Instant.now().plus(CODE_TTL);
        if (entity == null) entity = new SessionJoinCode(session, code, expiresAt);
        else entity.rotate(code, expiresAt);
        return JoinCodeView.from(joinCodeRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public PublicSessionView lookup(String rawCode) {
        SessionJoinCode joinCode = getUsableCode(rawCode);
        ClassSession session = joinCode.getSession();
        return new PublicSessionView(
                session.getId(),
                session.getClassroom().getName(),
                session.getTitle(),
                joinCode.getCode(),
                joinCode.getExpiresAt()
        );
    }

    @Transactional
    public JoinAccessView join(String rawCode, String identity) {
        SessionJoinCode joinCode = getUsableCode(rawCode);
        ClassSession session = joinCode.getSession();
        if (identity == null || identity.isBlank()) {
            throw new IllegalArgumentException("Informe sua matrícula ou nome completo.");
        }

        List<SessionParticipant> participants = participantRepository.findBySessionIdForUpdate(session.getId());
        List<SessionParticipant> matches = findMatches(participants, identity.trim());
        if (matches.isEmpty()) {
            throw new ResourceNotFoundException("Aluno não encontrado nesta sessão. Confira a matrícula ou o nome completo.");
        }
        if (matches.size() > 1) {
            throw new IllegalArgumentException("Identificação ambígua. Use sua matrícula para entrar.");
        }

        SessionParticipant participant = matches.getFirst();
        if (participant.isConnected() || participant.getAccessTokenHash() != null) {
            throw new IllegalArgumentException("Este aluno já possui um dispositivo conectado. Peça ao professor para liberar o dispositivo antes de entrar novamente.");
        }
        String token = generateToken();
        participant.issueAccessToken(hashToken(token));

        Student student = participant.getStudent();
        return new JoinAccessView(
                token,
                joinCode.getCode(),
                session.getId(),
                session.getClassroom().getName(),
                session.getTitle(),
                participant.getId(),
                student.getId(),
                student.getRegistration(),
                student.getName(),
                student.getNickname(),
                participant.isPresent(),
                joinCode.getExpiresAt()
        );
    }

    @Transactional
    public ParticipantConnectionView markConnected(UUID sessionId, String token) {
        SessionParticipant participant = validateParticipantToken(sessionId, token);
        participant.markConnected();
        return ParticipantConnectionView.from(participant);
    }

    @Transactional
    public ParticipantConnectionView markDisconnected(UUID sessionId, String token) {
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Token de participante ausente.");
        SessionParticipant participant = participantRepository.findByAccessTokenHash(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Token de participante inválido."));
        if (!participant.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("Token não pertence à sessão informada.");
        }
        participant.markDisconnected();
        return ParticipantConnectionView.from(participant);
    }

    @Transactional(readOnly = true)
    public SessionParticipant validateParticipantToken(UUID sessionId, String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token de participante ausente.");
        }
        SessionParticipant participant = participantRepository.findByAccessTokenHash(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Token de participante inválido."));
        if (!participant.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("Token não pertence à sessão informada.");
        }
        if (participant.getSession().getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão encerrada.");
        }
        return participant;
    }


    @Transactional
    public SessionParticipant releaseDevice(UUID sessionId, UUID participantId) {
        getActiveSession(sessionId);
        SessionParticipant participant = participantRepository.findByIdAndSessionId(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Participante não encontrado nesta sessão."));
        participant.releaseDevice();
        return participant;
    }

    @Transactional
    public void deactivate(UUID sessionId) {
        joinCodeRepository.findBySessionIdAndActiveTrue(sessionId).ifPresent(SessionJoinCode::deactivate);
    }

    private ClassSession getActiveSession(UUID sessionId) {
        ClassSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
        return session;
    }

    private SessionJoinCode getUsableCode(String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase(Locale.ROOT);
        SessionJoinCode joinCode = joinCodeRepository.findByCodeIgnoreCaseAndActiveTrue(code)
                .orElseThrow(() -> new ResourceNotFoundException("Código de sessão inválido ou expirado."));
        if (!joinCode.isUsableAt(Instant.now())) {
            throw new IllegalArgumentException("Código de sessão expirado.");
        }
        return joinCode;
    }

    private List<SessionParticipant> findMatches(List<SessionParticipant> participants, String identity) {
        List<SessionParticipant> registrationMatches = participants.stream()
                .filter(item -> item.getStudent().getRegistration() != null)
                .filter(item -> item.getStudent().getRegistration().trim().equalsIgnoreCase(identity))
                .toList();
        if (!registrationMatches.isEmpty()) return registrationMatches;

        String wanted = normalize(identity);
        List<SessionParticipant> matches = new ArrayList<>();
        for (SessionParticipant item : participants) {
            Student student = item.getStudent();
            if (normalize(student.getName()).equals(wanted)
                    || (student.getNickname() != null && normalize(student.getNickname()).equals(wanted))) {
                matches.add(item);
            }
        }
        return matches;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 30; attempt++) {
            StringBuilder code = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                code.append(CODE_ALPHABET.charAt(secureRandom.nextInt(CODE_ALPHABET.length())));
            }
            String candidate = code.toString();
            if (!joinCodeRepository.existsByCodeIgnoreCase(candidate)) return candidate;
        }
        throw new IllegalStateException("Não foi possível gerar um código de sessão único.");
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 indisponível.", error);
        }
    }

    private static String normalize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
        return normalized;
    }

    public record ParticipantConnectionView(
            UUID participantId,
            UUID studentId,
            String name,
            boolean connected
    ) {
        public static ParticipantConnectionView from(SessionParticipant participant) {
            return new ParticipantConnectionView(
                    participant.getId(),
                    participant.getStudent().getId(),
                    participant.getStudent().getName(),
                    participant.isConnected()
            );
        }
    }

    public record JoinCodeView(String code, Instant expiresAt) {
        static JoinCodeView from(SessionJoinCode entity) {
            return new JoinCodeView(entity.getCode(), entity.getExpiresAt());
        }
    }

    public record PublicSessionView(
            UUID sessionId,
            String classroomName,
            String sessionTitle,
            String code,
            Instant expiresAt
    ) {
    }

    public record JoinAccessView(
            String token,
            String code,
            UUID sessionId,
            String classroomName,
            String sessionTitle,
            UUID participantId,
            UUID studentId,
            String registration,
            String name,
            String nickname,
            boolean present,
            Instant expiresAt
    ) {
    }
}
