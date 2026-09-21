package br.com.arenadev.integration.provider.google;
import java.util.List;
public interface GoogleClassroomApiClient { List<GoogleClassroomCourse> listCourses(String accessToken); }
