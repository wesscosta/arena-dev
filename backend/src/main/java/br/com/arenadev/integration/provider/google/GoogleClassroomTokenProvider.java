package br.com.arenadev.integration.provider.google;
import java.util.UUID;
public interface GoogleClassroomTokenProvider { GoogleClassroomAccessToken acquire(UUID connectionId); }
