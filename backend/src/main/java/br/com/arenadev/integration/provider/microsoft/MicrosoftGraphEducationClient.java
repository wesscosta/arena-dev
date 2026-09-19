package br.com.arenadev.integration.provider.microsoft;

import java.util.List;

public interface MicrosoftGraphEducationClient {
    List<MicrosoftEducationClass> listClasses(String accessToken);
}
